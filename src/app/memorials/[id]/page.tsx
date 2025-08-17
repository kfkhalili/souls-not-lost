// src/app/memorials/[id]/page.tsx
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";
import { Memorial } from "@/types";
import MemorialImage from "../MemorialImage";
import { notFound } from "next/navigation";

type LinkObject = {
  url: string;
  title: string;
};

type MemorialPageProps = {
  params: {
    id: string;
  };
};

const getMemorialById = async (id: string): Promise<Memorial | null> => {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
      },
    }
  );

  const { data, error } = await supabase
    .from("memorials")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    console.error("Error fetching memorial:", error);
    return null;
  }

  // Securely generate signed URLs for all images
  const images = (data.images as LinkObject[] | null) || [];
  if (images.length > 0) {
    const imagePaths = images.map(
      (img) => img.url.split("/memorial_images/")[1]
    );
    const { data: signedUrlsData, error: signedUrlsError } =
      await supabase.storage
        .from("memorial_images")
        .createSignedUrls(imagePaths, 3600); // 1-hour validity

    if (signedUrlsError) {
      console.error("Error creating signed URLs:", signedUrlsError);
    } else {
      const urlMap = new Map(signedUrlsData.map((d) => [d.path, d.signedUrl]));
      const updatedImages = images.map((img) => ({
        ...img,
        url: urlMap.get(img.url.split("/memorial_images/")[1]) ?? img.url,
      }));
      data.images = updatedImages;
    }
  }

  return data as Memorial;
};

export default async function MemorialDetailPage({
  params,
}: MemorialPageProps) {
  const memorial = await getMemorialById(params.id);

  if (!memorial) {
    notFound();
  }

  const images = (memorial.images as LinkObject[] | null) || [];
  const sources = (memorial.sources as LinkObject[] | null) || [];

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <article className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden my-8">
        <div className="p-6 md:p-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100">
            {memorial.name}
          </h1>
          <div className="text-md text-gray-600 dark:text-gray-400 mt-4 space-y-2">
            <p>
              <strong>Age:</strong> {memorial.age ?? "N/A"}
            </p>
            <p>
              <strong>Date of Birth:</strong>{" "}
              {memorial.date_of_birth
                ? new Date(memorial.date_of_birth).toLocaleDateString()
                : "N/A"}
            </p>
            <p>
              <strong>Date of Death:</strong>{" "}
              {new Date(memorial.date_of_death).toLocaleDateString()}
            </p>
            <p>
              <strong>Place of Birth:</strong>{" "}
              {memorial.place_of_birth ?? "N/A"}
            </p>
            <p>
              <strong>Place of Death:</strong>{" "}
              {memorial.place_of_death ?? "N/A"}
            </p>
          </div>
        </div>

        <div className="p-6 md:p-8 prose dark:prose-invert max-w-none">
          <p>{memorial.story}</p>
        </div>

        {images.length > 0 && (
          <div className="p-6 md:p-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Gallery
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {images.map((image, index) => (
                <div key={index} className="rounded-lg overflow-hidden">
                  <MemorialImage src={image.url} alt={image.title} />
                </div>
              ))}
            </div>
          </div>
        )}

        {sources.length > 0 && (
          <div className="p-6 md:p-8 border-t border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              Sources
            </h2>
            <ul className="list-disc list-inside text-sm text-blue-600 dark:text-blue-400 mt-4 space-y-2">
              {sources.map((source, index) => (
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
        )}
      </article>
    </div>
  );
}
