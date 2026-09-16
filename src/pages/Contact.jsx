import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { FaHeadset, FaWhatsapp, FaTelegram } from "react-icons/fa";
import { MdSupportAgent } from "react-icons/md";
import BackButton from "../components/BackButton";
import Loader from "../components/Loader";
import { authApi } from "../api/client";
import { fetchSettingsStart, fetchSettingsSuccess, fetchSettingsFailure } from "../store/slices/authSlice";

export default function Contact() {
  const settings = useSelector((s) => s.auth.settings);
  const dispatch = useDispatch();

  useEffect(() => {
    (async () => {
      if (!settings) {
        dispatch(fetchSettingsStart());
        const result = await authApi.fetchSettings();
        if (result.success) dispatch(fetchSettingsSuccess(result.data));
        else {
          dispatch(fetchSettingsFailure(result.message));
          toast.error(result.message || "Failed to load profile.");
        }
      }
    })();
  }, [dispatch, settings]);

  const open = (url) => {
    if (url) window.open(url, "_blank");
    else toast.error("Unable to navigate. URL is invalid.");
  };

  if (!settings) return <Loader />;

  return (
    <div className="flex flex-col items-center justify-center mt-10 md:mb-2 mb-52 text-gray-800">
      <div className="w-full">
        <BackButton />
      </div>
      <div className="text-center mb-10">
        <div className="flex flex-col items-center">
          <img src="/assets/logo-light-D-kgBesC.png" alt="Adsterra Logo" className="w-24 mb-4" />
          <MdSupportAgent className="text-6xl text-gray-300 mb-4" />
        </div>
        <h1 className="text-2xl font-bold text-gray-700">Welcome to Customer Service</h1>
        <p className="text-gray-600 mt-2">We're here to provide you with all your services, needs, and inquiries or issues 24/7.</p>
      </div>
      <div className="bg-white p-8 rounded-lg shadow-md w-80 text-center">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Choose a Support Option</h2>
        <div className="space-y-4">
          <button
            onClick={() => settings.online_chat_url && open(settings.online_chat_url)}
            className="w-full bg-red-500 text-white py-2 rounded-full flex items-center justify-center gap-2 hover:bg-red-600"
          >
            <FaHeadset /> Online Chat
          </button>
          <button
            onClick={() => {
              const phone = settings.whatsapp_contact?.replace(/[^\d]/g, "");
              if (phone) open(`https://wa.me/${phone}`);
            }}
            className="w-full bg-green-500 text-white py-2 rounded-full flex items-center justify-center gap-2 hover:bg-green-600"
          >
            <FaWhatsapp /> WhatsApp Chat
          </button>
          <button
            onClick={() => {
              const user = settings.telegram_username?.replace("@", "");
              if (user) open(`https://t.me/${user}`);
            }}
            className="w-full bg-blue-500 text-white py-2 rounded-full flex items-center justify-center gap-2 hover:bg-blue-600"
          >
            <FaTelegram /> Telegram Chat
          </button>
        </div>
      </div>
    </div>
  );
}
