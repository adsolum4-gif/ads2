import { createSlice } from "@reduxjs/toolkit";
import { api } from "../../api/client";

const depositsSlice = createSlice({
  name: "deposits",
  initialState: { deposits: [], isSubmitting: false },
  reducers: {
    setDeposits(state, action) {
      state.deposits = action.payload || [];
    },
    setSubmitting(state, action) {
      state.isSubmitting = action.payload;
    },
  },
});

export const { setDeposits, setSubmitting } = depositsSlice.actions;

export const fetchDeposits = () => async (dispatch) => {
  try {
    const { data } = await api.get("/api/deposits/");
    dispatch(setDeposits(data.data || data || []));
    return { success: true };
  } catch (error) {
    return { success: false, message: error.response?.data?.message || "Failed to fetch deposits." };
  }
};

export const submitDeposit = (formData) => async (dispatch) => {
  dispatch(setSubmitting(true));
  try {
    const { data } = await api.post("/api/deposits/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    dispatch(setSubmitting(false));
    return { success: true, data: data.data, message: data.message };
  } catch (error) {
    dispatch(setSubmitting(false));
    return { success: false, message: error.response?.data || "An unexpected error occurred." };
  }
};

export default depositsSlice.reducer;
