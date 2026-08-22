import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../types/database.types.ts";

export interface ServiceRoleEnvironment {
  [key: string]: string | undefined;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

export function createServiceRoleClient(
  environment: ServiceRoleEnvironment = process.env,
): SupabaseClient<Database> {
  if (typeof window !== "undefined") {
    throw new Error("The Supabase service-role client is server-only.");
  }

  const supabaseUrl = environment.SUPABASE_URL ?? environment.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = environment.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is required for write mode.");
  }
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for write mode.");
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
