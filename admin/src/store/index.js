import { configureStore, createSlice } from "@reduxjs/toolkit";

const saved = (() => {
  try {
    return JSON.parse(localStorage.getItem("adminUser") || "null");
  } catch {
    return null;
  }
})();

const userSlice = createSlice({
  name: "userSlice",
  initialState: { user: saved, sidebarCollapsed: false },
  reducers: {
    setUser(state, action) {
      state.user = action.payload;
      localStorage.setItem("adminUser", JSON.stringify(action.payload));
    },
    clearUser(state) {
      state.user = null;
      localStorage.removeItem("adminUser");
    },
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebar(state, action) {
      state.sidebarCollapsed = action.payload;
    },
  },
});

export const { setUser, clearUser, toggleSidebar, setSidebar } = userSlice.actions;

export const store = configureStore({
  reducer: { userSlice: userSlice.reducer },
});
