import { useEffect, useMemo, useState } from "react";
import { Button, CircularProgress, TextField, Typography } from "@mui/material";
import { toast } from "sonner";
import { api, ensureAdminSession, unwrap, showError } from "../api/client";
import { endpoints } from "../api/endpoints";
import { PageHeader, LoadingBar, FetchError } from "../components/PageHeader";
import {
  normalizeOnlineChatUrl,
  normalizeTelegramUsername,
  normalizeWhatsappContact,
  telegramChatUrl,
  whatsappChatUrl,
} from "@shared/contactLinks";

const CONTACT_KEYS = ["whatsapp_contact", "telegram_username", "online_chat_url", "online_embed_url"];

const FIELDS = [
  {
    key: "whatsapp_contact",
    label: "WhatsApp number",
    helper: "Include country code with + (e.g. +234 for Nigeria, then the rest of the number: +2348012345678).",
    placeholder: "+2348012345678",
  },
  {
    key: "telegram_username",
    label: "Telegram handle",
    helper: "Public @username only (e.g. adsterra_support). Users open t.me/your_handle — no phone number needed.",
    placeholder: "@adsterra_support",
  },
  {
    key: "online_chat_url",
    label: "Online chat link",
    helper: "Full URL opened when users tap Online Chat on the contact page.",
    placeholder: "https://your-live-chat.example.com",
  },
  {
    key: "online_embed_url",
    label: "Embedded chat script URL (optional)",
    helper: "Script URL for the floating chat widget on the user app, if your provider supplies one.",
    placeholder: "https://…",
  },
];

export default function ContactSettings() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      await ensureAdminSession();
      const res = await api.get(endpoints.SETTINGS);
      const data = unwrap(res) || {};
      setForm({
        whatsapp_contact: data.whatsapp_contact ? `+${normalizeWhatsappContact(data.whatsapp_contact)}` : "",
        telegram_username: data.telegram_username ?? "",
        online_chat_url: data.online_chat_url ?? "",
        online_embed_url: data.online_embed_url ?? "",
      });
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const previews = useMemo(
    () => ({
      whatsapp: whatsappChatUrl(form.whatsapp_contact),
      telegram: telegramChatUrl(form.telegram_username),
      online: normalizeOnlineChatUrl(form.online_chat_url) || null,
    }),
    [form]
  );

  const save = async () => {
    setSaving(true);
    try {
      const session = await ensureAdminSession();
      if (!session) {
        toast.error("Session expired. Please log out and sign in again.");
        return;
      }
      const waDigits = normalizeWhatsappContact(form.whatsapp_contact);
      const payload = {
        whatsapp_contact: waDigits,
        telegram_username: normalizeTelegramUsername(form.telegram_username),
        telegram_contact: "",
        online_chat_url: normalizeOnlineChatUrl(form.online_chat_url),
        online_embed_url: normalizeOnlineChatUrl(form.online_embed_url),
      };
      const res = await api.patch(endpoints.PATCH_SETTINGS, payload);
      const saved = unwrap(res) || payload;
      setForm({
        whatsapp_contact: saved.whatsapp_contact ? `+${saved.whatsapp_contact}` : "",
        telegram_username: saved.telegram_username ?? payload.telegram_username,
        online_chat_url: saved.online_chat_url ?? payload.online_chat_url,
        online_embed_url: saved.online_embed_url ?? payload.online_embed_url,
      });
      toast.success("Contact options updated");
    } catch (e) {
      showError(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingBar />;
  if (error) return <FetchError retry={load} />;

  return (
    <div className="p-2 md:p-6 max-w-3xl">
      <PageHeader title="Contact support" />
      <Typography variant="body2" color="text.secondary" className="mb-4">
        These options appear on the user app under Home → Contact Us. Save after editing each field.
      </Typography>

      <div className="grid grid-cols-1 gap-4 p-6 bg-white rounded-lg shadow">
        {FIELDS.map(({ key, label, helper, placeholder }) => (
          <TextField
            key={key}
            label={label}
            placeholder={placeholder}
            helperText={helper}
            value={form[key] ?? ""}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            fullWidth
          />
        ))}

        <div className="rounded-lg bg-gray-50 border border-gray-100 p-4 text-sm space-y-2">
          <p className="font-semibold text-gray-700">Preview links (user app)</p>
          <p className="text-gray-600 break-all">
            WhatsApp: {previews.whatsapp ? <a href={previews.whatsapp} target="_blank" rel="noreferrer" className="text-red-600 underline">{previews.whatsapp}</a> : "— not set —"}
          </p>
          <p className="text-gray-600 break-all">
            Telegram: {previews.telegram ? <a href={previews.telegram} target="_blank" rel="noreferrer" className="text-red-600 underline">{previews.telegram}</a> : "— not set —"}
          </p>
          <p className="text-gray-600 break-all">
            Online chat: {previews.online ? <a href={previews.online} target="_blank" rel="noreferrer" className="text-red-600 underline">{previews.online}</a> : "— not set —"}
          </p>
        </div>
      </div>

      <Button className="mt-4" variant="contained" color="error" onClick={save} disabled={saving}>
        {saving ? <CircularProgress size={16} /> : "Save contact options"}
      </Button>
    </div>
  );
}
