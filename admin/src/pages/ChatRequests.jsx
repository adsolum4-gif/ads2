import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Switch } from "@mui/material";
import { toast } from "sonner";
import { MdArrowBack, MdClose, MdImage, MdSend } from "react-icons/md";
import { supabase } from "@shared/supabase";
import {
  formatChatDay,
  formatChatTime,
  markSupportSeen,
  sendSupportMessage,
  setSupportStatus,
  subscribeSupport,
  uploadSupportImage,
} from "@shared/supportChat";
import { api, ensureAdminSession, showError, unwrap } from "../api/client";
import { endpoints } from "../api/endpoints";

const LIMIT_FIELDS = [
  ["support_tickets_per_day", "Tickets / day", 0, 100],
  ["support_messages_per_day", "Messages / day", 0, 1000],
  ["support_images_per_day", "Photos / day", 0, 100],
  ["support_max_chars", "Characters / message", 10, 5000],
];

function displayName(ticket) {
  const profile = ticket.profiles;
  if (!profile) return "User";
  const name = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
  return name || profile.username || "User";
}

export default function ChatRequests() {
  const [tickets, setTickets] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [filter, setFilter] = useState("open");
  const [composer, setComposer] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [sending, setSending] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [mobilePane, setMobilePane] = useState("list");
  const [limitsOpen, setLimitsOpen] = useState(false);
  const [limitForm, setLimitForm] = useState({
    support_tickets_per_day: 2,
    support_messages_per_day: 40,
    support_images_per_day: 5,
    support_max_chars: 500,
  });
  const [maxChars, setMaxChars] = useState(500);
  const [savingLimits, setSavingLimits] = useState(false);
  const endRef = useRef(null);
  const fileRef = useRef(null);
  const activeIdRef = useRef(null);

  const active = tickets.find((t) => t.id === activeId) || null;
  activeIdRef.current = activeId;

  const visible = tickets.filter((t) => (filter === "all" ? true : t.status === filter));

  const loadTickets = useCallback(async () => {
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*, profiles(username, first_name, last_name)")
      .order("last_message_at", { ascending: false });
    if (error) throw new Error(error.message);
    setTickets(data || []);
  }, []);

  const loadMessages = useCallback(async (ticketId) => {
    const { data, error } = await supabase
      .from("support_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    setMessages(data || []);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await loadTickets();
        await ensureAdminSession();
        const data = unwrap(await api.get(endpoints.SETTINGS)) || {};
        setLimitForm({
          support_tickets_per_day: data.support_tickets_per_day ?? 2,
          support_messages_per_day: data.support_messages_per_day ?? 40,
          support_images_per_day: data.support_images_per_day ?? 5,
          support_max_chars: data.support_max_chars ?? 500,
        });
        setMaxChars(Number(data.support_max_chars ?? 500));
      } catch (err) {
        toast.error(err.message || "Could not load chat requests.");
      }
    })();
    return subscribeSupport((kind, payload) => {
      if (kind === "ticket" && payload.new?.id) {
        const viewing = payload.new.id === activeIdRef.current;
        if (viewing && payload.new.admin_unread) markSupportSeen(payload.new.id).catch(() => {});
        setTickets((prev) => {
          const existing = prev.find((t) => t.id === payload.new.id);
          const row = {
            ...existing,
            ...payload.new,
            profiles: existing?.profiles || payload.new.profiles,
            admin_unread: viewing ? false : payload.new.admin_unread,
          };
          const rest = prev.filter((t) => t.id !== row.id);
          return [row, ...rest].sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));
        });
        if (payload.eventType === "INSERT") loadTickets();
      }
      if (kind === "message" && payload.new?.ticket_id === activeIdRef.current) {
        const row = payload.new;
        setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
      }
      if (kind === "message") loadTickets();
    });
  }, [loadTickets]);

  useEffect(() => {
    if (!activeId) return;
    loadMessages(activeId).catch((err) => toast.error(err.message));
    markSupportSeen(activeId).catch(() => {});
    setTickets((prev) => prev.map((t) => (t.id === activeId ? { ...t, admin_unread: false } : t)));
  }, [activeId, loadMessages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, activeId]);

  const openTicket = (id) => {
    setActiveId(id);
    setMobilePane("thread");
    setComposer("");
    setFile(null);
    setPreview(null);
  };

  const saveLimits = async () => {
    setSavingLimits(true);
    try {
      const session = await ensureAdminSession();
      if (!session) {
        toast.error("Session expired. Please log out and sign in again.");
        return;
      }
      await api.patch(endpoints.PATCH_SETTINGS, limitForm);
      setMaxChars(Number(limitForm.support_max_chars));
      toast.success("Support limits updated");
    } catch (err) {
      showError(err);
    } finally {
      setSavingLimits(false);
    }
  };

  const toggleCompleted = async (completed) => {
    if (!active) return;
    try {
      const updated = await setSupportStatus(active.id, completed);
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated, profiles: t.profiles } : t)));
      toast.success(completed ? "Marked as completed" : "Reopened");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const send = async () => {
    if (!active || active.status !== "open" || sending) return;
    const text = composer.trim();
    if (!text && !file) return;
    setSending(true);
    try {
      let imageUrl = null;
      if (file) imageUrl = await uploadSupportImage(file);
      const message = await sendSupportMessage(active.id, text, imageUrl);
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      setComposer("");
      setFile(null);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const groups = useMemo(() => {
    const days = [];
    messages.forEach((message) => {
      const label = formatChatDay(message.created_at);
      const last = days[days.length - 1];
      if (!last || last.label !== label) days.push({ label, items: [message] });
      else last.items.push(message);
    });
    return days;
  }, [messages]);

  return (
    <div className="flex h-[calc(100dvh-4rem)] md:h-[calc(100dvh-6rem)] min-h-0 overflow-hidden bg-[#efeae2] md:rounded-2xl md:border md:border-gray-200">
      <aside className={`${mobilePane === "list" ? "flex" : "hidden"} md:flex w-full md:w-[340px] shrink-0 flex-col bg-white border-r border-gray-200 min-h-0`}>
        <div className="px-4 py-4 border-b border-gray-100">
          <h1 className="text-lg font-bold text-gray-900">Chat requests</h1>
          <div className="flex gap-2 mt-3">
            {["open", "completed", "all"].map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setFilter(name)}
                className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${filter === name ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600"}`}
              >
                {name}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setLimitsOpen((open) => !open)} className="mt-3 text-xs font-semibold text-red-600">
            {limitsOpen ? "Hide limits" : "Set daily limits"}
          </button>
          {limitsOpen && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {LIMIT_FIELDS.map(([key, label]) => (
                <label key={key} className="text-[11px] text-gray-500">
                  {label}
                  <input
                    type="number"
                    min="0"
                    value={limitForm[key]}
                    onChange={(e) => setLimitForm((form) => ({ ...form, [key]: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-900"
                  />
                </label>
              ))}
              <button
                type="button"
                onClick={saveLimits}
                disabled={savingLimits}
                className="col-span-2 mt-1 rounded-full bg-red-600 text-white text-sm font-semibold py-2 disabled:opacity-40"
              >
                {savingLimits ? "Saving…" : "Save limits"}
              </button>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {visible.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">No chat requests in this list.</p>
          ) : (
            visible.map((ticket) => (
              <button
                key={ticket.id}
                type="button"
                onClick={() => openTicket(ticket.id)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 ${activeId === ticket.id ? "bg-red-50" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-sm text-gray-900 truncate">{displayName(ticket)}</p>
                  {ticket.admin_unread && <span className="h-2.5 w-2.5 rounded-full bg-red-600 shrink-0" />}
                </div>
                <p className="text-xs text-gray-400">@{ticket.profiles?.username || "user"}</p>
                <p className="text-sm text-gray-600 truncate mt-0.5">{ticket.description}</p>
                <p className="text-[11px] text-gray-400 mt-1">{formatChatDay(ticket.last_message_at)} · {formatChatTime(ticket.last_message_at)}</p>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className={`${mobilePane === "thread" ? "flex" : "hidden"} md:flex flex-1 min-w-0 min-h-0 flex-col`}>
        {!active ? (
          <div className="hidden md:flex flex-1 items-center justify-center text-gray-500 text-sm px-8 text-center">
            Select a chat request. New messages show up here without refreshing.
          </div>
        ) : (
          <>
            <header className="flex items-center gap-3 px-3 py-3 bg-white border-b border-gray-200">
              <button type="button" className="md:hidden p-1" onClick={() => setMobilePane("list")} aria-label="Back">
                <MdArrowBack className="text-2xl" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900 truncate">{displayName(active)}</p>
                <p className="text-xs text-gray-500 truncate">{active.description}</p>
              </div>
              <label className="flex items-center gap-1 text-xs font-semibold text-gray-700 shrink-0">
                <span className="hidden sm:inline">{active.status === "completed" ? "Completed" : "Open"}</span>
                <Switch
                  checked={active.status === "completed"}
                  onChange={(e) => toggleCompleted(e.target.checked)}
                  color="success"
                  size="small"
                />
              </label>
            </header>
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2 min-h-0">
              {groups.map((group) => (
                <div key={group.label}>
                  <p className="text-center text-[11px] text-gray-500 my-2">{group.label}</p>
                  {group.items.map((message) => {
                    const mine = message.sender_role === "admin";
                    return (
                      <div key={message.id} className={`flex mb-2 ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-3 py-2 shadow-sm ${mine ? "bg-[#d9fdd3] rounded-br-md" : "bg-white rounded-bl-md"}`}>
                          {!mine && <p className="text-[11px] font-semibold text-gray-500 mb-0.5">{displayName(active)}</p>}
                          {message.image_url && (
                            <button type="button" onClick={() => setLightbox(message.image_url)}>
                              <img src={message.image_url} alt="Attachment" className="rounded-xl max-h-64 object-cover mb-1" />
                            </button>
                          )}
                          {message.body && <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>}
                          <p className="text-[10px] text-gray-400 text-right mt-1">{formatChatTime(message.created_at)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div ref={endRef} />
            </div>
            {active.status === "completed" ? (
              <div className="m-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm text-center px-4 py-3">
                This issue has been resolved. Toggle completed off to reopen the chat.
              </div>
            ) : (
              <div className="bg-[#f0f2f5] border-t border-gray-200 px-3 py-2">
                {preview && (
                  <div className="relative inline-block mb-2">
                    <img src={preview} alt="Selected attachment" className="h-16 w-16 rounded-lg object-cover" />
                    <button
                      type="button"
                      className="absolute -top-2 -right-2 bg-gray-900 text-white rounded-full"
                      onClick={() => {
                        URL.revokeObjectURL(preview);
                        setPreview(null);
                        setFile(null);
                      }}
                    >
                      <MdClose />
                    </button>
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <button type="button" onClick={() => fileRef.current?.click()} className="h-11 w-11 rounded-full bg-white flex items-center justify-center" aria-label="Attach photo">
                    <MdImage className="text-2xl text-gray-600" />
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const next = e.target.files?.[0];
                      e.target.value = "";
                      if (!next) return;
                      setFile(next);
                      setPreview(URL.createObjectURL(next));
                    }}
                  />
                  <textarea
                    value={composer}
                    maxLength={maxChars}
                    rows={1}
                    placeholder="Reply"
                    onChange={(e) => setComposer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    className="flex-1 resize-none rounded-2xl px-4 py-3 text-sm outline-none max-h-28"
                  />
                  <button
                    type="button"
                    onClick={send}
                    disabled={sending || (!composer.trim() && !file)}
                    className="h-11 w-11 rounded-full bg-red-600 text-white flex items-center justify-center disabled:opacity-40"
                    aria-label="Send"
                  >
                    <MdSend />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
      {lightbox && (
        <button type="button" className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Full size attachment" className="max-h-[90vh] max-w-full rounded-lg" />
        </button>
      )}
    </div>
  );
}
