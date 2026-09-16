import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  user: null,
  isLoading: false,
  isPasswordLoading: false,
  error: null,
  success: null,
  profilePicture: null,
  imagePreview: null,
  showWelcome: true,
};

const profileSlice = createSlice({
  name: "profile",
  initialState,
  reducers: {
    fetchProfileStart(state) {
      state.isLoading = true;
      state.error = null;
    },
    fetchProfileSuccess(state, action) {
      state.isLoading = false;
      state.user = action.payload;
      state.profilePicture = action.payload?.profile_picture || null;
    },
    fetchProfileFailure(state, action) {
      state.isLoading = false;
      state.error = action.payload;
    },
    updateProfileSuccess(state, action) {
      state.isLoading = false;
      state.user = { ...state.user, ...action.payload };
      state.profilePicture = action.payload?.profile_picture || state.profilePicture;
      state.success = "Profile updated successfully.";
    },
    setImagePreview(state, action) {
      state.imagePreview = action.payload;
    },
    toggleWelcomeState(state) {
      state.showWelcome = !state.showWelcome;
    },
    setWelcomeState(state, action) {
      state.showWelcome = action.payload;
    },
  },
});

export const {
  fetchProfileStart,
  fetchProfileSuccess,
  fetchProfileFailure,
  updateProfileSuccess,
  setImagePreview,
  toggleWelcomeState,
  setWelcomeState,
} = profileSlice.actions;

export default profileSlice.reducer;
