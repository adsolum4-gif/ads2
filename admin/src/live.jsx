import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@shared/supabase";
import { restoreAdminSession } from "./api/client";

const AdminLiveContext = createContext({ version: 0, last: null, connected: false });

export function AdminLiveProvider({ children }) {
  const [last, setLast] = useState(null);
  const [version, setVersion] = useState(0);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let channel;
    let pollTimer;
    let waitTimer;
    let liveOn = false;

    const emit = (type, payload, eventType) => {
      if (cancelled) return;
      setLast({ type, payload, eventType });
      setVersion((v) => v + 1);
    };

    const startPoll = () => {
      if (pollTimer || liveOn) return;
      emit("poll", null, "POLL");
      pollTimer = setInterval(() => emit("poll", null, "POLL"), 12000);
    };

    const stopPoll = () => {
      if (!pollTimer) return;
      clearInterval(pollTimer);
      pollTimer = null;
    };

    const subscribe = async () => {
      await restoreAdminSession();
      if (cancelled) return;
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) {
        try {
          await supabase.realtime.setAuth(token);
        } catch {
          /* older clients */
        }
      }
      if (cancelled) return;

      channel = supabase
        .channel("admin-live")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, (payload) => {
          emit("user", payload.new, "INSERT");
          toast.info(`New user: ${payload.new?.username || "registered"}`);
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "deposits" }, (payload) => {
          emit("deposit", payload.new || payload.old, payload.eventType);
          if (payload.eventType === "INSERT") {
            const amount = payload.new?.amount ?? "0";
            toast.info(`New deposit of $${amount}`);
          }
        })
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_notifications" }, (payload) => {
          emit("notification", payload.new, "INSERT");
        })
        .subscribe((status) => {
          if (cancelled) return;
          if (status === "SUBSCRIBED") {
            liveOn = true;
            setConnected(true);
            stopPoll();
          }
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            liveOn = false;
            setConnected(false);
            startPoll();
          }
        });

      waitTimer = window.setTimeout(() => {
        if (!cancelled && !liveOn) startPoll();
      }, 4000);
    };

    subscribe();

    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token).catch(() => {});
      }
    });

    return () => {
      cancelled = true;
      if (waitTimer) window.clearTimeout(waitTimer);
      if (pollTimer) clearInterval(pollTimer);
      if (channel) supabase.removeChannel(channel);
      authSub?.subscription?.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ version, last, connected }), [version, last, connected]);
  return <AdminLiveContext.Provider value={value}>{children}</AdminLiveContext.Provider>;
}

export function useAdminLive() {
  return useContext(AdminLiveContext);
}

export function useAdminLiveRefresh(types, refresh) {
  const { version, last } = useAdminLive();
  const skip = useRef(true);
  useEffect(() => {
    if (skip.current) {
      skip.current = false;
      return;
    }
    if (!types?.length || last?.type === "poll" || types.includes(last?.type)) refresh?.();
  }, [version]);
}
