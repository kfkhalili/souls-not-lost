// src/app/memorials/page.tsx
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";
import { Memorial } from "@/types";
import MemorialImage from "./MemorialImage";

// Define a strict type for the objects stored in the JSONB columns.
type LinkObject = {
  url: string;
  title: string;
};

const getMemorials = async (): Promise<Memorial[]> => {
  // This client is safe for server-side use.
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

  const memorialsWithImageUrls = await Promise.all(
    (data || []).map(async (memorial) => {
      const images = memorial.images as LinkObject[] | null;
      if (!images || images.length === 0) {
        return memorial;
      }

      // Extract the path from the URL. Assumes URL is in the format:
      // .../storage/v1/object/public/memorial_images/your-file-path.jpg
      const imagePaths = images.map(
        (img) => img.url.split("/memorial_images/")[1]
      );

      // Create signed URLs that are valid for 60 seconds.
      const { data: signedUrlsData, error: signedUrlsError } =
        await supabase.storage
          .from("memorial_images")
          .createSignedUrls(imagePaths, 60);

      if (signedUrlsError) {
        console.error("Error creating signed URLs:", signedUrlsError);
        return memorial;
      }

      const urlMap = new Map(signedUrlsData.map((d) => [d.path, d.signedUrl]));

      const updatedImages = images.map((img) => ({
        ...img,
        url: urlMap.get(img.url.split("/memorial_images/")[1]) ?? img.url,
      }));

      return { ...memorial, images: updatedImages };
    })
  );

  return memorialsWithImageUrls as Memorial[];
};

export default async function MemorialsPage() {
  const memorials = await getMemorials();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold text-center my-8 dark:text-gray-200">
        Memorial Wall
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {memorials.map((memorial) => {
          const images = memorial.images as LinkObject[] | null;
          const sources = memorial.sources as LinkObject[] | null;
          const imageUrl =
            images?.[0]?.url ??
            "https://placehold.co/600x400/eee/ccc?text=No+Image";

          return (
            <div
              key={memorial.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden flex flex-col">
              <MemorialImage src={imageUrl} alt={memorial.name} />

              <div className="p-6 flex flex-col flex-grow">
                <h2 className="text-2xl font-bold mb-2 dark:text-white">
                  {memorial.name}
                </h2>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <p>
                    <strong>Age:</strong> {memorial.age ?? "N/A"}
                  </p>
                  <p>
                    <strong>Born:</strong> {memorial.place_of_birth ?? "N/A"}
                  </p>
                  <p>
                    <strong>Died:</strong>{" "}
                    {new Date(memorial.date_of_death).toLocaleDateString()} in{" "}
                    {memorial.place_of_death ?? "N/A"}
                  </p>
                </div>
                <p className="text-gray-700 dark:text-gray-300 mt-4 flex-grow">
                  {memorial.story}
                </p>
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="font-semibold text-sm dark:text-white">
                    Sources:
                  </h4>
                  <ul className="list-disc list-inside text-xs text-blue-600 dark:text-blue-400 mt-1">
                    {sources?.map((source, index) => (
                      <li key={index}>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline">
                          {source.title || "Source"}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
