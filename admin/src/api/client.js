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

export async function ensureAdminSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;

  try {
    const stored = JSON.parse(localStorage.getItem("adminUser") || "null");
    if (stored?.access_token && stored?.refresh_token) {
      const restored = await supabase.auth.setSession({
        access_token: stored.access_token,
        refresh_token: stored.refresh_token,
      });
      if (restored.error) return null;
      return restored.data.session || null;
    }
  } catch {
    return null;
  }
  return null;
}

export async function restoreAdminSession() {
  const session = await ensureAdminSession();
  if (!session) return null;
  localStorage.setItem(
    "adminUser",
    JSON.stringify({
      ...(JSON.parse(localStorage.getItem("adminUser") || "{}") || {}),
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    })
  );
  return session;
}
