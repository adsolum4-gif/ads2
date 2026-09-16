import { toast } from "sonner";
import { createApi } from "@shared/backend";
import { supabase } from "@shared/supabase";

export const API_BASE = import.meta.env.VITE_SUPABASE_URL || "https://cfthacqhkkqzrbgqvckr.supabase.co";
export const api = createApi();

export function unwrap(res) {
  return res.data?.data ?? res.data;
}

export function showError(error, fallback = "An unknown server error occurred. Please try again later.") {
  const data = error?.response?.data;
  const message = data?.errors || data?.message || data?.error || data?.detail || error?.message || fallback;
  if (typeof message === "string") toast.error(message);
  else if (Array.isArray(message)) message.forEach((m) => toast.error(String(m)));
  else if (typeof message === "object") {
    Object.entries(message).forEach(([k, v]) => toast.error(`${k}: ${Array.isArray(v) ? v[0] : v}`));
  } else toast.error(fallback);
}

export async function restoreAdminSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    localStorage.setItem(
      "adminUser",
      JSON.stringify({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      })
    );
  }
}
