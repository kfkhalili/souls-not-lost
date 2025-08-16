// src/app/page.tsx
import Link from "next/link";

export default function HomePage() {
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
      <main className="flex flex-col items-center">
        <p className="max-w-2xl text-center text-gray-700 dark:text-gray-300 mb-8">
          This is a space to remember and honor the lives of those we have lost.
          Each profile is a testament to a life lived and a story that deserves
          to be told.
        </p>
        <div className="flex space-x-4">
          <Link
            href="/memorials"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            View Memorials
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
            Add a Profile
          </Link>
        </div>
      </main>
    </div>
  );
}
