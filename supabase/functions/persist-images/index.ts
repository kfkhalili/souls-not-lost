// supabase/functions/persist-images/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers are now defined directly in the function file.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ImageToPersist {
  url: string;
  title: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { images } = (await req.json()) as { images: ImageToPersist[] };
    if (!images || images.length === 0) {
      throw new Error("No images to persist.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const uploadPromises = images.map(async (image) => {
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
      } = supabaseAdmin.storage.from("memorial_images").getPublicUrl(data.path);

      return {
        url: publicUrl,
        title: image.title,
      };
    });

    const persistedImages = (await Promise.all(uploadPromises)).filter(
      (img): img is ImageToPersist => img !== null
    );

    return new Response(JSON.stringify(persistedImages), {
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
