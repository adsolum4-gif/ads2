import { createSlice } from "@reduxjs/toolkit";
import { api } from "../../api/client";
import { toast } from "sonner";

const notificationsSlice = createSlice({
  name: "notifications",
  initialState: { notifications: [], isLoading: false },
  reducers: {
    setNotifications(state, action) {
      state.notifications = action.payload || [];
      state.isLoading = false;
    },
    setLoading(state, action) {
      state.isLoading = action.payload;
    },
  },
});

export const { setNotifications, setLoading } = notificationsSlice.actions;

export const fetchNotifications = () => async (dispatch) => {
  dispatch(setLoading(true));
  try {
    const { data } = await api.get("/api/notifications/");
    dispatch(setNotifications(data.data || data));
  } catch {
    dispatch(setNotifications([]));
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
