import { createSlice } from "@reduxjs/toolkit";
import { api, authApi } from "../../api/client";
import { fetchProfileSuccess } from "./profileSlice";

const productsSlice = createSlice({
  name: "products",
  initialState: {
    products: [],
    currentGame: null,
    gameRecords: [],
    isLoading: false,
    isLoading_current: false,
  },
  reducers: {
    setProducts(state, action) {
      state.products = action.payload || [];
      state.isLoading = false;
    },
    setCurrentGame(state, action) {
      state.currentGame = action.payload;
      state.isLoading_current = false;
    },
    setGameRecords(state, action) {
      state.gameRecords = action.payload || [];
      state.isLoading = false;
    },
    setLoading(state, action) {
      state.isLoading = action.payload;
    },
    setCurrentLoading(state, action) {
      state.isLoading_current = action.payload;
    },
  },
});

export const { setProducts, setCurrentGame, setGameRecords, setLoading, setCurrentLoading } =
  productsSlice.actions;

export const fetchProducts = () => async (dispatch) => {
  dispatch(setLoading(true));
  try {
    const { data } = await api.get("/api/products/");
    const list = Array.isArray(data) ? data : data.data || data.results || [];
    dispatch(setProducts(list));
    return { success: true, data: list };
  } catch (error) {
    dispatch(setProducts([]));
    return { success: false, message: error.response?.data?.message || "Failed to fetch products." };
  }
};

export const fetchCurrentGame = () => async (dispatch) => {
  dispatch(setCurrentLoading(true));
  try {
    const { data } = await api.get("/api/games/current-game/");
    const game = data.data || data || null;
    dispatch(setCurrentGame(game));
    return { success: true, data: game };
  } catch (error) {
    dispatch(setCurrentGame(null));
    return {
      success: false,
      message: error.response?.data?.message || error.message || "Failed to load this task.",
    };
  }
};

export const playGame = (ratingScore, comment) => async (dispatch) => {
  dispatch(setLoading(true));
  try {
    const { data } = await api.post("/api/games/play-game/", {
      rating_score: ratingScore,
      comment,
    });
    const profile = await authApi.fetchProfile();
    if (profile.success) {
      dispatch(fetchProfileSuccess(profile.data));
    }
    dispatch(setCurrentGame(data.data || data || null));
    dispatch(setLoading(false));
    return { success: true, data: data.data || null };
  } catch (error) {
    dispatch(setLoading(false));
    return { success: false, message: error.response?.data?.message || "Failed to submit the game." };
  }
};

export const fetchGameRecords = () => async (dispatch) => {
  dispatch(setLoading(true));
  try {
    const { data } = await api.get("/api/games/game-record/");
    dispatch(setGameRecords(data.data || []));
    return { success: true };
  } catch {
    dispatch(setGameRecords([]));
    return { success: false };
  }
};

export default productsSlice.reducer;
