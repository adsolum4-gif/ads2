import { createSlice } from "@reduxjs/toolkit";
import { api } from "../../api/client";
import { toast } from "sonner";

function noticeKey(item) {
  if (item?.title === "Deposit confirmed" || item?.title === "Special product") {
    return `${item.title}|${item.message || ""}`;
  }
  return item?.id || `${item?.title || ""}|${item?.message || ""}|${item?.created_at || ""}`;
}

function uniqueNotices(list) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const key = noticeKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

const notificationsSlice = createSlice({
  name: "notifications",
  initialState: { notifications: [], isLoading: false },
  reducers: {
    setNotifications(state, action) {
      const list = Array.isArray(action.payload) ? action.payload : [];
      state.notifications = uniqueNotices(list);
      state.isLoading = false;
    },
    prependNotification(state, action) {
      const item = action.payload;
      if (!item?.id) return;
      if (state.notifications.some((n) => n.id === item.id || noticeKey(n) === noticeKey(item))) return;
      state.notifications = [item, ...state.notifications];
    },
    setLoading(state, action) {
      state.isLoading = action.payload;
    },
  },
});

export const { setNotifications, prependNotification, setLoading } = notificationsSlice.actions;

export const fetchNotifications =
  (silent = false) =>
  async (dispatch) => {
    if (!silent) dispatch(setLoading(true));
    try {
      const { data } = await api.get("/api/notifications/");
      const list = data.data || data.results || data;
      dispatch(setNotifications(Array.isArray(list) ? list : []));
    } catch {
      if (!silent) dispatch(setNotifications([]));
    }
  };

export const markNotificationRead = (id) => async (dispatch, getState) => {
  try {
    await api.post("/api/notifications/mark-read/", { notification_id: id });
    const current = getState().notifications.notifications.map((item) =>
      item.id === id ? { ...item, is_read: true } : item
    );
    dispatch(setNotifications(current));
    toast.success("Marked read successfully");
  } catch {
    toast.error("Failed to mark notification as read.");
  }
};

export const markAllNotificationsRead = () => async (dispatch, getState) => {
  try {
    await api.post("/api/notifications/mark-all-read/");
    const current = getState().notifications.notifications.map((item) => ({ ...item, is_read: true }));
    dispatch(setNotifications(current));
  } catch {
    toast.error("Failed to mark all as read.");
  }
};

export default notificationsSlice.reducer;
