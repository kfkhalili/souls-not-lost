// src/app/page.tsx
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";
import { Memorial } from "@/types";
import MemorialImage from "./memorials/MemorialImage";

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
      // If there's no primary image URL, this memorial will be filtered out later.
      if (!memorial.primary_image_url) {
        return { ...memorial, primary_image_url: null };
      }

      // This logic now assumes the URL is a valid Supabase Storage URL.
      const imagePath =
        memorial.primary_image_url.split("/memorial_images/")[1];

      if (imagePath) {
        const { data: signedUrlData, error: signedUrlError } =
          await supabase.storage
            .from("memorial_images")
            .createSignedUrl(imagePath, 3600); // 1-hour validity

        if (signedUrlError) {
          console.error("Error creating signed URL:", signedUrlError);
          return { ...memorial, primary_image_url: null };
        }
        return { ...memorial, primary_image_url: signedUrlData.signedUrl };
      }

      // If parsing the path fails for any reason, treat it as having no image.
      return { ...memorial, primary_image_url: null };
    })
  );

  // Filter out any memorials that ended up without a valid, signed URL.
  const filteredMemorials = memorialsWithSignedUrls.filter(
    (memorial) => memorial.primary_image_url
  );

  return filteredMemorials as Memorial[];
};

export default async function HomePage() {
  const memorials = await getMemorials();

  return (
    <div className="container mx-auto p-4">
      <header className="text-center my-8">
        <h1 className="text-5xl font-bold text-gray-800 dark:text-gray-200">
          Souls Not Lost
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mt-2">
          A memorial for the Palestinians killed in genocide and ethnic
          cleansing.
        </p>
      </header>
      <main>
        <div className="masonry-grid">
          {memorials.map((memorial) => (
            <div key={memorial.id} className="masonry-item group relative">
              <Link href={`/memorials/${memorial.id}`}>
                <MemorialImage
                  src={
                    memorial.primary_image_url ??
                    "https://placehold.co/600x400/eee/ccc?text=No+Image"
                  }
                  alt={memorial.name}
                />
                <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-4">
                  <h3 className="text-white text-lg font-bold text-center">
                    {memorial.name}
                  </h3>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
