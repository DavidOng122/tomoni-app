import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublicStoragePattern = supabaseUrl
  ? new URL("/storage/v1/object/public/**", supabaseUrl)
  : null;
const allowLocalSupabaseImages = supabasePublicStoragePattern
  ? ["127.0.0.1", "localhost", "[::1]"].includes(
      supabasePublicStoragePattern.hostname,
    )
  : false;
const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: supabasePublicStoragePattern
      ? [supabasePublicStoragePattern]
      : [],
    dangerouslyAllowLocalIP: allowLocalSupabaseImages,
  },
};

export default nextConfig;
