import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import Loader from "../components/Loader";
import { refreshAccessToken, authApi } from "../api/client";
import { loginSuccess } from "../store/slices/authSlice";
import { fetchProfileSuccess } from "../store/slices/profileSlice";

export default function Splash() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    (async () => {
      if (localStorage.getItem("accessToken")) {
        try {
          const refreshed = await refreshAccessToken();
          if (refreshed.success) {
            dispatch(loginSuccess({
              token: localStorage.getItem("accessToken"),
              refreshToken: localStorage.getItem("refreshToken"),
            }));
            const profile = await authApi.fetchProfile();
            if (profile.success) dispatch(fetchProfileSuccess(profile.data));
            navigate("/home");
          } else {
            toast.error("Session expired. Please log in.");
            navigate("/login");
          }
        } catch {
          toast.error("An error occurred. Please log in again.");
          navigate("/login");
        }
      } else {
        navigate("/login");
      }
    })();
  }, [dispatch, navigate]);

  return <Loader />;
}
