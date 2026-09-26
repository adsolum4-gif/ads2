import { useEffect, useMemo, useState } from "react";
import { Button, CircularProgress, FormControlLabel, Switch, TextField, Typography } from "@mui/material";
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

const CHANNELS = [
  {
    valueKey: "online_chat_url",
    visibilityKey: "show_online_chat",
    label: "Online chat link",
    buttonLabel: "Online Chat",
    helper: "Full URL opened when users tap Online Chat on the contact page.",
    placeholder: "https://your-live-chat.example.com",
  },
  {
    valueKey: "whatsapp_contact",
    visibilityKey: "show_whatsapp",
    label: "WhatsApp number",
    buttonLabel: "WhatsApp Chat",
    helper: "Include country code with + (e.g. +234 for Nigeria: +2348012345678).",
    placeholder: "+2348012345678",
    formatDisplay: (v) => (v ? `+${normalizeWhatsappContact(v)}` : ""),
    normalize: (v) => normalizeWhatsappContact(v),
  },
  {
    valueKey: "telegram_username",
    visibilityKey: "show_telegram",
    label: "Telegram handle",
    buttonLabel: "Telegram Chat",
    helper: "Public @username only (e.g. adsterra_support). Links to t.me/your_handle.",
    placeholder: "@adsterra_support",
    normalize: (v) => normalizeTelegramUsername(v),
  },
];

const EMBED_FIELD = {
  key: "online_embed_url",
  label: "Embedded chat script URL (optional)",
  helper: "Script URL for the floating chat widget on the user app, if your provider supplies one.",
  placeholder: "https://…",
};

function visibleFlag(value) {
  return value !== false;
}

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
        online_chat_url: data.online_chat_url ?? "",
        whatsapp_contact: data.whatsapp_contact ? `+${normalizeWhatsappContact(data.whatsapp_contact)}` : "",
        telegram_username: data.telegram_username ?? "",
        online_embed_url: data.online_embed_url ?? "",
        show_online_chat: visibleFlag(data.show_online_chat),
        show_whatsapp: visibleFlag(data.show_whatsapp),
        show_telegram: visibleFlag(data.show_telegram),
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
      const payload = {
        online_chat_url: normalizeOnlineChatUrl(form.online_chat_url),
        whatsapp_contact: normalizeWhatsappContact(form.whatsapp_contact),
        telegram_username: normalizeTelegramUsername(form.telegram_username),
        telegram_contact: "",
        online_embed_url: normalizeOnlineChatUrl(form.online_embed_url),
        show_online_chat: !!form.show_online_chat,
        show_whatsapp: !!form.show_whatsapp,
        show_telegram: !!form.show_telegram,
      };
      const res = await api.patch(endpoints.PATCH_SETTINGS, payload);
      const saved = unwrap(res) || payload;
      setForm({
        online_chat_url: saved.online_chat_url ?? payload.online_chat_url,
        whatsapp_contact: saved.whatsapp_contact ? `+${saved.whatsapp_contact}` : "",
        telegram_username: saved.telegram_username ?? payload.telegram_username,
        online_embed_url: saved.online_embed_url ?? payload.online_embed_url,
        show_online_chat: visibleFlag(saved.show_online_chat),
        show_whatsapp: visibleFlag(saved.show_whatsapp),
        show_telegram: visibleFlag(saved.show_telegram),
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
        These options appear on the user app under Home → Contact Us. Use each toggle to show or hide a button without
        deleting the link or number.
      </Typography>

      <div className="grid grid-cols-1 gap-4 p-6 bg-white rounded-lg shadow">
        {CHANNELS.map(({ valueKey, visibilityKey, label, buttonLabel, helper, placeholder }) => (
          <div key={valueKey} className="rounded-lg border border-gray-100 p-4 space-y-3">
            <FormControlLabel
              control={
                <Switch
                  checked={!!form[visibilityKey]}
                  onChange={(e) => setForm({ ...form, [visibilityKey]: e.target.checked })}
                  color="error"
                />
              }
              label={
                <span>
                  Show <strong>{buttonLabel}</strong> button
                  {!form[visibilityKey] && (
                    <Typography component="span" variant="body2" color="text.secondary" className="ml-2">
                      (hidden on contact page)
                    </Typography>
                  )}
                </span>
              }
            />
            <TextField
              label={label}
              placeholder={placeholder}
              helperText={helper}
              value={form[valueKey] ?? ""}
              onChange={(e) => setForm({ ...form, [valueKey]: e.target.value })}
              fullWidth
            />
          </div>
        ))}

        <TextField
          label={EMBED_FIELD.label}
          placeholder={EMBED_FIELD.placeholder}
          helperText={EMBED_FIELD.helper}
          value={form.online_embed_url ?? ""}
          onChange={(e) => setForm({ ...form, online_embed_url: e.target.value })}
          fullWidth
        />

        <div className="rounded-lg bg-gray-50 border border-gray-100 p-4 text-sm space-y-2">
          <p className="font-semibold text-gray-700">Preview links (user app)</p>
          <p className="text-gray-600 break-all">
            WhatsApp:{" "}
            {form.show_whatsapp && previews.whatsapp ? (
              <a href={previews.whatsapp} target="_blank" rel="noreferrer" className="text-red-600 underline">
                {previews.whatsapp}
              </a>
            ) : (
              "— hidden or not set —"
            )}
          </p>
          <p className="text-gray-600 break-all">
            Telegram:{" "}
            {form.show_telegram && previews.telegram ? (
              <a href={previews.telegram} target="_blank" rel="noreferrer" className="text-red-600 underline">
                {previews.telegram}
              </a>
            ) : (
              "— hidden or not set —"
            )}
          </p>
          <p className="text-gray-600 break-all">
            Online chat:{" "}
            {form.show_online_chat && previews.online ? (
              <a href={previews.online} target="_blank" rel="noreferrer" className="text-red-600 underline">
                {previews.online}
              </a>
            ) : (
              "— hidden or not set —"
            )}
          </p>
        </div>
      </div>

      <Button className="mt-4" variant="contained" color="error" onClick={save} disabled={saving}>
        {saving ? <CircularProgress size={16} /> : "Save contact options"}
      </Button>
    </div>
  );
}
