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

  const showOnline = settings.show_online_chat !== false;
  const showWhatsapp = settings.show_whatsapp !== false;
  const showTelegram = settings.show_telegram !== false;

  const onlineUrl = showOnline ? normalizeOnlineChatUrl(settings.online_chat_url) : null;
  const whatsappUrl = showWhatsapp ? whatsappChatUrl(settings.whatsapp_contact) : null;
  const telegramUrl = showTelegram ? telegramChatUrl(settings.telegram_username) : null;

  const options = [
    showOnline && {
      key: "online",
      label: "Online Chat",
      icon: FaHeadset,
      url: onlineUrl,
      missing: "Online chat link has not been set up yet.",
      className: "bg-red-500 hover:bg-red-600",
    },
    showWhatsapp && {
      key: "whatsapp",
      label: "WhatsApp Chat",
      icon: FaWhatsapp,
      url: whatsappUrl,
      missing: "WhatsApp number has not been set up yet.",
      className: "bg-green-500 hover:bg-green-600",
    },
    showTelegram && {
      key: "telegram",
      label: "Telegram Chat",
      icon: FaTelegram,
      url: telegramUrl,
      missing: "Telegram handle has not been set up yet.",
      className: "bg-blue-500 hover:bg-blue-600",
    },
  ].filter(Boolean);

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
          {options.length === 0 ? (
            <p className="text-gray-500 text-sm py-2">No support options are available right now. Please check back later.</p>
          ) : (
            options.map(({ key, label, icon: Icon, url, missing, className }) => (
              <button
                key={key}
                type="button"
                onClick={() => open(url, missing)}
                className={`w-full text-white py-2 rounded-full flex items-center justify-center gap-2 disabled:opacity-50 ${className}`}
                disabled={!url}
              >
                <Icon /> {label}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
