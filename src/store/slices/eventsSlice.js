import { createSlice } from "@reduxjs/toolkit";
import { api } from "../../api/client";

const eventsSlice = createSlice({
  name: "event",
  initialState: { events: [], isLoading: false, error: null },
  reducers: {
    fetchEventsStart(state) {
      state.isLoading = true;
      state.error = null;
    },
    fetchEventsSuccess(state, action) {
      state.isLoading = false;
      state.events = action.payload || [];
    },
    fetchEventsFailure(state, action) {
      state.isLoading = false;
      state.error = action.payload;
    },
  },
});

export const { fetchEventsStart, fetchEventsSuccess, fetchEventsFailure } = eventsSlice.actions;

export const fetchEvents = () => async (dispatch) => {
  dispatch(fetchEventsStart());
  try {
    const { data } = await api.get("/api/events/");
    if (data.success) dispatch(fetchEventsSuccess(data.data));
    else dispatch(fetchEventsFailure(data.message || "Failed to fetch events."));
  } catch (error) {
    dispatch(fetchEventsFailure(error.response?.data?.message || "An error occurred while fetching events."));
  }
};

export default eventsSlice.reducer;
