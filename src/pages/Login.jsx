import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { FaCheckCircle } from "react-icons/fa";
import { authApi, announcementApi } from "../api/client";
import { loginSuccess, setUserProfile } from "../store/slices/authSlice";
import { fetchProfileSuccess } from "../store/slices/profileSlice";
import { fetchNotifications, prependNotification } from "../store/slices/notificationsSlice";
import AnnouncementModal from "../components/AnnouncementModal";
import PasswordInput from "../components/PasswordInput";
import { Spinner } from "../components/Loader";
import { fadeIn } from "../utils/motion";

const fieldCls =
  "mt-1.5 block w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-red-500/30 focus:border-red-500 transition-all";

export default function Login() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [announcement, setAnnouncement] = useState(null);
  const [showAnnouncement, setShowAnnouncement] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    const errors = [];
    if (!username.trim()) errors.push("Username is required.");
    if (!password.trim()) errors.push("Password is required.");
    if (errors.length) {
      errors.forEach((msg) => toast.error(msg));
      return;
    }
    setLoading(true);
    try {
      const result = await authApi.login({ username, password });
      if (!result.success) throw new Error(result.message || "Login failed. Please check your credentials.");
      dispatch(loginSuccess({ token: result.access_token, refreshToken: result.refresh_token }));
      if (result.data) {
        dispatch(setUserProfile(result.data));
        dispatch(fetchProfileSuccess(result.data));
      } else {
        const profile = await authApi.fetchProfile();
        if (profile.success) dispatch(fetchProfileSuccess(profile.data));
      }
      await dispatch(fetchNotifications());
      setSuccess(true);
      const active = await announcementApi.getActiveAnnouncement();
      setTimeout(() => {
        setSuccess(false);
        if (active.success && active.data) {
          setAnnouncement(active.data);
          setShowAnnouncement(true);
        } else {
          navigate("/home");
        }
      }, 2000);
    } catch (error) {
      toast.error(error.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const closeAnnouncement = async () => {
    if (announcement?.id) {
      const result = await announcementApi.markAnnouncementAsSeen(announcement.id);
      if (result.notification) dispatch(prependNotification(result.notification));
      else await dispatch(fetchNotifications(true));
    }
    setShowAnnouncement(false);
    navigate("/home");
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen overflow-hidden bg-[#0f0a0a]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(199,8,30,0.28),_transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(80,10,20,0.45),_#0f0a0a)]" />
      <div className="absolute -top-24 -right-16 w-80 h-80 rounded-full bg-red-600/20 blur-3xl" />
      <div className="absolute -bottom-24 -left-16 w-80 h-80 rounded-full bg-red-900/30 blur-3xl" />
      <motion.div
        initial={fadeIn("up").initial}
        animate={fadeIn("up", 2).animate}
        className="relative z-10 w-full max-w-md mx-4 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-black/30 p-8 border border-white/60"
      >
        <img src="/assets/logo-light-D-kgBesC.png" alt="Adsterra" className="h-16 mx-auto mb-6 object-contain" />
        <h1 className="text-2xl font-bold text-center text-gray-900 tracking-tight">Welcome back</h1>
        <p className="text-sm text-gray-500 text-center mt-1 mb-7">Sign in to continue to Adsterra</p>
        <form className="space-y-5" onSubmit={onSubmit}>
          <div>
            <label htmlFor="username" className="block text-sm font-semibold text-gray-700">
              Username / Email
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username / Email"
              autoComplete="username"
              className={fieldCls}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
              Password
            </label>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              className={fieldCls}
            />
          </div>
          <p className="text-gray-500 text-sm">
            Forgot username/password?{" "}
            <a href="/contact" className="text-red-600 font-semibold hover:text-red-700">
              Reset
            </a>
          </p>
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 rounded-xl font-semibold flex justify-center items-center gap-2 transition-all duration-200 ${
              loading
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/25 hover:-translate-y-0.5"
            }`}
          >
            {loading ? (
              <>
                <Spinner size="md" color="white" />
                <span>Signing in...</span>
              </>
            ) : (
              "Log in"
            )}
          </button>
        </form>
        <p className="text-gray-500 text-sm text-center mt-6">
          Don&apos;t have an account?{" "}
          <a href="/login/signup" className="text-red-600 font-semibold hover:text-red-700">
            Create now
          </a>
        </p>
      </motion.div>
      {success && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-20"
        >
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-xs text-center">
            <FaCheckCircle className="text-emerald-500 text-5xl mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900">Login successful</h2>
            <p className="text-gray-500 mt-2">You have successfully logged in.</p>
          </div>
        </motion.div>
      )}
      {showAnnouncement && <AnnouncementModal announcement={announcement} onClose={closeAnnouncement} />}
    </div>
  );
}
