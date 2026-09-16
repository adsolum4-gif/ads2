import { createSlice } from "@reduxjs/toolkit";
import { api } from "../../api/client";

const paymentsSlice = createSlice({
  name: "payments",
  initialState: { data: null, isLoading: false },
  reducers: {
    setPaymentLoading(state) {
      state.isLoading = true;
    },
    setPaymentData(state, action) {
      state.data = action.payload;
      state.isLoading = false;
    },
    setPaymentFailure(state) {
      state.isLoading = false;
    },
  },
});

export const { setPaymentLoading, setPaymentData, setPaymentFailure } = paymentsSlice.actions;

export const fetchPaymentMethod = () => async (dispatch) => {
  dispatch(setPaymentLoading());
  try {
    const { data } = await api.get("/api/payments/");
    if (data.success) {
      dispatch(setPaymentData(data.data));
      return { success: true, data: data.data };
    }
    dispatch(setPaymentFailure());
    return { success: false };
  } catch {
    dispatch(setPaymentFailure());
    return { success: false };
  }
};

export const postPaymentMethod = (payload) => async (dispatch) => {
  dispatch(setPaymentLoading());
  try {
    const { data } = await api.post("/api/payments/", payload);
    dispatch(setPaymentFailure());
    return { success: !!data.success, message: data.message };
  } catch (error) {
    dispatch(setPaymentFailure());
    return { success: false, message: error.response?.data?.message };
  }
};

export default paymentsSlice.reducer;
