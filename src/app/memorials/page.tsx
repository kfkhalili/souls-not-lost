// src/app/memorials/page.tsx
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";
import { Memorial } from "@/types";
import MemorialImage from "./MemorialImage";
import Link from "next/link";

const getMemorials = async (): Promise<Memorial[]> => {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
      },
    }
  );

  const { data, error } = await supabase.from("memorials").select("*");

  if (error) {
    console.error("Error fetching memorials:", error);
    return [];
  }

  const memorialsWithSignedUrls = await Promise.all(
    (data || []).map(async (memorial) => {
      if (!memorial.primary_image_url) {
        return { ...memorial, primary_image_url: null };
      }

      const imagePath = memorial.primary_image_url.includes("/memorial_images/")
        ? memorial.primary_image_url.split("/memorial_images/")[1]
        : null;

      if (imagePath) {
        const { data: signedUrlData, error: signedUrlError } =
          await supabase.storage
            .from("memorial_images")
            .createSignedUrl(imagePath, 3600); // 1 hour validity

        if (signedUrlError) {
          console.error("Error creating signed URL:", signedUrlError);
          return { ...memorial, primary_image_url: null };
        }

        return { ...memorial, primary_image_url: signedUrlData.signedUrl };
      }

      return { ...memorial, primary_image_url: null };
    })
  );

  // This is the new line that filters out memorials without a primary image.
  const filteredMemorials = memorialsWithSignedUrls.filter(
    (memorial) => memorial.primary_image_url
  );

  return filteredMemorials as Memorial[];
};

export default async function MemorialsPage() {
  const memorials = await getMemorials();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold text-center my-8 dark:text-gray-200">
        Memorial Wall
      </h1>
      <div className="masonry-grid">
        {memorials.map((memorial) => (
          <div key={memorial.id} className="masonry-item">
            <Link href={`/memorials/${memorial.id}`}>
              <MemorialImage
                src={
                  memorial.primary_image_url ?? // Fallback is still good practice
                  "https://placehold.co/600x400/eee/ccc?text=No+Image"
                }
                alt={memorial.name}
              />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
