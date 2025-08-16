// src/types/index.ts
import { Database } from "./supabase";

export type Memorial = Database["public"]["Tables"]["memorials"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
