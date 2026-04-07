import { createBrowserClient } from "@supabase/ssr";

// Browser Supabase client — dipakai di Client Components.
// Cookie session di-handle otomatis oleh @supabase/ssr.
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  return createBrowserClient(url, anonKey);
}
