import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { FaHeadset } from "react-icons/fa";
import { MdAdd, MdArrowBack, MdClose, MdImage, MdSend } from "react-icons/md";
import { supabase } from "@shared/supabase";
import {
  createSupportTicket,
  fetchSupportQuota,
  formatChatDay,
  formatChatTime,
  markSupportSeen,
  sendSupportMessage,
  subscribeSupport,
  supportLimits,
  uploadSupportImage,
} from "@shared/supportChat";

export default function Support() {
  const [tickets, setTickets] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [draftIssue, setDraftIssue] = useState("");
  const [composer, setComposer] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [sending, setSending] = useState(false);
  const [quota, setQuota] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [mobilePane, setMobilePane] = useState("list");
  const [myId, setMyId] = useState(null);
  const endRef = useRef(null);
  const fileRef = useRef(null);

  const active = tickets.find((t) => t.id === activeId) || null;
  const limits = supportLimits(quota);
  const ticketsLeft = Math.max(0, limits.ticketsPerDay - Number(quota?.tickets_today || 0));
  const messagesLeft = Math.max(0, limits.messagesPerDay - Number(quota?.messages_today || 0));
  const imagesLeft = Math.max(0, limits.imagesPerDay - Number(quota?.images_today || 0));

  const loadQuota = useCallback(async () => {
    try {
      setQuota(await fetchSupportQuota());
    } catch {
      /* quota hint is optional */
    }
  }, []);

  const loadTickets = useCallback(async () => {
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .order("last_message_at", { ascending: false });
    if (error) throw new Error(error.message);
    setTickets(data || []);
    return data || [];
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
    let live = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (live) setMyId(data.session?.user?.id || null);
        await Promise.all([loadTickets(), loadQuota()]);
      } catch (err) {
        toast.error(err.message || "Could not load support.");
      } finally {
        if (live) setLoading(false);
      }
    })();
    const stop = subscribeSupport((kind, payload) => {
      if (kind === "ticket") {
        const row = payload.new;
        if (!row?.id) return;
        const viewing = row.id === activeIdRef.current;
        const next = viewing ? { ...row, user_unread: false } : row;
        if (viewing && row.user_unread) markSupportSeen(row.id).catch(() => {});
        setTickets((prev) => {
          const rest = prev.filter((t) => t.id !== next.id);
          return [next, ...rest].sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));
        });
      }
      if (kind === "message") {
        const row = payload.new;
        if (!row?.id || row.ticket_id !== activeIdRef.current) return;
        setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        loadQuota();
      }
    });
    return () => {
      live = false;
      stop();
    };
  }, [loadQuota, loadTickets]);

  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;

  useEffect(() => {
    if (!activeId) return;
    setMessages([]);
    loadMessages(activeId).catch((err) => toast.error(err.message));
    markSupportSeen(activeId).catch(() => {});
    setTickets((prev) => prev.map((t) => (t.id === activeId ? { ...t, user_unread: false } : t)));
  }, [activeId, loadMessages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, activeId, mobilePane]);

  const openTicket = (id) => {
    setCreating(false);
    setActiveId(id);
    setMobilePane("thread");
    setComposer("");
    setFile(null);
    setPreview(null);
  };

  const submitTicket = async () => {
    const text = draftIssue.trim();
    if (text.length < limits.minTicketChars) {
      toast.error(`Describe the issue in at least ${limits.minTicketChars} characters.`);
      return;
    }
    setSending(true);
    try {
      const result = await createSupportTicket(text);
      const ticket = result?.ticket;
      const message = result?.message;
      if (ticket) {
        setTickets((prev) => [ticket, ...prev.filter((t) => t.id !== ticket.id)]);
        setActiveId(ticket.id);
        setMessages(message ? [message] : []);
        setMobilePane("thread");
        setCreating(false);
        setDraftIssue("");
        await loadQuota();
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const onPickFile = (event) => {
    const next = event.target.files?.[0];
    event.target.value = "";
    if (!next) return;
    if (imagesLeft <= 0) {
      toast.error(`You have reached the daily photo limit (${limits.imagesPerDay}).`);
      return;
    }
    setFile(next);
    setPreview(URL.createObjectURL(next));
  };

  const send = async () => {
    if (!active || active.status !== "open" || sending) return;
    const text = composer.trim();
    if (!text && !file) return;
    if (messagesLeft <= 0) {
      toast.error(`You have reached the daily message limit (${limits.messagesPerDay}).`);
      return;
    }
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
      await loadQuota();
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
    <div className="flex h-[calc(100dvh-4rem)] md:h-[calc(100dvh-2rem)] min-h-0 overflow-hidden bg-[#efeae2] md:rounded-2xl md:border md:border-gray-200 md:shadow-sm">
      <aside className={`${mobilePane === "list" ? "flex" : "hidden"} md:flex w-full md:w-[320px] shrink-0 flex-col bg-white border-r border-gray-200 min-h-0`}>
        <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Support 24/7</h1>
            <p className="text-xs text-gray-500 mt-0.5">{ticketsLeft} ticket{ticketsLeft === 1 ? "" : "s"} left today</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setCreating(true);
              setMobilePane("thread");
              setActiveId(null);
            }}
            disabled={ticketsLeft <= 0}
            className="inline-flex items-center gap-1 rounded-full bg-red-600 text-white text-sm font-semibold px-3 py-2 disabled:opacity-40"
          >
            <MdAdd /> New
          </button>
        </div>
        <div className="flex-1 overflow-y-auto pb-24 md:pb-2">
          {loading ? (
            <p className="p-6 text-sm text-gray-500">Loading chats…</p>
          ) : tickets.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">
              No tickets yet. Describe an issue and support will reply here live.
            </div>
          ) : (
            tickets.map((ticket) => (
              <button
                key={ticket.id}
                type="button"
                onClick={() => openTicket(ticket.id)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 ${activeId === ticket.id ? "bg-red-50" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-sm text-gray-900 truncate">Support ticket</p>
                  <span className={`text-[10px] font-semibold uppercase tracking-wide ${ticket.status === "completed" ? "text-emerald-600" : "text-red-600"}`}>
                    {ticket.status === "completed" ? "Resolved" : "Open"}
                  </span>
                </div>
                <p className="text-sm text-gray-600 truncate mt-0.5">{ticket.description}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[11px] text-gray-400">{formatChatDay(ticket.last_message_at)} · {formatChatTime(ticket.last_message_at)}</p>
                  {ticket.user_unread && <span className="h-2.5 w-2.5 rounded-full bg-red-600" />}
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className={`${mobilePane === "thread" ? "flex" : "hidden"} md:flex flex-1 min-w-0 min-h-0 flex-col`}>
        {creating ? (
          <div className="flex-1 overflow-y-auto bg-white p-4 md:p-8 pb-28 md:pb-8">
            <button type="button" className="md:hidden mb-3 inline-flex items-center text-sm text-gray-600" onClick={() => setMobilePane("list")}>
              <MdArrowBack className="mr-1" /> Back
            </button>
            <div className="max-w-lg mx-auto">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                  <FaHeadset className="text-xl" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">New support ticket</h2>
                  <p className="text-sm text-gray-500">Tell us what happened. A reply opens the live chat.</p>
                </div>
              </div>
              <textarea
                value={draftIssue}
                maxLength={limits.maxChars}
                onChange={(e) => setDraftIssue(e.target.value)}
                rows={6}
                placeholder="Describe the issue, including amounts, dates, or what you expected to happen."
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-red-400"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{draftIssue.trim().length}/{limits.maxChars}</span>
                <span>{limits.ticketsPerDay} tickets, {limits.messagesPerDay} messages, and {limits.imagesPerDay} photos per day</span>
              </div>
              <button
                type="button"
                onClick={submitTicket}
                disabled={sending || draftIssue.trim().length < limits.minTicketChars || ticketsLeft <= 0}
                className="mt-4 w-full rounded-full bg-red-600 text-white font-semibold py-3 disabled:opacity-40"
              >
                {sending ? "Opening…" : "Start chat"}
              </button>
              {ticketsLeft <= 0 && <p className="text-sm text-red-600 mt-3">You already opened {limits.ticketsPerDay} tickets today. Try again tomorrow.</p>}
            </div>
          </div>
        ) : !active ? (
          <div className="hidden md:flex flex-1 items-center justify-center text-center text-gray-500 px-8">
            <div>
              <FaHeadset className="text-5xl mx-auto text-gray-300 mb-3" />
              <p className="font-semibold text-gray-700">Support 24/7</p>
              <p className="text-sm mt-1">Choose a ticket or start a new one. Messages appear here as soon as they are sent.</p>
            </div>
          </div>
        ) : (
          <>
            <header className="flex items-center gap-3 px-3 py-3 bg-[#f0f2f5] border-b border-gray-200">
              <button type="button" className="md:hidden p-1" onClick={() => setMobilePane("list")} aria-label="Back to tickets">
                <MdArrowBack className="text-2xl" />
              </button>
              <div className="h-10 w-10 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0">
                <FaHeadset />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900 truncate">Adsterra Support</p>
                <p className="text-xs text-gray-500 truncate">{active.status === "completed" ? "This issue has been resolved" : "Online · replies appear instantly"}</p>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3 min-h-0">
              {groups.map((group) => (
                <div key={group.label} className="space-y-2">
                  <p className="text-center text-[11px] text-gray-500 bg-white/80 inline-block mx-auto rounded-full px-3 py-1 shadow-sm w-fit block">{group.label}</p>
                  {group.items.map((message) => {
                    const mine = message.sender_role === "user" && message.sender_id === myId;
                    return (
                      <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-3 py-2 shadow-sm ${mine ? "bg-[#d9fdd3] rounded-br-md" : "bg-white rounded-bl-md"}`}>
                          {!mine && <p className="text-[11px] font-semibold text-red-600 mb-0.5">Support</p>}
                          {message.image_url && (
                            <button type="button" onClick={() => setLightbox(message.image_url)} className="block mb-1">
                              <img src={message.image_url} alt="Attachment" className="rounded-xl max-h-64 w-full object-cover" />
                            </button>
                          )}
                          {message.body && <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">{message.body}</p>}
                          <p className={`text-[10px] mt-1 ${mine ? "text-right text-emerald-800/70" : "text-gray-400"}`}>{formatChatTime(message.created_at)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div ref={endRef} />
            </div>
            {active.status === "completed" ? (
              <div className="mx-3 mb-24 md:mb-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm text-center px-4 py-3">
                This issue has been resolved.
              </div>
            ) : (
              <div className="bg-[#f0f2f5] border-t border-gray-200 px-3 pt-2 pb-24 md:pb-3">
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
                      aria-label="Remove photo"
                    >
                      <MdClose />
                    </button>
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <button type="button" onClick={() => fileRef.current?.click()} className="h-11 w-11 shrink-0 rounded-full bg-white text-gray-600 flex items-center justify-center" aria-label="Attach screenshot">
                    <MdImage className="text-2xl" />
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
                  <textarea
                    value={composer}
                    maxLength={limits.maxChars}
                    rows={1}
                    placeholder="Message"
                    onChange={(e) => setComposer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    className="flex-1 resize-none rounded-2xl border-0 px-4 py-3 text-sm outline-none max-h-28"
                  />
                  <button
                    type="button"
                    onClick={send}
                    disabled={sending || (!composer.trim() && !file)}
                    className="h-11 w-11 shrink-0 rounded-full bg-red-600 text-white flex items-center justify-center disabled:opacity-40"
                    aria-label="Send"
                  >
                    <MdSend className="text-xl" />
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 mt-1 px-1">{messagesLeft} messages · {imagesLeft} photos left today · {composer.length}/{limits.maxChars}</p>
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
