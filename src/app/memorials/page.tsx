// src/app/memorials/page.tsx
import { supabase } from "@/lib/supabaseClient";
import { Memorial } from "@/types";
import MemorialImage from "./MemorialImage";

// Define a strict type for the objects stored in the JSONB columns.
type LinkObject = {
  url: string;
  title: string;
};

const getMemorials = async (): Promise<Memorial[]> => {
  const { data, error } = await supabase.from("memorials").select("*");

  if (error) {
    console.error("Error fetching memorials:", error);
    return [];
  }

  return data || [];
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
          // Safely cast the JSONB fields to our strict type.
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
