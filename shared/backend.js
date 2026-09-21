import { supabase } from "./supabase";
import { compressImage, isUploadFile } from "./compressImage";

export const API_BASE = SUPABASE_PLACEHOLDER();

function SUPABASE_PLACEHOLDER() {
  return import.meta.env.VITE_SUPABASE_URL || "https://cfthacqhkkqzrbgqvckr.supabase.co";
}

function fail(message, extra = {}) {
  const err = new Error(message);
  err.response = { status: extra.status || 400, data: { message, ...extra } };
  throw err;
}

function rpcError(error) {
  fail(error?.message || "Request failed");
}

function formToObject(body) {
  if (!body) return {};
  if (body instanceof FormData) {
    const obj = {};
    for (const [key, value] of body.entries()) obj[key] = value;
    return obj;
  }
  return { ...body };
}

function norm(url = "") {
  return String(url)
    .replace(/^https?:\/\/[^/]+/, "")
    .split("?")[0]
    .replace(/\/+$/, "") || "/";
}

async function uploadFile(bucket, file, prefix = "") {
  if (!file || typeof file === "string") return file || null;
  if (!isUploadFile(file)) return null;
  let toUpload = file;
  if (String(file.type || "").startsWith("image/") && file.size > 1024 * 1024) {
    toUpload = await compressImage(file);
  }
  const ext = (toUpload.name || file.name || "jpg").split(".").pop() || "jpg";
  const path = `${prefix}${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, toUpload, {
    upsert: true,
    contentType: toUpload.type || file.type || "image/jpeg",
  });
  if (error) fail(error.message);
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

function storedTokens() {
  if (typeof localStorage === "undefined") return {};
  try {
    const admin = JSON.parse(localStorage.getItem("adminUser") || "null") || {};
    return {
      access: admin.access_token || admin.access || localStorage.getItem("accessToken"),
      refresh: admin.refresh_token || admin.refresh || localStorage.getItem("refreshToken"),
    };
  } catch {
    return {};
  }
}

function asObject(value) {
  if (value == null) return {};
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return typeof value === "object" ? value : {};
}

async function requireSession() {
  let { data } = await supabase.auth.getSession();
  if (!data.session) {
    const { access, refresh } = storedTokens();
    if (access && refresh) {
      const restored = await supabase.auth.setSession({ access_token: access, refresh_token: refresh });
      if (!restored.error) data = restored.data;
    }
  }
  if (!data.session) fail("Not authenticated", { status: 401 });
  return data.session;
}

async function requireAdmin() {
  await requireSession();
  const { data, error } = await supabase.rpc("is_admin");
  if (error) rpcError(error);
  if (!data) fail("Not authorized", { status: 403 });
}

const EMPTY_MONTHS = {
  Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: 0, Jun: 0,
  Jul: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0,
};

async function buildAdminDashboardFallback() {
  try {
    const [{ count: totalUsers }, { count: activeProducts }, { count: submissions }, { data: profiles }] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("games").select("*", { count: "exact", head: true }).eq("pending", false),
      supabase
        .from("profiles")
        .select("username, total_negative_product_submitted, current_number_count, total_number_can_play, last_connection, wallets(balance, commission, on_hold)")
        .order("last_connection", { ascending: false })
        .limit(50),
    ]);
    const today = new Date().toISOString().slice(0, 10);
    const loginToday = (profiles || []).filter((p) => String(p.last_connection || "").startsWith(today));
    return {
      total_users: totalUsers || 0,
      active_products: activeProducts || 0,
      total_submissions: submissions || 0,
      user_registrations_per_month: { ...EMPTY_MONTHS },
      total_submissions_per_month: { ...EMPTY_MONTHS },
      total_users_login_today: {
        count: loginToday.length,
        users: loginToday.map((p) => ({
          username: p.username,
          total_negative_product_submitted: p.total_negative_product_submitted,
          wallet: Array.isArray(p.wallets) ? p.wallets[0] : p.wallets,
          total_play: p.current_number_count,
          total_available_play: p.total_number_can_play,
          last_connection: p.last_connection,
        })),
      },
    };
  } catch {
    return {
      total_users: 0,
      active_products: 0,
      total_submissions: 0,
      user_registrations_per_month: { ...EMPTY_MONTHS },
      total_submissions_per_month: { ...EMPTY_MONTHS },
      total_users_login_today: { count: 0, users: [] },
    };
  }
}

async function signInByLogin(login, password) {
  const { data: email } = await supabase.rpc("lookup_email", { p_login: login });
  const resolved = email || login;
  const { data, error } = await supabase.auth.signInWithPassword({ email: resolved, password });
  if (error) fail(error.message || "Login failed. Please try again.");
  return data;
}

function walletFromJoin(row) {
  const raw = row.wallets || row.wallet;
  const w = Array.isArray(raw) ? raw[0] : raw;
  if (!w) return {};
  const pack = Array.isArray(w.packs) ? w.packs[0] : w.packs || w.package;
  return {
    ...w,
    package: pack || null,
  };
}

async function hydrateGameProducts(raw) {
  if (!raw) return raw;
  const game = typeof raw === "string" ? JSON.parse(raw) : raw;
  let products = game.products;
  if (typeof products === "string") {
    try {
      products = JSON.parse(products);
    } catch {
      products = [];
    }
  }
  if (!Array.isArray(products)) products = [];
  if (!products.length && game.id) {
    const { data: rows } = await supabase
      .from("game_products")
      .select("products(id, image, name, price)")
      .eq("game_id", game.id);
    products = (rows || []).map((r) => r.products).filter(Boolean);
  }
  return { ...game, products };
}

function mapUser(row) {
  const wallet = walletFromJoin(row);
  return {
    ...row,
    wallet,
    balance: wallet.balance,
    on_hold: wallet.on_hold,
    active: row.is_active,
    total_product_submitted: row.total_games_played,
    total_games_played: row.total_games_played,
  };
}

async function handle(method, url, body, params = {}) {
  const path = norm(url);
  const m = method.toUpperCase();
  const payload = formToObject(body);

  if (m === "POST" && path === "/auth/login") {
    const data = await signInByLogin(payload.username_or_email || payload.username, payload.password);
    await supabase.rpc("touch_last_connection");
    const profile = await supabase.rpc("get_full_profile");
    if (profile.error) rpcError(profile.error);
    return {
      data: {
        access: data.session.access_token,
        access_token: data.session.access_token,
        refresh: data.session.refresh_token,
        refresh_token: data.session.refresh_token,
        user: profile.data,
      },
    };
  }

  if (m === "POST" && path === "/site_admin/auth/admin/login") {
    const data = await signInByLogin(payload.username_or_email || payload.username, payload.password);
    const role = data.user?.app_metadata?.role;
    if (role !== "admin") {
      await supabase.auth.signOut();
      fail("Not an administrator account.");
    }
    await supabase.rpc("touch_last_connection");
    const profile = await supabase.rpc("get_full_profile");
    return {
      data: {
        access: data.session.access_token,
        access_token: data.session.access_token,
        refresh: data.session.refresh_token,
        refresh_token: data.session.refresh_token,
        ...(profile.data || {}),
      },
    };
  }

  if (m === "POST" && path === "/auth/refresh-token") {
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: payload.refresh });
    if (error || !data.session) fail("Session expired. Please log in again.", { status: 401 });
    return {
      data: {
        access: data.session.access_token,
        access_token: data.session.access_token,
        refresh: data.session.refresh_token,
        refresh_token: data.session.refresh_token,
      },
    };
  }

  if (m === "POST" && path === "/auth/send_otp") {
    const email = String(payload.email || "").trim().toLowerCase();
    if (!email) fail("Please enter your email address.");
    const testing = {
      success: true,
      emailed: false,
      message: "Email sending needs a domain. For testing, enter 123456.",
    };
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", { body: { email } });
      if (error || data?.success === false) return testing;
      if (data?.emailed) {
        return {
          success: true,
          emailed: true,
          message: data.message || "OTP sent. If it does not arrive, enter 123456.",
        };
      }
      return testing;
    } catch {
      return testing;
    }
  }

  if (m === "POST" && path === "/auth/verify_otp") {
    const { data, error } = await supabase.rpc("verify_otp", { p_email: payload.email, p_code: payload.otp_code });
    if (error) rpcError(error);
    return { success: true, data, message: data?.message || "OTP verified" };
  }

  if (m === "POST" && path === "/auth/signup_with_otp") {
    const { error: verifyError } = await supabase.rpc("verify_otp", { p_email: payload.email, p_code: payload.otp_code });
    if (verifyError) rpcError(verifyError);
    const { data: signed, error: signError } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
    });
    if (signError) rpcError(signError);
    if (!signed.session) {
      const { error: inErr } = await supabase.auth.signInWithPassword({ email: payload.email, password: payload.password });
      if (inErr) rpcError(inErr);
    }
    const { data, error } = await supabase.rpc("complete_signup", {
      p_username: payload.username,
      p_phone: payload.phone_number,
      p_first_name: payload.first_name,
      p_last_name: payload.last_name,
      p_gender: payload.gender,
      p_invitation_code: payload.invitation_code,
      p_transactional_password: payload.transactional_password,
      p_referral_token: payload.referral_token || null,
    });
    if (error) rpcError(error);
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) fail("Registration succeeded, but login failed. Please sign in.");
    return {
      success: true,
      message: "Registration successful. Email verified.",
      data: {
        access: session.access_token,
        access_token: session.access_token,
        refresh: session.refresh_token,
        refresh_token: session.refresh_token,
        user: data,
      },
    };
  }

  if (m === "GET" && path === "/auth/me") {
    await requireSession();
    await supabase.rpc("ensure_daily_reset");
    await supabase.rpc("sync_vip_from_balance");
    const { data, error } = await supabase.rpc("get_full_profile");
    if (error) rpcError(error);
    return { data };
  }

  if (m === "GET" && (path === "/auth/settings" || path === "/site_admin/settings")) {
    const { data, error } = await supabase.from("settings").select("*").eq("id", 1).maybeSingle();
    if (error) rpcError(error);
    return { data };
  }

  if (m === "PATCH" && path === "/auth/update_profile") {
    const session = await requireSession();
    const picture = isUploadFile(payload.profile_picture)
      ? await uploadFile("avatars", payload.profile_picture, `${session.user.id}/`)
      : undefined;
    const patch = {
      username: payload.username,
      email: payload.email,
      phone_number: payload.phone_number,
      first_name: payload.first_name,
      last_name: payload.last_name,
      gender: payload.gender,
    };
    if (picture) patch.profile_picture = picture;
    Object.keys(patch).forEach((k) => patch[k] == null && delete patch[k]);
    const { error } = await supabase.from("profiles").update(patch).eq("id", session.user.id);
    if (error) rpcError(error);
    const profile = await supabase.rpc("get_full_profile");
    if (profile.error) rpcError(profile.error);
    return { data: profile.data };
  }

  if (m === "POST" && path === "/auth/user_change_password") {
    const session = await requireSession();
    const { error: check } = await supabase.auth.signInWithPassword({ email: session.user.email, password: payload.current_password });
    if (check) fail("Current password is incorrect");
    const { error } = await supabase.auth.updateUser({ password: payload.new_password });
    if (error) rpcError(error);
    return { success: true, message: "Password updated successfully" };
  }

  if (m === "POST" && path === "/auth/user_set_transactional_password") {
    await requireSession();
    const next = String(payload.new_password || payload.password || "");
    if (!/^\d{4}$/.test(next)) fail("Withdrawal password must be exactly 4 digits");
    const { data, error } = await supabase.rpc("set_transactional_password", { p_new: next });
    if (error) rpcError(error);
    return data;
  }

  if (m === "POST" && path === "/auth/user_change_transactional_password") {
    const { data, error } = await supabase.rpc("change_transactional_password", {
      p_current: payload.current_password,
      p_new: payload.new_password,
    });
    if (error) rpcError(error);
    return data;
  }

  if (m === "GET" && path === "/site_admin/announcements/active") {
    const session = await supabase.auth.getSession();
    const uid = session.data.session?.user?.id;
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .eq("is_active", true)
      .or(`start_date.is.null,start_date.lte.${now}`)
      .or(`end_date.is.null,end_date.gte.${now}`)
      .order("created_at", { ascending: false })
      .limit(5);
    if (error) rpcError(error);
    let rows = data || [];
    if (uid && rows.length) {
      const { data: seen } = await supabase.from("announcement_seen").select("announcement_id").eq("user_id", uid);
      const seenIds = new Set((seen || []).map((s) => s.announcement_id));
      rows = rows.filter((r) => !seenIds.has(r.id));
    }
    return { success: true, data: rows[0] || null };
  }

  if (m === "POST" && path === "/site_admin/announcements/mark-seen") {
    const session = await requireSession();
    const announcementId = payload.announcement_id;
    await supabase.from("announcement_seen").upsert(
      { user_id: session.user.id, announcement_id: announcementId },
      { onConflict: "user_id,announcement_id" }
    );
    let notification = null;
    const { data: ann } = await supabase
      .from("announcements")
      .select("id, title, message")
      .eq("id", announcementId)
      .maybeSingle();
    if (ann) {
      const { data: created, error: notifErr } = await supabase
        .from("notifications")
        .insert({
          user_id: session.user.id,
          announcement_id: ann.id,
          title: ann.title,
          message: ann.message,
          is_read: false,
        })
        .select("*")
        .maybeSingle();
      if (notifErr && notifErr.code === "23505") {
        const { data: existing } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", session.user.id)
          .eq("announcement_id", announcementId)
          .maybeSingle();
        notification = existing;
      } else if (!notifErr) {
        notification = created;
      }
    }
    return { success: true, message: "Marked as seen", notification };
  }

  if (m === "GET" && path === "/api/packs/active_packs") {
    const { data, error } = await supabase.from("packs").select("*").eq("is_active", true).order("usd_value");
    if (error) rpcError(error);
    return data || [];
  }

  if (m === "GET" && path === "/api/packs") {
    const { data, error } = await supabase.from("packs").select("*").order("usd_value");
    if (error) rpcError(error);
    return { results: data || [] };
  }

  if (m === "POST" && path === "/api/packs") {
    await requireSession();
    const icon = await uploadFile("packs", payload.icon, "icons/");
    const row = {
      name: payload.name,
      usd_value: payload.usd_value || 0,
      daily_missions: payload.daily_missions || 40,
      daily_withdrawals: payload.daily_withdrawals || 1,
      short_description: payload.short_description || "",
      description: payload.description || "",
      payment_bonus: payload.payment_bonus || payload.extra_bonus || 0,
      payment_to_unlock_bonus: payload.payment_to_unlock_bonus || 0,
      number_of_set: payload.number_of_set || 1,
      profit_percentage: payload.profit_percentage || 0.5,
      is_active: true,
    };
    if (icon) row.icon = icon;
    const { error } = await supabase.from("packs").insert(row);
    if (error) rpcError(error);
    return { success: true };
  }

  const packMatch = path.match(/^\/api\/packs\/([^/]+)$/);
  if (packMatch && m === "PATCH") {
    const id = packMatch[1];
    const icon = payload.icon instanceof File ? await uploadFile("packs", payload.icon, "icons/") : undefined;
    const patch = { ...payload };
    delete patch.id;
    delete patch.created_at;
    if (icon) patch.icon = icon;
    else delete patch.icon;
    Object.keys(patch).forEach((k) => {
      if (patch[k] instanceof File) delete patch[k];
    });
    const { error } = await supabase.from("packs").update(patch).eq("id", id);
    if (error) rpcError(error);
    return { success: true };
  }

  if (m === "GET" && path === "/api/products") {
    const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    if (error) rpcError(error);
    return { data: data || [], results: data || [] };
  }

  if (m === "POST" && path === "/api/products") {
    const image = await uploadFile("products", payload.image, "img/");
    const { error } = await supabase.from("products").insert({
      name: payload.name,
      price: payload.price || 0,
      rating_number: payload.rating_number || 5,
      image,
    });
    if (error) rpcError(error);
    return { success: true };
  }

  const productMatch = path.match(/^\/api\/products\/([^/]+)$/);
  if (productMatch && (m === "PATCH" || m === "DELETE")) {
    const id = productMatch[1];
    if (m === "DELETE") {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) rpcError(error);
      return { success: true };
    }
    const image = payload.image instanceof File ? await uploadFile("products", payload.image, "img/") : undefined;
    const patch = { name: payload.name, price: payload.price, rating_number: payload.rating_number };
    if (image) patch.image = image;
    Object.keys(patch).forEach((k) => patch[k] == null && delete patch[k]);
    const { error } = await supabase.from("products").update(patch).eq("id", id);
    if (error) rpcError(error);
    return { success: true };
  }

  if (m === "GET" && path === "/api/games/current-game") {
    await supabase.rpc("ensure_daily_reset");
    const { data, error } = await supabase.rpc("ensure_current_game");
    if (error) fail(error.message, { data: { message: error.message } });
    return { data: await hydrateGameProducts(data) };
  }

  if (m === "POST" && path === "/api/games/play-game") {
    const { data, error } = await supabase.rpc("play_game", {
      p_rating_score: payload.rating_score,
      p_comment: payload.comment || "",
    });
    if (error) rpcError(error);
    return { data: await hydrateGameProducts(data) };
  }

  if (m === "GET" && path === "/api/games/game-record") {
    const session = await requireSession();
    const { data, error } = await supabase
      .from("games")
      .select("*, game_products(products(id, image, name, price))")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });
    if (error) rpcError(error);
    const rows = (data || []).map((g) => ({
      ...g,
      products: (g.game_products || []).map((gp) => gp.products).filter(Boolean),
    }));
    return { data: rows };
  }

  if (m === "GET" && path === "/api/deposits") {
    const session = await requireSession();
    const { data, error } = await supabase.from("deposits").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false });
    if (error) rpcError(error);
    return { data: (data || []).map((d) => ({ ...d, date: d.created_at })) };
  }

  if (m === "POST" && path === "/api/deposits") {
    const session = await requireSession();
    const screenshot = await uploadFile("deposits", payload.screenshot, `${session.user.id}/`);
    const { data, error } = await supabase
      .from("deposits")
      .insert({ user_id: session.user.id, amount: payload.amount, screenshot, status: "Pending" })
      .select()
      .single();
    if (error) rpcError(error);
    const { error: notifErr } = await supabase.from("admin_notifications").insert({
      title: "New deposit",
      message: `A deposit of ${payload.amount} is waiting for review.`,
    });
    if (notifErr) {
      /* user role cannot write admin notifications; deposit still succeeds */
    }
    return { success: true, data, message: "Deposit submitted successfully" };
  }

  if (m === "GET" && path === "/api/withdrawals/withdrawal_history") {
    const session = await requireSession();
    const { data, error } = await supabase.from("withdrawals").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false });
    if (error) rpcError(error);
    return { success: true, data: (data || []).map((d) => ({ ...d, date: d.created_at })) };
  }

  if (m === "POST" && path === "/api/withdrawals/make_withdrawal") {
    const { data, error } = await supabase.rpc("make_withdrawal", {
      p_amount: Number(payload.amount),
      p_password: payload.password,
    });
    if (error) rpcError(error);
    return data;
  }

  if (m === "GET" && path === "/api/payments") {
    const session = await requireSession();
    const profile = await supabase.rpc("get_full_profile");
    const { data } = await supabase.from("payments").select("*").eq("user_id", session.user.id).maybeSingle();
    return {
      success: true,
      data: {
        name: `${profile.data?.first_name || ""} ${profile.data?.last_name || ""}`.trim(),
        phone_number: profile.data?.phone_number || "",
        email_address: profile.data?.email || "",
        wallet: data?.wallet || "",
        exchange: data?.exchange || "",
      },
    };
  }

  if (m === "POST" && path === "/api/payments") {
    const session = await requireSession();
    const { error } = await supabase.from("payments").upsert({
      user_id: session.user.id,
      wallet: payload.wallet,
      exchange: payload.exchange,
    });
    if (error) rpcError(error);
    return { success: true, message: "Payment method saved" };
  }

  if (m === "GET" && path === "/api/notifications") {
    const session = await requireSession();
    const { data, error } = await supabase.from("notifications").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false });
    if (error) rpcError(error);
    return { data: data || [] };
  }

  if (m === "POST" && path === "/api/notifications/mark-read") {
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", payload.notification_id);
    if (error) rpcError(error);
    return { success: true };
  }

  if (m === "POST" && path === "/api/notifications/mark-all-read") {
    const session = await requireSession();
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("user_id", session.user.id);
    if (error) rpcError(error);
    return { success: true };
  }

  if (m === "GET" && path === "/api/events") {
    const { data, error } = await supabase.from("events").select("*").order("created_at", { ascending: false });
    if (error) rpcError(error);
    return { success: true, data: data || [] };
  }

  if (m === "GET" && path === "/site_admin/auth/admin/me") {
    await requireSession();
    const profile = await supabase.rpc("get_full_profile");
    if (profile.error) rpcError(profile.error);
    const dash = await supabase.rpc("admin_dashboard");
    if (dash.error) {
      const fallback = await buildAdminDashboardFallback();
      if (!fallback) rpcError(dash.error);
      return { data: { ...asObject(profile.data), dashboard: fallback } };
    }
    return { data: { ...asObject(profile.data), dashboard: asObject(dash.data) } };
  }

  if (m === "GET" && path === "/site_admin/users") {
    let q = supabase.from("profiles").select("*, wallets(*, packs(*))", { count: "exact" });
    if (params.search) q = q.or(`username.ilike.%${params.search}%,email.ilike.%${params.search}%`);
    const page = Number(params.page || 1);
    const pageSize = Number(params.page_size || 10);
    q = q.range((page - 1) * pageSize, page * pageSize - 1);
    if (params.ordering === "-wallet_commission") q = q.order("commission", { foreignTable: "wallets", ascending: false });
    else if (params.ordering === "-total_games_played") q = q.order("total_games_played", { ascending: false });
    else if (params.ordering === "-total_negative_product") q = q.order("total_negative_product_submitted", { ascending: false });
    else q = q.order("created_at", { ascending: false });
    const { data, error, count } = await q;
    if (error) rpcError(error);
    return { results: (data || []).map(mapUser), count: count || 0 };
  }

  if (m === "POST" && path === "/auth/invitation-codes/generate-code") {
    const session = await requireSession();
    let code = "";
    for (let i = 0; i < 20; i += 1) {
      code = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
      if (code === "0000") continue;
      const { error } = await supabase.from("invitation_codes").insert({ code, created_by: session.user.id, reusable: false });
      if (!error) return { code };
      if (error.code !== "23505") rpcError(error);
    }
    fail("Could not generate a unique invitation code. Please try again.");
  }

  if (m === "GET" && path === "/auth/referral-link") {
    const token = String(params.token || payload.token || "").trim();
    const { data, error } = await supabase.rpc("peek_referral_token", { p_token: token });
    if (error) rpcError(error);
    return data || { valid: false };
  }

  if (m === "GET" && path === "/site_admin/referrals") {
    await requireSession();
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (!isAdmin) fail("Not authorized", { status: 403 });
    const [{ data: links, error: linkErr }, { data: codes, error: codeErr }] = await Promise.all([
      supabase.from("referral_links").select("*").order("created_at", { ascending: false }),
      supabase.from("invitation_codes").select("id, code, reusable, used_by, created_at, created_by").order("created_at", { ascending: false }).limit(50),
    ]);
    if (linkErr) rpcError(linkErr);
    if (codeErr) rpcError(codeErr);
    const usedIds = [...new Set((links || []).map((row) => row.used_by).filter(Boolean))];
    let names = {};
    if (usedIds.length) {
      const { data: profiles } = await supabase.from("profiles").select("id, username").in("id", usedIds);
      names = Object.fromEntries((profiles || []).map((p) => [p.id, p.username]));
    }
    return {
      links: (links || []).map((row) => ({ ...row, used_username: names[row.used_by] || null })),
      codes: codes || [],
    };
  }

  if (m === "POST" && path === "/site_admin/referrals/special-link") {
    const session = await requireSession();
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (!isAdmin) fail("Not authorized", { status: 403 });
    const token = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    const { data, error } = await supabase
      .from("referral_links")
      .insert({ token, created_by: session.user.id })
      .select("*")
      .single();
    if (error) rpcError(error);
    return { success: true, link: data };
  }

  if (m === "POST" && path === "/site_admin/users/toggle_user_active") {
    const { data } = await supabase.from("profiles").select("is_active").eq("id", payload.user_id).single();
    const { error } = await supabase.from("profiles").update({ is_active: !data?.is_active }).eq("id", payload.user_id);
    if (error) rpcError(error);
    return { success: true };
  }

  if (m === "POST" && path === "/site_admin/users/get_user_info") {
    const { data, error } = await supabase
      .from("profiles")
      .select("*, payments(wallet, exchange), wallets(trc_address, balance, on_hold, package_id, packs(name, usd_value))")
      .eq("id", payload.user_id)
      .single();
    if (error) rpcError(error);
    const pay = Array.isArray(data.payments) ? data.payments[0] : data.payments;
    const wallet = Array.isArray(data.wallets) ? data.wallets[0] : data.wallets;
    return {
      username: data.username,
      first_name: data.first_name,
      last_name: data.last_name,
      trc_address: pay?.wallet,
      wallet_address: pay?.wallet,
      phone_number: data.phone_number,
      exchange: pay?.exchange,
      email: data.email,
      referral_code: data.referral_code,
      package_name: wallet?.packs?.name,
      balance: wallet?.balance,
      on_hold: wallet?.on_hold,
      current_number_count: data.current_number_count,
      total_number_can_play: data.total_number_can_play,
    };
  }

  if (m === "POST" && path === "/site_admin/users/toggle-reg-bonus") {
    const { data } = await supabase.from("profiles").select("is_reg_balance_add").eq("id", payload.user_id).single();
    const { error } = await supabase.from("profiles").update({ is_reg_balance_add: !data?.is_reg_balance_add }).eq("id", payload.user_id);
    if (error) rpcError(error);
    return { success: true };
  }

  if (m === "POST" && path === "/site_admin/users/toggle-min-balance") {
    const { data } = await supabase.from("profiles").select("is_min_balance_for_submission_removed").eq("id", payload.user_id).single();
    const { error } = await supabase
      .from("profiles")
      .update({ is_min_balance_for_submission_removed: !data?.is_min_balance_for_submission_removed })
      .eq("id", payload.user_id);
    if (error) rpcError(error);
    return { success: true };
  }

  if (m === "POST" && path === "/site_admin/users/update-login-password") {
    const session = await requireSession();
    const { data: isAdmin, error: adminErr } = await supabase.rpc("is_admin");
    if (adminErr) rpcError(adminErr);
    if (!isAdmin) fail("Not authorized", { status: 403 });
    if (!payload.user_id) fail("User is required");
    if (!payload.password || String(payload.password).length < 6) fail("Password must be at least 6 characters");
    if (!payload.admin_password) fail("Administrator password is required");
    const { data, error } = await supabase.functions.invoke("admin-reset-password", {
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: {
        user_id: payload.user_id,
        password: payload.password,
        admin_password: payload.admin_password,
      },
    });
    if (error) {
      let message = error.message || "Failed to reset password";
      try {
        const body = typeof error.context?.json === "function" ? await error.context.json() : null;
        if (body?.message) message = body.message;
      } catch {
        /* ignore */
      }
      fail(message);
    }
    if (data?.success === false && data?.message) fail(data.message);
    await logAdmin("Reset user login password");
    return { success: true, message: data?.message || "Password updated successfully" };
  }

  if (m === "POST" && path === "/site_admin/users/update-withdrawal-password") {
    const { error } = await supabase.rpc("admin_set_txn_password", {
      p_user_id: payload.user_id,
      p_password: payload.password,
    });
    if (error) rpcError(error);
    await logAdmin("Updated withdrawal password", payload.reason);
    return { success: true };
  }

  if (m === "POST" && path === "/site_admin/users/update-balance") {
    const { error } = await supabase.from("wallets").update({ balance: payload.amount }).eq("user_id", payload.user_id);
    if (error) rpcError(error);
    await supabase.rpc("sync_vip_from_balance", { p_user_id: payload.user_id });
    await logAdmin("Updated balance", payload.reason);
    return { success: true };
  }

  if (m === "POST" && path === "/site_admin/users/create") {
    await requireAdmin();
    const { data, error } = await supabase.rpc("admin_create_user", {
      p_username: payload.username,
      p_email: payload.email,
      p_password: payload.password,
      p_phone: payload.phone_number || payload.phone || null,
      p_first_name: payload.first_name || null,
      p_last_name: payload.last_name || null,
      p_gender: payload.gender || null,
    });
    if (error) rpcError(error);
    await logAdmin("Created user", payload.username);
    return { success: true, data };
  }

  if (m === "POST" && path === "/site_admin/users/update-package") {
    await requireAdmin();
    if (!payload.user_id || !payload.package_id) fail("User and VIP pack are required");
    const { data: pack, error: packErr } = await supabase.from("packs").select("id, daily_missions, name").eq("id", payload.package_id).single();
    if (packErr) rpcError(packErr);
    const { error } = await supabase.from("wallets").update({ package_id: pack.id }).eq("user_id", payload.user_id);
    if (error) rpcError(error);
    if (pack.daily_missions != null) {
      await supabase.from("profiles").update({ total_number_can_play: pack.daily_missions }).eq("id", payload.user_id);
    }
    await logAdmin("Assigned VIP pack", pack.name);
    return { success: true };
  }

  if (m === "POST" && path === "/site_admin/users/update-missions") {
    await requireAdmin();
    const patch = {};
    if (payload.total_number_can_play != null && payload.total_number_can_play !== "") {
      patch.total_number_can_play = Number(payload.total_number_can_play);
    }
    if (payload.current_number_count != null && payload.current_number_count !== "") {
      patch.current_number_count = Number(payload.current_number_count);
    }
    if (!Object.keys(patch).length) fail("Enter remaining or completed missions");
    const { error } = await supabase.from("profiles").update(patch).eq("id", payload.user_id);
    if (error) rpcError(error);
    await logAdmin("Updated missions", payload.reason);
    return { success: true };
  }

  if (m === "POST" && path === "/site_admin/users/update-on-hold") {
    await requireAdmin();
    const { error } = await supabase.from("wallets").update({ on_hold: payload.amount }).eq("user_id", payload.user_id);
    if (error) rpcError(error);
    await logAdmin("Updated on hold", payload.reason);
    return { success: true };
  }

  if (m === "POST" && path === "/site_admin/users/update-profit") {
    const { error } = await supabase.from("profiles").update({ today_profit: payload.amount }).eq("id", payload.user_id);
    if (error) rpcError(error);
    await supabase.from("wallets").update({ commission: payload.amount }).eq("user_id", payload.user_id);
    await logAdmin("Updated profit", payload.reason);
    return { success: true };
  }

  if (m === "POST" && path === "/site_admin/users/update-salary") {
    const { error } = await supabase.from("wallets").update({ salary: payload.amount }).eq("user_id", payload.user_id);
    if (error) rpcError(error);
    await logAdmin("Updated salary", payload.reason);
    return { success: true };
  }

  if (m === "POST" && path === "/site_admin/users/update_credit_score") {
    const { error } = await supabase.from("wallets").update({ credit_score: payload.credit_score }).eq("user_id", payload.user_id);
    if (error) rpcError(error);
    await logAdmin("Updated credit score");
    return { success: true };
  }

  if (m === "POST" && path === "/site_admin/users/reset_user_account") {
    await supabase.from("profiles").update({ current_number_count: 0, today_profit: 0 }).eq("id", payload.user_id);
    await supabase.from("games").delete().eq("user_id", payload.user_id).eq("pending", true);
    await logAdmin("Reset user account");
    return { success: true };
  }

  if (m === "POST" && path === "/site_admin/users/delete-user") {
    const { error } = await supabase.from("profiles").delete().eq("id", payload.user_id);
    if (error) rpcError(error);
    await logAdmin("Deleted user", payload.reason);
    return { success: true };
  }

  if (m === "GET" && path === "/site_admin/deposits") {
    const { data, error } = await supabase.from("deposits").select("*, profiles(username)").order("created_at", { ascending: false });
    if (error) rpcError(error);
    return {
      results: (data || []).map((d) => ({
        ...d,
        username: d.profiles?.username,
        user: { username: d.profiles?.username },
        date: d.created_at,
      })),
    };
  }

  const depStatus = path.match(/^\/site_admin\/deposits\/([^/]+)\/update-status$/);
  if (depStatus && m === "POST") {
    const id = depStatus[1];
    const { data: dep, error: fetchErr } = await supabase.from("deposits").select("*").eq("id", id).single();
    if (fetchErr) rpcError(fetchErr);
    const { error } = await supabase.from("deposits").update({ status: payload.status }).eq("id", id);
    if (error) rpcError(error);
    if (payload.status === "Confirmed" && dep.status !== "Confirmed") {
      const { data: wallet } = await supabase.from("wallets").select("balance").eq("user_id", dep.user_id).single();
      await supabase.from("wallets").update({ balance: Number(wallet?.balance || 0) + Number(dep.amount) }).eq("user_id", dep.user_id);
      await supabase.rpc("sync_vip_from_balance", { p_user_id: dep.user_id });
      const amount = Number(dep.amount || 0).toFixed(2);
      await supabase.from("notifications").insert({
        user_id: dep.user_id,
        title: "Deposit confirmed",
        message: `Your deposit of $${amount} has been confirmed and credited to your wallet.`,
        is_read: false,
      });
    }
    await logAdmin(`Deposit ${payload.status}`, payload.admin_password ? "verified" : "");
    return { success: true };
  }

  if (m === "GET" && path === "/site_admin/withdrawals") {
    const { data, error } = await supabase.from("withdrawals").select("*, profiles(username)").order("created_at", { ascending: false });
    if (error) rpcError(error);
    return {
      results: (data || []).map((d) => ({
        ...d,
        username: d.profiles?.username,
        user: { username: d.profiles?.username },
      })),
    };
  }

  const wdStatus = path.match(/^\/site_admin\/withdrawals\/([^/]+)\/update-status$/);
  if (wdStatus && m === "POST") {
    const { error } = await supabase.from("withdrawals").update({ status: payload.status }).eq("id", wdStatus[1]);
    if (error) rpcError(error);
    await logAdmin(`Withdrawal ${payload.status}`);
    return { success: true };
  }

  if (path === "/site_admin/onholds" && m === "GET") {
    await requireAdmin();
    const { data, error } = await supabase.from("on_holds").select("*").order("minimum_amount");
    if (error) rpcError(error);
    const holds = await supabase.rpc("admin_list_user_holds");
    if (holds.error) rpcError(holds.error);
    const users = Array.isArray(holds.data) ? holds.data : holds.data || [];
    return { data: { results: data || [], users }, results: data || [], users };
  }
  if (path === "/site_admin/user-holds" && m === "GET") {
    await requireAdmin();
    const holds = await supabase.rpc("admin_list_user_holds");
    if (holds.error) rpcError(holds.error);
    const users = Array.isArray(holds.data) ? holds.data : holds.data || [];
    return { data: users, results: users, users };
  }
  if (path === "/site_admin/onholds" && m === "POST") {
    const { error } = await supabase.from("on_holds").insert({
      minimum_amount: payload.minimum_amount || payload.min_amount || 0,
      maximum_amount: payload.maximum_amount || payload.max_amount || 0,
      is_active: payload.is_active !== false,
    });
    if (error) rpcError(error);
    return { success: true };
  }
  const holdMatch = path.match(/^\/site_admin\/onholds\/([^/]+)$/);
  if (holdMatch && m === "PATCH") {
    const { error } = await supabase
      .from("on_holds")
      .update({
        minimum_amount: payload.minimum_amount || payload.min_amount,
        maximum_amount: payload.maximum_amount || payload.max_amount,
        is_active: payload.is_active,
      })
      .eq("id", holdMatch[1]);
    if (error) rpcError(error);
    return { success: true };
  }
  if (holdMatch && m === "DELETE") {
    const { error } = await supabase.from("on_holds").delete().eq("id", holdMatch[1]);
    if (error) rpcError(error);
    return { success: true };
  }

  if (path === "/site_admin/events" && m === "GET") {
    const { data, error } = await supabase.from("events").select("*").order("created_at", { ascending: false });
    if (error) rpcError(error);
    return { results: data || [] };
  }
  if (path === "/site_admin/events" && m === "POST") {
    const image = await uploadFile("events", payload.image, "evt/");
    const { error } = await supabase.from("events").insert({ image });
    if (error) rpcError(error);
    return { success: true };
  }
  const eventMatch = path.match(/^\/site_admin\/events\/([^/]+)$/);
  if (eventMatch && m === "PUT") {
    const image = payload.image instanceof File ? await uploadFile("events", payload.image, "evt/") : undefined;
    if (image) {
      const { error } = await supabase.from("events").update({ image }).eq("id", eventMatch[1]);
      if (error) rpcError(error);
    }
    return { success: true };
  }
  if (eventMatch && m === "DELETE") {
    const { error } = await supabase.from("events").delete().eq("id", eventMatch[1]);
    if (error) rpcError(error);
    return { success: true };
  }

  if (path === "/site_admin/announcements" && m === "GET") {
    const { data, error } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
    if (error) rpcError(error);
    return { results: data || [] };
  }
  if (path === "/site_admin/announcements" && m === "POST") {
    const { error } = await supabase.from("announcements").insert({
      title: payload.title,
      message: payload.message,
      start_date: payload.start_date || null,
      end_date: payload.end_date || null,
      is_active: payload.is_active !== false,
    });
    if (error) rpcError(error);
    return { success: true };
  }
  const annMatch = path.match(/^\/site_admin\/announcements\/([^/]+)$/);
  if (annMatch && m === "PUT") {
    const { error } = await supabase
      .from("announcements")
      .update({
        title: payload.title,
        message: payload.message,
        start_date: payload.start_date || null,
        end_date: payload.end_date || null,
        is_active: payload.is_active,
      })
      .eq("id", annMatch[1]);
    if (error) rpcError(error);
    return { success: true };
  }
  if (annMatch && m === "DELETE") {
    const { error } = await supabase.from("announcements").delete().eq("id", annMatch[1]);
    if (error) rpcError(error);
    return { success: true };
  }

  if (m === "PATCH" && path === "/site_admin/settings/update-settings") {
    const allowed = [
      "percentage_of_sponsors",
      "token_validity_period",
      "registration_bonus",
      "service_availability_start_time",
      "service_availability_end_time",
      "whatsapp_contact",
      "telegram_contact",
      "telegram_username",
      "timezone",
      "minimum_balance_for_submissions",
      "online_chat_url",
      "online_embed_url",
      "erc_address",
      "trc_address",
    ];
    const patch = {};
    allowed.forEach((k) => {
      if (payload[k] != null) patch[k] = payload[k];
    });
    const { error } = await supabase.from("settings").update(patch).eq("id", 1);
    if (error) rpcError(error);
    return { success: true };
  }

  if (m === "POST" && path === "/site_admin/settings/update-video") {
    const video = await uploadFile("videos", payload.video, "home/");
    const { error } = await supabase.from("settings").update({ video }).eq("id", 1);
    if (error) rpcError(error);
    return { success: true };
  }

  if (path === "/site_admin/negative-users" && m === "GET") {
    await requireAdmin();
    const { data, error } = await supabase
      .from("negative_users")
      .select("*, profiles(username, today_profit, current_number_count, total_number_can_play, last_connection)")
      .order("id", { ascending: false });
    if (error) rpcError(error);
    const ids = (data || []).map((r) => r.user_id).filter(Boolean);
    let wallets = [];
    if (ids.length) {
      const wres = await supabase.from("wallets").select("user_id, balance, on_hold, salary").in("user_id", ids);
      wallets = wres.data || [];
    }
    const walletByUser = Object.fromEntries(wallets.map((w) => [w.user_id, w]));
    const holds = await supabase.rpc("admin_list_user_holds");
    const holdRows = Array.isArray(holds.data) ? holds.data : [];
    holdRows.forEach((h) => {
      walletByUser[h.user_id] = { ...(walletByUser[h.user_id] || {}), ...h };
    });
    return {
      results: (data || []).map((r) => {
        const profile = r.profiles || {};
        const wallet = walletByUser[r.user_id] || {};
        return {
          ...r,
          username: profile.username,
          user: { username: profile.username, id: r.user_id },
          count: r.number_of_negative_products,
          rank_of_appearance: r.rank,
          today_profit: profile.today_profit,
          current_number_count: profile.current_number_count,
          total_number_can_play: profile.total_number_can_play,
          last_connection: profile.last_connection,
          balance: wallet.balance,
          on_hold: wallet.on_hold,
          on_hold_balance: wallet.on_hold,
          salary: wallet.salary,
          is_negative: r.is_active !== false,
        };
      }),
    };
  }
  if (path === "/site_admin/negative-users" && m === "POST") {
    await requireAdmin();
    const { data, error } = await supabase.rpc("admin_upsert_negative_user", {
      p_user_id: payload.user_id,
      p_range_min: Number(payload.range_min),
      p_range_max: Number(payload.range_max),
      p_negative_products: Number(payload.number_of_negative_products || payload.count),
      p_rank: Number(payload.rank || payload.rank_of_appearance),
    });
    if (error) rpcError(error);
    await supabase.rpc("admin_clear_pending_game", { p_user_id: payload.user_id });
    await logAdmin("Added negative user");
    return { success: true, data };
  }
  const negToggle = path.match(/^\/site_admin\/negative-users\/([^/]+)\/toggle$/);
  if (negToggle && m === "POST") {
    await requireAdmin();
    const active = payload.is_active === true || payload.is_active === "true";
    const { data, error } = await supabase.rpc("admin_toggle_negative_user", {
      p_id: negToggle[1],
      p_active: active,
    });
    if (error) rpcError(error);
    if (data?.user_id) await supabase.rpc("admin_clear_pending_game", { p_user_id: data.user_id });
    await logAdmin(active ? "Enabled negative user" : "Disabled negative user");
    return { success: true, data };
  }
  const negMatch = path.match(/^\/site_admin\/negative-users\/([^/]+)$/);
  if (negMatch && m === "PATCH") {
    await requireAdmin();
    const { data, error } = await supabase.rpc("admin_upsert_negative_user", {
      p_user_id: payload.user_id,
      p_range_min: Number(payload.range_min),
      p_range_max: Number(payload.range_max),
      p_negative_products: Number(payload.number_of_negative_products || payload.count),
      p_rank: Number(payload.rank || payload.rank_of_appearance),
    });
    if (error) rpcError(error);
    await supabase.rpc("admin_clear_pending_game", { p_user_id: payload.user_id });
    await logAdmin("Updated negative user");
    return { success: true, data };
  }
  if (negMatch && m === "DELETE") {
    await requireAdmin();
    const { error } = await supabase.rpc("admin_delete_negative_user", { p_id: negMatch[1] });
    if (error) rpcError(error);
    await logAdmin("Deleted negative user");
    return { success: true };
  }

  if (m === "GET" && path === "/api/admin-notifications") {
    const { data, error } = await supabase.from("admin_notifications").select("*").order("created_at", { ascending: false });
    if (error) rpcError(error);
    return { data: data || [], results: data || [] };
  }
  if (m === "POST" && path === "/api/admin-notifications/mark-all-read") {
    const { error } = await supabase.from("admin_notifications").update({ is_read: true }).eq("is_read", false);
    if (error) rpcError(error);
    return { success: true };
  }

  if (m === "GET" && path === "/api/admin-logs") {
    const { data, error } = await supabase.from("admin_logs").select("*").order("created_at", { ascending: false });
    if (error) rpcError(error);
    return { results: data || [] };
  }

  fail(`Unknown endpoint: ${m} ${path}`);
}

async function logAdmin(action, reason = "") {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user?.id;
  if (!uid) return;
  const { data: prof } = await supabase.from("profiles").select("username").eq("id", uid).maybeSingle();
  await supabase.from("admin_logs").insert({
    admin_id: uid,
    username: prof?.username,
    action,
    reason,
  });
}

export function createApi() {
  const send = async (method, url, body, config = {}) => {
    try {
      const data = await handle(method, url, body, config.params || {});
      return { data, status: 200 };
    } catch (error) {
      if (!error.response) {
        error.response = { status: 500, data: { message: error.message } };
      }
      throw error;
    }
  };
  const api = {
    get: (url, config) => send("GET", url, null, config),
    post: (url, body, config) => send("POST", url, body, config),
    patch: (url, body, config) => send("PATCH", url, body, config),
    put: (url, body, config) => send("PUT", url, body, config),
    delete: (url, config) => send("DELETE", url, null, config),
    interceptors: {
      request: { use: () => {} },
      response: { use: () => {} },
    },
  };
  return api;
}

export { handle };
