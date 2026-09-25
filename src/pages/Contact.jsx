import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { FaHeadset, FaWhatsapp, FaTelegram } from "react-icons/fa";
import { MdSupportAgent } from "react-icons/md";
import BackButton from "../components/BackButton";
import Loader from "../components/Loader";
import { authApi } from "../api/client";
import { fetchSettingsStart, fetchSettingsSuccess, fetchSettingsFailure } from "../store/slices/authSlice";
import { normalizeOnlineChatUrl, telegramChatUrl, whatsappChatUrl } from "@shared/contactLinks";

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

  const open = (url, missingMessage) => {
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    else toast.error(missingMessage || "This contact option is not available yet.");
  };

  if (!settings) return <Loader />;

  const onlineUrl = normalizeOnlineChatUrl(settings.online_chat_url);
  const whatsappUrl = whatsappChatUrl(settings.whatsapp_contact);
  const telegramUrl = telegramChatUrl(settings.telegram_username);

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
            type="button"
            onClick={() => open(onlineUrl, "Online chat link has not been set up yet.")}
            className="w-full bg-red-500 text-white py-2 rounded-full flex items-center justify-center gap-2 hover:bg-red-600 disabled:opacity-50"
            disabled={!onlineUrl}
          >
            <FaHeadset /> Online Chat
          </button>
          <button
            type="button"
            onClick={() => open(whatsappUrl, "WhatsApp number has not been set up yet.")}
            className="w-full bg-green-500 text-white py-2 rounded-full flex items-center justify-center gap-2 hover:bg-green-600 disabled:opacity-50"
            disabled={!whatsappUrl}
          >
            <FaWhatsapp /> WhatsApp Chat
          </button>
          <button
            type="button"
            onClick={() => open(telegramUrl, "Telegram handle has not been set up yet.")}
            className="w-full bg-blue-500 text-white py-2 rounded-full flex items-center justify-center gap-2 hover:bg-blue-600 disabled:opacity-50"
            disabled={!telegramUrl}
          >
            <FaTelegram /> Telegram Chat
          </button>
        </div>
      </div>
    </div>
  );
}
