import { createSlice } from "@reduxjs/toolkit";
import { api } from "../../api/client";
import { toast } from "sonner";

const withdrawalsSlice = createSlice({
  name: "withdrawals",
  initialState: { history: [], isLoading: false, isSubmitting: false },
  reducers: {
    setHistory(state, action) {
      state.history = action.payload || [];
      state.isLoading = false;
    },
    setLoading(state, action) {
      state.isLoading = action.payload;
    },
    setSubmitting(state, action) {
      state.isSubmitting = action.payload;
    },
  },
});

export const { setHistory, setLoading, setSubmitting } = withdrawalsSlice.actions;

export const fetchWithdrawals = () => async (dispatch) => {
  dispatch(setLoading(true));
  try {
    const { data } = await api.get("/api/withdrawals/withdrawal_history/");
    dispatch(setHistory(data.success ? data.data : data.data || []));
  } catch {
    dispatch(setHistory([]));
  }
};

export const makeWithdrawal = (payload) => async (dispatch) => {
  dispatch(setSubmitting(true));
  try {
    const { data } = await api.post("/api/withdrawals/make_withdrawal/", payload);
    dispatch(setSubmitting(false));
    if (data.success) {
      toast.success(data.message || "Withdrawal request successful.");
      return { success: true, message: data.message };
    }
    return { success: false, message: data.message || "Failed to make withdrawal." };
  } catch (error) {
    dispatch(setSubmitting(false));
    return { success: false, message: error.response?.data?.message || "An error occurred while making withdrawal." };
  }
};

export default withdrawalsSlice.reducer;
