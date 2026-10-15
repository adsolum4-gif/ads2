import { supabase } from "./supabase";

export const SESSION_EXPIRED_EVENT = "adsterra:session-expired";

function readAdminTokens() {
  try {
    const admin = JSON.parse(localStorage.getItem("adminUser") || "null") || {};
    return {
      access: admin.access_token || admin.access || null,
      refresh: admin.refresh_token || admin.refresh || null,
    };
  } catch {
    return { access: null, refresh: null };
  }
}

export function storedAuthTokens() {
  if (typeof localStorage === "undefined") return { access: null, refresh: null };
  const admin = readAdminTokens();
  return {
    access: admin.access || localStorage.getItem("accessToken"),
    refresh: admin.refresh || localStorage.getItem("refreshToken"),
  };
}

export function persistSessionTokens(session, { admin = false } = {}) {
  if (!session?.access_token || typeof localStorage === "undefined") return;
  localStorage.setItem("accessToken", session.access_token);
  localStorage.setItem("refreshToken", session.refresh_token);
  if (!admin) return;
  try {
    const prev = JSON.parse(localStorage.getItem("adminUser") || "null") || {};
    localStorage.setItem(
      "adminUser",
      JSON.stringify({
        ...prev,
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        access: session.access_token,
        refresh: session.refresh_token,
      })
    );
  } catch {
    /* ignore */
  }
}

export function clearStoredSession({ admin = false } = {}) {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  if (admin) localStorage.removeItem("adminUser");
}

export function emitSessionExpired() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
  }
}

function isSessionExpired(session, skewSec = 30) {
  if (!session?.expires_at) return false;
  return session.expires_at * 1000 <= Date.now() + skewSec * 1000;
}

export async function restoreSessionFromStorage() {
  const { access, refresh } = storedAuthTokens();
  if (!access || !refresh) return null;
  const { data, error } = await supabase.auth.setSession({
    access_token: access,
    refresh_token: refresh,
  });
  if (error || !data.session) return null;
  return data.session;
}

export async function ensureFreshSession() {
  let { data } = await supabase.auth.getSession();
  let session = data?.session;

  if (!session) session = await restoreSessionFromStorage();

  if (session && isSessionExpired(session)) {
    const refreshed = await supabase.auth.refreshSession();
    if (refreshed.error || !refreshed.data.session) {
      session = await restoreSessionFromStorage();
      if (session && isSessionExpired(session)) {
        const retry = await supabase.auth.refreshSession();
        session = retry.data.session || null;
      }
    } else {
      session = refreshed.data.session;
    }
  }

  if (session) {
    const isAdmin = Boolean(localStorage.getItem("adminUser"));
    persistSessionTokens(session, { admin: isAdmin });
  }
  return session;
}

/** Keep Supabase session in sync with localStorage; log out when refresh fails. */
export function setupAuthSessionSync({ isAdmin, onExpired }) {
  if (typeof window === "undefined") return () => {};

  const persist = (session) => {
    if (session) persistSessionTokens(session, { admin: isAdmin });
  };

  const handleExpired = () => {
    clearStoredSession({ admin: isAdmin });
    supabase.auth.signOut().catch(() => {});
    onExpired?.();
  };

  const onApiExpired = () => handleExpired();
  window.addEventListener(SESSION_EXPIRED_EVENT, onApiExpired);

  const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") persist(session);
    if (event === "SIGNED_OUT") clearStoredSession({ admin: isAdmin });
  });

  const tick = async () => {
    if (document.visibilityState !== "visible") return;
    const hasStored = storedAuthTokens().access;
    if (!hasStored) return;
    const session = await ensureFreshSession();
    if (!session) handleExpired();
  };

  void tick();
  const intervalId = window.setInterval(tick, 4 * 60 * 1000);

  const onVisible = () => {
    void tick();
  };
  document.addEventListener("visibilitychange", onVisible);

  return () => {
    listener?.subscription?.unsubscribe();
    window.removeEventListener(SESSION_EXPIRED_EVENT, onApiExpired);
    window.clearInterval(intervalId);
    document.removeEventListener("visibilitychange", onVisible);
  };
}
