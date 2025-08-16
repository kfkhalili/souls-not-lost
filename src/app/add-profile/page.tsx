// src/app/add-profile/page.tsx
"use client";

import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { User } from "@supabase/supabase-js";
import { CheckCircle, XCircle, Star, Search, Loader2 } from "lucide-react";

type ImageObject = { url: string; title: string };
type SourceObject = { url: string; title: string };

type MemorialState = {
  id: string | null;
  name: string;
  date_of_birth: string | null;
  date_of_death: string;
  age: number | null;
  place_of_birth: string | null;
  place_of_death: string | null;
  nationality: string | null;
  story: string;
  sources: SourceObject[];
  images: ImageObject[];
  primary_image_url: string | null;
  selectedImages: ImageObject[];
  userUploadedImage: File | null;
};

// A new client-side component to handle image validation and rendering
const ValidatedImage = ({
  img,
  onSelect,
  onSetPrimary,
  isSelected,
  isPrimary,
}: {
  img: ImageObject;
  onSelect: (img: ImageObject) => void;
  onSetPrimary: (url: string) => void;
  isSelected: boolean;
  isPrimary: boolean;
}) => {
  const [isValid, setIsValid] = useState<boolean | null>(null);

  useEffect(() => {
    const validateImage = async () => {
      try {
        const response = await fetch(img.url, { method: "HEAD" });
        if (
          response.ok &&
          response.headers.get("Content-Type")?.startsWith("image/")
        ) {
          setIsValid(true);
        } else {
          setIsValid(false);
        }
      } catch (error) {
        setIsValid(false);
      }
    };
    validateImage();
  }, [img.url]);

  if (isValid === false) return null; // Don't render if invalid
  if (isValid === null)
    return (
      <div className="rounded-lg bg-gray-200 dark:bg-gray-700 w-full h-28 sm:h-32 animate-pulse"></div>
    ); // Show a loading skeleton

  return (
    <div className="relative group">
      <img
        src={img.url}
        alt={img.title}
        className={`rounded-lg object-cover w-full h-28 sm:h-32 transition-all duration-200 ${
          isSelected ? "ring-4 ring-blue-500" : "ring-2 ring-transparent"
        }`}
      />
      <div className="absolute inset-0 bg-black bg-opacity-40 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          type="button"
          onClick={() => onSelect(img)}
          className={`text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-1 ${
            isSelected
              ? "bg-red-500 hover:bg-red-600"
              : "bg-blue-500 hover:bg-blue-600"
          } text-white`}>
          {isSelected ? <XCircle size={14} /> : <CheckCircle size={14} />}
          {isSelected ? "Deselect" : "Select"}
        </button>
        {isSelected && !isPrimary && (
          <button
            type="button"
            onClick={() => onSetPrimary(img.url)}
            className="text-xs px-3 py-1 rounded-full bg-gray-600 hover:bg-gray-700 text-white font-semibold flex items-center gap-1">
            <Star size={14} /> Set Primary
          </button>
        )}
      </div>
      {isPrimary && (
        <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1 shadow-lg">
          <Star size={14} fill="white" />
        </div>
      )}
    </div>
  );
};

