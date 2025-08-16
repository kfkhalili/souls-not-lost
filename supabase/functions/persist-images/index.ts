// supabase/functions/persist-images/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Define strict types directly within the function file for self-sufficiency.
type ImageObject = {
  url: string;
  title: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { images } = (await req.json()) as { images: ImageObject[] };
    if (!images || images.length === 0) {
      // Return a 200 OK with an empty array if no images are provided.
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const uploadPromises = images.map(
      async (image: ImageObject): Promise<ImageObject | null> => {
        try {
          const response = await fetch(image.url);
          if (!response.ok) {
            console.error(`Failed to fetch image: ${image.url}`);
            return null;
          }
          const imageBlob = await response.blob();
          const fileExt = imageBlob.type.split("/")[1] || "jpg";
          const fileName = `${crypto.randomUUID()}.${fileExt}`;

          const { data, error: uploadError } = await supabaseAdmin.storage
            .from("memorial_images")
            .upload(fileName, imageBlob, {
              contentType: imageBlob.type,
              upsert: true,
            });

          if (uploadError) {
            console.error(`Failed to upload image: ${image.url}`, uploadError);
            return null;
          }

          const {
            data: { publicUrl },
          } = supabaseAdmin.storage
            .from("memorial_images")
            .getPublicUrl(data.path);

          return {
            url: publicUrl,
            title: image.title,
          };
        } catch (e: unknown) {
          console.error(`Error processing image ${image.url}:`, e);
          return null;
        }
      }
    );

    const persistedImages = (await Promise.all(uploadPromises)).filter(
      (img): img is ImageObject => img !== null
    );

    return new Response(JSON.stringify(persistedImages), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
