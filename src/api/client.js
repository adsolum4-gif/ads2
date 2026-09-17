import { toast } from "sonner";
import { createApi } from "@shared/backend";
import { supabase } from "@shared/supabase";

export const API_BASE = import.meta.env.VITE_SUPABASE_URL || "https://cfthacqhkkqzrbgqvckr.supabase.co";
export const api = createApi();
export const refreshClient = api;

export function showApiError(error, fallback = "An unexpected error occurred.") {
  const data = error?.response?.data;
  const message = data?.errors || data?.message || data?.detail || error?.message || fallback;
  if (typeof message === "string") toast.error(message);
  else if (Array.isArray(message)) message.forEach((item) => toast.error(item));
  else if (typeof message === "object") {
    Object.values(message).forEach((value) => {
      if (Array.isArray(value)) value.forEach((item) => toast.error(item));
      else toast.error(String(value));
    });
  } else toast.error(fallback);
}

function flattenMessage(value, fallback) {
  if (!value) return fallback;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] || fallback;
  if (typeof value === "object") return Object.values(value).flat()?.[0] || fallback;
  return fallback;
}

export const authApi = {
  login: async ({ username, password }) => {
    try {
      const { data } = await api.post("/auth/login/", { username_or_email: username, password });
      const payload = data.data || data;
      const access_token = payload.access_token || payload.access;
      const refresh_token = payload.refresh_token || payload.refresh;
      const user = payload.user;
      localStorage.setItem("accessToken", access_token);
      localStorage.setItem("refreshToken", refresh_token);
      return { success: true, data: user, access_token, refresh_token };
    } catch (error) {
      const message = flattenMessage(error.response?.data?.message, "Login failed. Please try again.");
      toast.error(message);
      return { success: false, message };
    }
  },
  sendOtp: async (email) => {
    try {
      const { data } = await api.post("/auth/send_otp/", { email });
      const payload = data.data || data;
      return { success: true, data: payload, message: payload.message || data.message || "OTP sent." };
    } catch (error) {
      return { success: false, message: flattenMessage(error.response?.data?.message, "Failed to send OTP. Please try again.") };
    }
  },
  verifyOtp: async ({ email, otp_code }) => {
    try {
      const { data } = await api.post("/auth/verify_otp/", { email, otp_code });
      return { success: true, data: data.data || data, message: data.message };
    } catch (error) {
      return { success: false, message: flattenMessage(error.response?.data?.message, "Invalid OTP code. Please try again.") };
    }
  },
  signupWithOtp: async (payload) => {
    try {
      const { data } = await api.post("/auth/signup_with_otp/", payload);
      const body = data.data || data;
      const user = body.user || body;
      const access_token = body.access_token || body.access;
      const refresh_token = body.refresh_token || body.refresh;
      if (access_token) localStorage.setItem("accessToken", access_token);
      if (refresh_token) localStorage.setItem("refreshToken", refresh_token);
      return {
        success: true,
        data: user,
        access_token,
        refresh_token,
        message: data.message || body.message || "Registration successful. Email verified.",
      };
    } catch (error) {
      return { success: false, message: flattenMessage(error.response?.data?.message, "Registration failed. Please try again.") };
    }
  },
  fetchProfile: async () => {
    try {
      const { data } = await api.get("/auth/me/");
      return { success: true, data: data.data || data };
    } catch {
      return { success: false, message: "Failed to fetch profile." };
    }
  },
  fetchSettings: async () => {
    try {
      const { data } = await api.get("/auth/settings/");
      return { success: true, data: data.data || data };
    } catch (error) {
      return { success: false, message: flattenMessage(error.response?.data?.message, "Failed to fetch settings.") };
    }
  },
  updateProfile: async (payload) => {
    const { data } = await api.patch("/auth/update_profile/", payload);
    return data;
  },
  changePassword: async (payload) => {
    const { data } = await api.post("/auth/user_change_password/", payload);
    return data;
  },
  changeTransactionPassword: async (payload) => {
    const { data } = await api.post("/auth/user_change_transactional_password/", payload);
    return data;
  },
  setTransactionPassword: async (payload) => {
    const { data } = await api.post("/auth/user_set_transactional_password/", payload);
    return data;
  },
};

export async function refreshAccessToken() {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) throw error || new Error("No session");
    localStorage.setItem("accessToken", data.session.access_token);
    localStorage.setItem("refreshToken", data.session.refresh_token);
    return { success: true };
  } catch {
    toast.error("Session expired. Please log in again.");
    return { success: false };
  }
}

export const announcementApi = {
  getActiveAnnouncement: async () => {
    try {
      const { data } = await api.get("/site_admin/announcements/active/");
      return { success: true, data: data.data };
    } catch {
      return { success: false, data: null, message: "Failed to fetch announcement." };
    }
  },
  markAnnouncementAsSeen: async (id) => {
    try {
      const { data } = await api.post("/site_admin/announcements/mark-seen/", { announcement_id: id });
      const payload = data.data || data;
      return { success: true, notification: payload.notification || null, message: payload.message };
    } catch {
      return { success: false, message: "Failed to mark announcement as seen." };
    }
  },
};
