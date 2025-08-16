// supabase/functions/cleanup-images/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- START: Inlined Type Definitions for Self-Sufficiency ---
type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Memorial = {
  age: number | null;
  created_at: string;
  date_of_birth: string | null;
  date_of_death: string;
  id: string;
  image_url: string | null;
  images: Json | null;
  name: string;
  nationality: string | null;
  place_of_birth: string | null;
  place_of_death: string | null;
  primary_image_url: string | null;
  sources: Json | null;
  story: string | null;
  user_id: string | null;
};

// Type guard to safely check if an object is a valid image object from the JSONB column.
function isImageObject(obj: unknown): obj is { url: string; title: string } {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "url" in obj &&
    typeof (obj as { url: string }).url === "string"
  );
}
// --- END: Inlined Type Definitions ---

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async () => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: memorials, error: memorialsError } = await supabaseAdmin
      .from("memorials")
      .select("images, primary_image_url");

    if (memorialsError) throw memorialsError;

    const imageUrlsInUse = new Set<string>();
    memorials.forEach((memorial: Partial<Memorial>) => {
      if (memorial.primary_image_url) {
        imageUrlsInUse.add(memorial.primary_image_url);
      }
      if (Array.isArray(memorial.images)) {
        memorial.images.forEach((image: unknown) => {
          if (isImageObject(image)) {
            imageUrlsInUse.add(image.url);
          }
        });
      }
    });

    const { data: files, error: filesError } = await supabaseAdmin.storage
      .from("memorial_images")
      .list();

    if (filesError) throw filesError;

    const orphanedFiles = files.filter((file) => {
      const {
        data: { publicUrl },
      } = supabaseAdmin.storage.from("memorial_images").getPublicUrl(file.name);
      return !imageUrlsInUse.has(publicUrl);
    });

    if (orphanedFiles.length === 0) {
      return new Response(
        JSON.stringify({ message: "No orphaned images to delete." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const pathsToDelete = orphanedFiles.map((file) => file.name);
    const { error: deleteError } = await supabaseAdmin.storage
      .from("memorial_images")
      .remove(pathsToDelete);

    if (deleteError) throw deleteError;

    return new Response(
      JSON.stringify({
        message: `Successfully deleted ${orphanedFiles.length} orphaned images.`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