export default function AddProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [memorial, setMemorial] = useState<MemorialState>({
    id: null,
    name: "",
    date_of_birth: null,
    date_of_death: "",
    age: null,
    place_of_birth: null,
    place_of_death: null,
    nationality: null,
    story: "",
    sources: [],
    images: [],
    primary_image_url: null,
    selectedImages: [],
    userUploadedImage: null,
  });
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isPersisting, setIsPersisting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push("/login");
        return;
      }
      setUser(session.user);
      const { data: profile } = await supabase
        .from("profiles")
        .select("can_use_ai")
        .eq("id", session.user.id)
        .single();
      if (!profile?.can_use_ai) {
        router.push("/memorials");
        return;
      }
      setLoading(false);
    };
    checkUser();
  }, [router]);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setMemorial((prev) => ({
      ...prev,
      [name]: name === "age" ? (value === "" ? null : Number(value)) : value,
    }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setMemorial((prev) => ({
        ...prev,
        userUploadedImage: e.target.files![0],
      }));
    }
  };

  const handleSearch = async () => {
    if (!memorial.name) {
      setError("Please enter a name to search.");
      return;
    }
    setIsSearching(true);
    setError(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        "lookup-memorial",
        { body: { name: memorial.name } }
      );
      if (invokeError) throw invokeError;
      setMemorial((prev) => ({
        ...prev,
        ...data,
        date_of_birth: data.date_of_birth
          ? new Date(data.date_of_birth).toISOString().split("T")[0]
          : null,
        date_of_death: data.date_of_death
          ? new Date(data.date_of_death).toISOString().split("T")[0]
          : "",
        selectedImages: data.isExisting ? data.images || [] : [],
        primary_image_url: data.isExisting ? data.primary_image_url : null,
      }));
    } catch (e: unknown) {
      setError(`Failed to find information: ${(e as Error).message}`);
    } finally {
      setIsSearching(false);
    }
  };

  const handleImageSelection = (image: ImageObject) => {
    setMemorial((prev) => {
      const isSelected = prev.selectedImages.some(
        (img) => img.url === image.url
      );
      return isSelected
        ? {
            ...prev,
            selectedImages: prev.selectedImages.filter(
              (img) => img.url !== image.url
            ),
          }
        : { ...prev, selectedImages: [...prev.selectedImages, image] };
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    setIsPersisting(true);
    setError(null);

    try {
      let uploadedImageUrl: string | null = null;
      if (memorial.userUploadedImage) {
        const file = memorial.userUploadedImage;
        const filePath = `${user.id}/${Date.now()}_${file.name}`;
        const { data, error: uploadError } = await supabase.storage
          .from("memorial_images")
          .upload(filePath, file);
        if (uploadError) throw uploadError;
        const {
          data: { publicUrl },
        } = supabase.storage.from("memorial_images").getPublicUrl(data.path);
        uploadedImageUrl = publicUrl;
      }

      let persistedImages = [];
      const externalImages = memorial.selectedImages.filter(
        (img) => !img.url.includes("supabase.co")
      );
      if (externalImages.length > 0) {
        const { data, error: persistError } = await supabase.functions.invoke(
          "persist-images",
          { body: { images: externalImages } }
        );
        if (persistError) throw persistError;
        persistedImages = data;
      }

      const existingSupabaseImages = memorial.selectedImages.filter((img) =>
        img.url.includes("supabase.co")
      );
      const finalImages = [...existingSupabaseImages, ...persistedImages];
      if (uploadedImageUrl) {
        finalImages.push({ url: uploadedImageUrl, title: memorial.name });
      }

      const finalMemorialData = {
        name: memorial.name,
        date_of_birth: memorial.date_of_birth,
        date_of_death: memorial.date_of_death,
        age: memorial.age,
        place_of_birth: memorial.place_of_birth,
        place_of_death: memorial.place_of_death,
        nationality: memorial.nationality,
        story: memorial.story,
        sources: memorial.sources,
        images: finalImages,
        primary_image_url:
          memorial.primary_image_url || finalImages[0]?.url || null,
        user_id: user.id,
      };

      if (memorial.id) {
        const { error } = await supabase
          .from("memorials")
          .update(finalMemorialData)
          .eq("id", memorial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("memorials")
          .insert(finalMemorialData);
        if (error) throw error;
      }
      router.push("/memorials");
    } catch (e: unknown) {
      setError(`Failed to save memorial: ${(e as Error).message}`);
    } finally {
      setIsPersisting(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen text-white">
        Loading...
      </div>
    );

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen font-sans">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-4xl">
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100">
            {memorial.id ? "Edit Memorial" : "Add New Memorial"}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Search for a person to auto-fill the form or enter the details
            manually.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Core Information Section */}
          <section className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 border-b pb-4 border-gray-200 dark:border-gray-700">
              Core Information
            </h2>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Name
                </label>
                <div className="flex gap-2 mt-1">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={memorial.name}
                    onChange={handleInputChange}
                    className="flex-grow w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400">
                    {isSearching ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <Search size={20} />
                    )}
                    <span className="ml-2">
                      {isSearching ? "Searching..." : "Search"}
                    </span>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="date_of_birth"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Date of Birth
                  </label>
                  <input
                    id="date_of_birth"
                    name="date_of_birth"
                    type="date"
                    value={memorial.date_of_birth || ""}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label
                    htmlFor="date_of_death"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Date of Death
                  </label>
                  <input
                    id="date_of_death"
                    name="date_of_death"
                    type="date"
                    required
                    value={memorial.date_of_death}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="place_of_birth"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Place of Birth
                  </label>
                  <input
                    id="place_of_birth"
                    name="place_of_birth"
                    type="text"
                    value={memorial.place_of_birth || ""}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label
                    htmlFor="place_of_death"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Place of Death
                  </label>
                  <input
                    id="place_of_death"
                    name="place_of_death"
                    type="text"
                    value={memorial.place_of_death || ""}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="age"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Age
                  </label>
                  <input
                    id="age"
                    name="age"
                    type="number"
                    value={memorial.age ?? ""}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label
                    htmlFor="nationality"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nationality
                  </label>
                  <input
                    id="nationality"
                    name="nationality"
                    type="text"
                    value={memorial.nationality || ""}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="story"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Story
                </label>
                <textarea
                  id="story"
                  name="story"
                  rows={5}
                  value={memorial.story}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
          </section>

          {/* Images Section */}
          <section className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 border-b pb-4 border-gray-200 dark:border-gray-700">
              Images
            </h2>
            <div className="space-y-6">
              <div>
                <label
                  htmlFor="user-image-upload"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Upload your own image
                </label>
                <div className="mt-2 flex items-center gap-4">
                  <input
                    id="user-image-upload"
                    type="file"
                    onChange={handleFileChange}
                    accept="image/*"
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-200 dark:hover:file:bg-blue-800"
                  />
                </div>
              </div>

              {memorial.images.length > 0 && (
                <div>
                  <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">
                    Images Found by Search
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Select images to include and choose one as the primary
                    display image.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
                    {memorial.images.map((img) => (
                      <ValidatedImage
                        key={img.url}
                        img={img}
                        onSelect={handleImageSelection}
                        onSetPrimary={(url) =>
                          setMemorial((prev) => ({
                            ...prev,
                            primary_image_url: url,
                          }))
                        }
                        isSelected={memorial.selectedImages.some(
                          (i) => i.url === img.url
                        )}
                        isPrimary={memorial.primary_image_url === img.url}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Sources Section */}
          {memorial.sources.length > 0 && (
            <section className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 border-b pb-4 border-gray-200 dark:border-gray-700">
                Sources
              </h2>
              <ul className="list-disc list-inside text-sm space-y-2">
                {memorial.sources.map((source, index) => (
                  <li key={index}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline dark:text-blue-400 break-all">
                      {source.title || source.url}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={isPersisting}
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-400">
              {isPersisting ? <Loader2 className="animate-spin mr-2" /> : null}
              {isPersisting
                ? "Saving..."
                : memorial.id
                ? "Update Memorial"
                : "Submit Memorial"}
            </button>
          </div>
          {error && <p className="text-red-500 text-center pt-4">{error}</p>}
        </form>
      </div>
    </div>
  );
}
