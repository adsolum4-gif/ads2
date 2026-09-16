import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://cfthacqhkkqzrbgqvckr.supabase.co";
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmdGhhY3Foa2txenJiZ3F2Y2tyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1NjMzODIsImV4cCI6MjEwNTEzOTM4Mn0.w7_CdcKCCHUbWDhU4ssYnYnu4WzxomQ9VTgoC338d6k";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
