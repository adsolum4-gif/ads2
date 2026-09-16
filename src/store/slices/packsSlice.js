import { createSlice } from "@reduxjs/toolkit";
import { api } from "../../api/client";

const packsSlice = createSlice({
  name: "packs",
  initialState: { packs: [], isLoading: false, error: null },
  reducers: {
    fetchPacksStart(state) {
      state.isLoading = true;
      state.error = null;
    },
    fetchPacksSuccess(state, action) {
      state.isLoading = false;
      state.packs = action.payload;
    },
    fetchPacksFailure(state, action) {
      state.isLoading = false;
      state.error = action.payload;
    },
  },
});

export const { fetchPacksStart, fetchPacksSuccess, fetchPacksFailure } = packsSlice.actions;

export const fetchPacks = () => async (dispatch) => {
  dispatch(fetchPacksStart());
  try {
    const { data } = await api.get("/api/packs/active_packs/");
    dispatch(fetchPacksSuccess(data));
    return { success: true, data };
  } catch (error) {
    const message = error.response?.data?.message || "Failed to fetch packs.";
    dispatch(fetchPacksFailure(message));
    return { success: false, message };
  }
};

export default packsSlice.reducer;
