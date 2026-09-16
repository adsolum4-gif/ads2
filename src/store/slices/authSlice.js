import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isAuthenticated: !!localStorage.getItem("accessToken"),
  token: localStorage.getItem("accessToken") || null,
  refreshToken: localStorage.getItem("refreshToken") || null,
  user: null,
  wallet: null,
  settings: null,
  error: null,
  registrationSuccess: false,
  sessionExpired: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginSuccess(state, action) {
      state.isAuthenticated = true;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.error = null;
      state.sessionExpired = false;
    },
    setUserProfile(state, action) {
      state.user = action.payload.userData || action.payload;
      state.wallet = action.payload.walletData || action.payload?.wallet || null;
    },
    loginFailure(state, action) {
      state.isAuthenticated = false;
      state.token = null;
      state.refreshToken = null;
      state.user = null;
      state.wallet = null;
      state.error = action.payload;
    },
    logout(state) {
      state.isAuthenticated = false;
      state.token = null;
      state.refreshToken = null;
      state.user = null;
      state.wallet = null;
      state.settings = null;
      state.error = null;
      state.sessionExpired = false;
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    },
    tokenRefreshed(state, action) {
      state.token = action.payload.token;
      localStorage.setItem("accessToken", state.token);
    },
    fetchSettingsStart(state) {
      state.error = null;
    },
    fetchSettingsSuccess(state, action) {
      state.settings = action.payload;
    },
    fetchSettingsFailure(state, action) {
      state.error = action.payload;
    },
  },
});

export const {
  loginSuccess,
  setUserProfile,
  loginFailure,
  logout,
  tokenRefreshed,
  fetchSettingsStart,
  fetchSettingsSuccess,
  fetchSettingsFailure,
} = authSlice.actions;

export default authSlice.reducer;
