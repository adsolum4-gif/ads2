import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import profileReducer from "./slices/profileSlice";
import packsReducer from "./slices/packsSlice";
import notificationsReducer from "./slices/notificationsSlice";
import depositsReducer from "./slices/depositsSlice";
import withdrawalsReducer from "./slices/withdrawalsSlice";
import productsReducer from "./slices/productsSlice";
import paymentsReducer from "./slices/paymentsSlice";
import eventsReducer from "./slices/eventsSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    profile: profileReducer,
    packs: packsReducer,
    notifications: notificationsReducer,
    deposits: depositsReducer,
    withdrawals: withdrawalsReducer,
    products: productsReducer,
    payments: paymentsReducer,
    event: eventsReducer,
  },
});
