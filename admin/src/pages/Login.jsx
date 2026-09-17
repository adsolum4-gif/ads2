import { useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CircularProgress } from "@mui/material";
import { FaCheckCircle } from "react-icons/fa";
import PasswordInput from "../components/PasswordInput";
import { api, unwrap, showError } from "../api/client";
import { endpoints } from "../api/endpoints";
import { setUser } from "../store";

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const userRef = useRef();
  const passRef = useRef();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    const username = userRef.current.value;
    const password = passRef.current.value;
    if (!username || !password) return;
    setLoading(true);
    try {
      const { data } = await api.post(endpoints.ADMIN_LOGIN, {
        username_or_email: username,
        password,
      });
      const payload = unwrap({ data });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        dispatch(
          setUser({
            access_token: payload.access || payload.access_token,
            refresh_token: payload.refresh || payload.refresh_token,
            ...payload,
          })
        );
        navigate("/admin/home");
      }, 2000);
    } catch (err) {
      showError(err, "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#edded34d] relative">
      <div className="mb-8 text-center">
        <img src="/assets/logo-light-D-kgBesC.png" alt="Adsterra Logo" className="h-20 mx-auto" />
      </div>
      <div className="w-full max-w-lg p-8 bg-white rounded-lg shadow-lg">
        <h5 className="mb-8 text-xl font-semibold text-center text-gray-700">Sign in to continue to Adsterra</h5>
        <form className="space-y-6" onSubmit={onSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Login / Email</label>
            <input ref={userRef} type="text" id="email" placeholder="Login / Email" className="block w-full p-3 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" required />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <PasswordInput ref={passRef} id="password" placeholder="Enter password" required className="block p-3 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" />
          </div>
          <div className="flex items-center">
            <input type="checkbox" id="remember" className="custom-checkbox" />
            <label htmlFor="remember" className="ml-2 text-sm font-medium text-gray-700">Remember me</label>
          </div>
          <button type="submit" className="flex items-center justify-center w-full gap-2 py-3 font-semibold text-white transition duration-200 bg-red-600 rounded-md hover:bg-red-500">
            {loading && <CircularProgress size={18} sx={{ color: "white" }} />}
            Log In
          </button>
        </form>
      </div>
      {success && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="fixed inset-0 z-20 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-xs p-6 text-center bg-white rounded-lg shadow-lg">
            <FaCheckCircle className="mx-auto mb-4 text-5xl text-green-500" />
            <h2 className="text-xl font-semibold text-gray-800">Login Successful!</h2>
            <p className="mt-2 mb-4 text-gray-600">You have successfully logged in.</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
