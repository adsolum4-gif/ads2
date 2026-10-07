import { supabase } from "./supabase";
import { compressImage } from "./compressImage";

export const SUPPORT_LIMITS = {
  ticketsPerDay: 2,
  messagesPerDay: 40,
  imagesPerDay: 5,
  maxChars: 500,
  minTicketChars: 10,
};

export function supportLimits(quota) {
  return {
    ticketsPerDay: Number(quota?.tickets_per_day ?? SUPPORT_LIMITS.ticketsPerDay),
    messagesPerDay: Number(quota?.messages_per_day ?? SUPPORT_LIMITS.messagesPerDay),
    imagesPerDay: Number(quota?.images_per_day ?? SUPPORT_LIMITS.imagesPerDay),
    maxChars: Number(quota?.max_chars ?? SUPPORT_LIMITS.maxChars),
    minTicketChars: Number(quota?.min_ticket_chars ?? SUPPORT_LIMITS.minTicketChars),
  };
}

function rpcError(error) {
  const message = error?.message || "Something went wrong. Please try again.";
  const err = new Error(message.replace(/^.*ERROR:\s*/i, ""));
  throw err;
}

export async function fetchSupportQuota() {
  const { data, error } = await supabase.rpc("support_quota");
  if (error) rpcError(error);
  return data;
}

export async function createSupportTicket(description) {
  const { data, error } = await supabase.rpc("create_support_ticket", { p_description: description });
  if (error) rpcError(error);
  return data;
}

export async function sendSupportMessage(ticketId, body, imageUrl) {
  const { data, error } = await supabase.rpc("send_support_message", {
    p_ticket: ticketId,
    p_body: body || "",
    p_image: imageUrl || null,
  });
  if (error) rpcError(error);
  return data;
}

export async function setSupportStatus(ticketId, completed) {
  const { data, error } = await supabase.rpc("set_support_status", {
    p_ticket: ticketId,
    p_completed: completed,
  });
  if (error) rpcError(error);
  return data;
}

export async function markSupportSeen(ticketId) {
  const { error } = await supabase.rpc("mark_support_seen", { p_ticket: ticketId });
  if (error) rpcError(error);
}

export async function uploadSupportImage(file) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) throw new Error("Not authenticated");
  if (!String(file?.type || "").startsWith("image/")) throw new Error("Only photos and screenshots can be attached.");
  const prepared = await compressImage(file, 1024 * 1024);
  if (prepared.size > 2 * 1024 * 1024) throw new Error("Image must be under 2MB.");
  const type = prepared.type || "image/jpeg";
  const ext = (type.split("/")[1] || "jpg").replace("jpeg", "jpg");
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("support-chat").upload(path, prepared, {
    contentType: type,
    upsert: false,
  });
  if (error) throw new Error(error.message || "Could not upload the photo.");
  const { data } = supabase.storage.from("support-chat").getPublicUrl(path);
  return data.publicUrl;
}

export function subscribeSupport(onChange) {
  const channel = supabase
    .channel(`support-live-${crypto.randomUUID()}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, (payload) => onChange("ticket", payload))
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages" }, (payload) => onChange("message", payload))
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export function formatChatTime(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatChatDay(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  if (sameDay) return "Today";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}
