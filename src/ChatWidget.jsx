import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { authApi } from "./api/client";
import { fetchSettingsSuccess } from "./store/slices/authSlice";

export default function ChatWidget() {
  const dispatch = useDispatch();
  const settings = useSelector((s) => s.auth.settings);

  useEffect(() => {
    (async () => {
      if (!settings) {
        const result = await authApi.fetchSettings();
        if (result.success) dispatch(fetchSettingsSuccess(result.data));
      }
    })();
  }, [dispatch, settings]);

  useEffect(() => {
    if (!settings?.online_chat_url || !settings?.online_embed_url) return;
    const script = document.createElement("script");
    script.async = true;
    script.src = settings.online_embed_url;
    script.charset = "UTF-8";
    script.setAttribute("crossorigin", "*");
    const first = document.getElementsByTagName("script")[0];
    first.parentNode.insertBefore(script, first);
    return () => script.remove();
  }, [settings?.online_chat_url, settings?.online_embed_url]);

  return null;
}
