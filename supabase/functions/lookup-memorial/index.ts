// supabase/functions/lookup-memorial/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { OpenAI } from "https://deno.land/x/openai/mod.ts";

const openai = new OpenAI(Deno.env.get("OPENAI_API_KEY"));
const tavilyApiKey = Deno.env.get("TAVILY_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type TavilyResult = { url: string; content: string; title?: string };
type TavilyImageURL = string;
type ImageObject = { url: string; title: string };

async function searchForContext(query: string): Promise<{
  context: string;
  images: TavilyImageURL[];
  sources: TavilyResult[];
}> {
  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: tavilyApiKey,
        query: `Detailed biography of ${query}, a Palestinian killed in the conflict. Include date and place of birth, date and place of death, nationality, and any available images.`,
        search_depth: "advanced",
        include_images: true,
        max_results: 5,
      }),
    });
    if (!response.ok)
      throw new Error(`Tavily search failed: ${response.statusText}`);
    const data = await response.json();
    const context = data.results
      .map((r: TavilyResult) => `Source: ${r.url}\nContent: ${r.content}`)
      .join("\n\n---\n\n");
    return { context, images: data.images || [], sources: data.results || [] };
  } catch (error) {
    console.error("Error during Tavily search:", error);
    throw new Error("Failed to retrieve search context.");
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const { name } = await req.json();
    if (!name) throw new Error("Name is required");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: existingMemorial, error: dbError } = await supabaseAdmin
      .from("memorials")
      .select("*")
      .ilike("name", `%${name}%`)
      .limit(1)
      .single();

    if (dbError && dbError.code !== "PGRST116") {
      throw dbError;
    }

    if (existingMemorial) {
      // If the memorial exists, generate signed URLs for its images
      const images = (existingMemorial.images as ImageObject[]) || [];
      const imagePaths = images.map(
        (img) => img.url.split("/memorial_images/")[1]
      );
      if (imagePaths.length > 0) {
        const { data: signedUrlsData, error: signedUrlsError } =
          await supabaseAdmin.storage
            .from("memorial_images")
            .createSignedUrls(imagePaths, 60); // 60-second validity

        if (signedUrlsError) throw signedUrlsError;

        const urlMap = new Map(
          signedUrlsData.map((d) => [d.path, d.signedUrl])
        );
        existingMemorial.images = images.map((img) => ({
          ...img,
          url: urlMap.get(img.url.split("/memorial_images/")[1]) ?? img.url,
        }));
      }

      return new Response(
        JSON.stringify({ ...existingMemorial, isExisting: true }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ... (rest of the AI lookup logic remains the same)
    const { context, images, sources } = await searchForContext(name);
    if (!context) throw new Error("No reliable information could be found.");

    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a data extraction assistant. Using ONLY the provided context, extract the required information. Do not use any outside knowledge. If the context does not contain a piece of information, return null for that field.",
        },
        {
          role: "user",
          content: `CONTEXT:\n---\n${context}\n---\nBased on the context above, please provide the full name, date of birth, date of death, age, place of birth, place of death, nationality, a brief story, and a list of all sources for ${name}.`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "get_memorial_information",
            description:
              "Extract detailed memorial information from the provided context.",
            parameters: {
              type: "object",
              properties: {
                name: { type: "string" },
                date_of_birth: { type: "string", description: "YYYY-MM-DD" },
                date_of_death: { type: "string", description: "YYYY-MM-DD" },
                age: { type: "number" },
                place_of_birth: { type: "string" },
                place_of_death: { type: "string" },
                nationality: { type: "string" },
                story: { type: "string" },
                sources: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      url: { type: "string" },
                      title: { type: "string" },
                    },
                    required: ["url", "title"],
                  },
                },
              },
              required: ["name", "date_of_death", "story", "sources"],
            },
          },
        },
      ],
      tool_choice: {
        type: "function",
        function: { name: "get_memorial_information" },
      },
    });

    const toolCall = chatCompletion.choices[0].message.tool_calls?.[0];
    if (!toolCall) throw new Error("The AI could not extract information.");

    const data = JSON.parse(toolCall.function.arguments);
    data.images = images.map((imageUrl: string) => ({
      url: imageUrl,
      title: `${name}`,
    }));

    const aiSourceUrls = new Set(
      data.sources.map((s: { url: string }) => s.url)
    );
    sources.forEach((source) => {
      if (!aiSourceUrls.has(source.url)) {
        data.sources.push({ url: source.url, title: source.title || "Source" });
      }
    });

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
