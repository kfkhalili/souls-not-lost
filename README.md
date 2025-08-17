# **Souls Not Lost Memorial Project**

## **1\. Mission Statement**

**Souls Not Lost** is a digital memorial dedicated to preserving the stories of Palestinians killed in conflict. It leverages AI to gather and structure information from public sources, allowing authorized contributors to build detailed, respectful, and lasting memorials. The platform presents these stories through a secure, visually-driven interface, ensuring that these lives are remembered and honored.

## **2\. Core Features**

- **AI-Powered Data Ingestion:** Authorized users can enter a name, and the system uses a combination of web search (Tavily) and language model analysis (OpenAI) to automatically find and structure biographical data, stories, and images.
- **Secure Image Handling:** All external images are automatically persisted to a private Supabase Storage bucket. Images are then displayed securely throughout the application using temporary, signed URLs, preventing unauthorized access or data scraping.
- **Dynamic Memorial Pages:** Each memorial has a unique, dynamically generated page (/memorials/\[id\]) that displays the full story, a gallery of images, and cited sources.
- **Visual Landing Page:** The homepage features a responsive masonry grid of primary images, providing a visually engaging entry point to the memorials.
- **Automated Maintenance:** A scheduled cron job runs daily to clean up any orphaned images from the storage bucket, ensuring long-term data integrity and efficiency.

## **3\. Tech Stack**

This project is a modern full-stack application built on the following technologies:

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Backend & Database:** [Supabase](https://supabase.io/)
  - **Database:** PostgreSQL
  - **Authentication:** Supabase Auth
  - **Storage:** Supabase Storage (for private image hosting)
  - **Edge Functions:** Deno-based serverless functions for backend logic.
- **AI & Data Sourcing:**
  - [OpenAI API](https://openai.com/): For structuring unstructured text into JSON data.
  - [Tavily API](https://tavily.com/): For comprehensive web searches to find source material.
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)

## **4\. Key Architectural Concepts**

This project's architecture is designed for security, data integrity, and maintainability.

### **4.1. Data Ingestion and Structuring Flow**

The process of adding a new memorial is handled by the lookup-memorial edge function:

1. **Search (Tavily):** The function first performs a web search to gather raw text articles and image URLs related to the provided name.
2. **Analyze (OpenAI):** The raw text is passed to the OpenAI API with a specific prompt instructing it to extract and structure the key information (dates, places, story) into a clean JSON object.
3. **Return:** The function returns this structured JSON to the frontend. **Crucially, at this stage, the image URLs are still external links.**

### **4.2. Secure Image Persistence and Retrieval**

To avoid CORS issues and prevent storing insecure external links, the application follows a strict persistence and retrieval workflow:

1. **Persist on Search:** When the add-profile page receives the lookup data, it immediately calls the persist-images function. This function downloads the external images and uploads them to the private memorial_images Supabase Storage bucket, returning a list of new, permanent Supabase Storage URLs.
2. **Store Internal URLs:** Only these permanent, internal Supabase URLs are ever stored in the database when the user submits the memorial form. **External links are never saved.**
3. **Retrieve with Signed URLs:** When a public-facing page (like the homepage or a detail page) needs to display an image, the server-side component fetches the permanent URL from the database and generates a temporary, secure **signed URL**. This short-lived URL is what's sent to the browser, allowing it to display the image without exposing the private bucket.

### **4.3. Database and Infrastructure as Code**

- **Migrations:** All database schema changes (creating tables, adding columns, setting up policies) are managed via SQL files in the supabase/migrations directory. This ensures the database schema is version-controlled and reproducible.
- **Cron Job Scheduling:** The daily cleanup task for orphaned images is scheduled via a database migration (schedule_image_cleanup_job.sql), which uses the pg_cron extension. This keeps all infrastructure configuration within the codebase.

## **5\. Local Development Setup**

To run this project locally, follow these steps:

### **5.1. Prerequisites**

- Node.js (v18 or later)
- Supabase Account
- Supabase CLI: npm install supabase \--save-dev
- API keys for OpenAI and Tavily

### **5.2. Installation**

1. **Clone the repository:**
   git clone \<repository-url\>
   cd souls-not-lost

2. **Install dependencies:**
   npm install

3. **Link to your Supabase project:**
   npx supabase login
   npx supabase link \--project-ref \<your-project-ref\>

4. Create Environment File:
   Create a .env.local file in the root of the project and populate it with your credentials:
   \# Public Supabase credentials
   NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

   \# Secret keys for server-side and edge functions
   SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
   OPENAI_API_KEY=YOUR_OPENAI_API_KEY
   TAVILY_API_KEY=YOUR_TAVILY_API_KEY

5. Set Supabase Secrets:
   Push your secret keys to the Supabase project so your edge functions can access them.
   npx supabase secrets set \--env-file ./env.local

### **5.3. Running the Application**

1. Push Database Migrations:
   Apply the database schema and security policies to your Supabase project.
   npx supabase db push

2. Deploy Edge Functions:
   Deploy the Deno functions to your Supabase project.
   npx supabase functions deploy

3. **Run the Next.js App:**
   npm run dev

The application will be available at http://localhost:3000.
