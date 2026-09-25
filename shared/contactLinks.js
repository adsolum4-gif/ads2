/** Digits only for wa.me (include country code, no +), e.g. 2348012345678 */
export function normalizeWhatsappContact(value) {
  return String(value || "").replace(/\D/g, "");
}

export function normalizeTelegramUsername(value) {
  return String(value || "")
    .trim()
    .replace(/^@/, "")
    .replace(/^https?:\/\/(t\.me|telegram\.me)\//i, "")
    .split(/[/?#]/)[0];
}

export function whatsappChatUrl(phone) {
  const digits = normalizeWhatsappContact(phone);
  return digits ? `https://wa.me/${digits}` : null;
}

export function telegramChatUrl(username) {
  const handle = normalizeTelegramUsername(username);
  return handle ? `https://t.me/${handle}` : null;
}

export function normalizeOnlineChatUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}
