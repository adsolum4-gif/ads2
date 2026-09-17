import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { FaUserCircle } from "react-icons/fa";
import { MdNotifications } from "react-icons/md";
import Sidebar from "./Sidebar";
import AnnouncementModal from "./AnnouncementModal";
import { announcementApi, authApi } from "../api/client";
import { fetchProfileStart, fetchProfileSuccess } from "../store/slices/profileSlice";
import { fetchNotifications, prependNotification } from "../store/slices/notificationsSlice";
import { supabase } from "@shared/supabase";

export default function AppLayout() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((s) => s.profile.user);
  const unread = useSelector((s) => s.notifications.notifications.filter((n) => !n.is_read).length);
  const [announcement, setAnnouncement] = useState(null);
  const [show, setShow] = useState(false);

  const openIfUnseen = async () => {
    try {
      const active = await announcementApi.getActiveAnnouncement();
      if (active.success && active.data) {
        setAnnouncement(active.data);
        setShow(true);
      }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    (async () => {
      if (!user) {
        dispatch(fetchProfileStart());
        const result = await authApi.fetchProfile();
        if (result.success) dispatch(fetchProfileSuccess(result.data));
      }
    })();
  }, [dispatch, user]);

  useEffect(() => {
    dispatch(fetchNotifications());
    openIfUnseen();

    const channel = supabase
      .channel("user-announcements")
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, (payload) => {
        if (payload.new?.is_active) openIfUnseen();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => {
        dispatch(fetchNotifications(true));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dispatch]);

  const closeAnnouncement = async () => {
    const current = announcement;
    setShow(false);
    setAnnouncement(null);
    if (current?.id) {
      const result = await announcementApi.markAnnouncementAsSeen(current.id);
      if (result.notification) dispatch(prependNotification(result.notification));
      else dispatch(fetchNotifications(true));
    }
    await openIfUnseen();
  };

  return (
    <div className="flex bg-gray-50 h-screen">
      <Sidebar />
      <div className="flex flex-col w-full h-full">
        <div className="nav-bar flex items-center md:hidden justify-between h-16 bg-white shadow px-4 md:mx-4">
          <div className="flex items-center">
            <img
              src="/assets/logo-light-D-kgBesC.png"
              onClick={() => navigate("/home")}
              alt="Logo"
              className="w-24 h-auto block md:hidden cursor-pointer"
            />
          </div>
          <div className="flex items-center justify-center space-x-3 text-gray-500">
            <button type="button" onClick={() => navigate("/home/notifications")} className="relative p-1">
              <MdNotifications className="text-2xl" />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </button>
            <button type="button" onClick={() => navigate("/home/settings")} className="flex items-center">
              <span className="text-lg font-medium">{user?.first_name || ""}</span>
              {user?.profile_picture ? (
                <img src={user.profile_picture} alt="Profile" className="w-6 h-6 ml-2 rounded-full object-cover" />
              ) : (
                <FaUserCircle className="text-3xl md:mr-6 mr-2" />
              )}
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto md:p-4">
          <Outlet />
        </div>
      </div>
      {show && <AnnouncementModal announcement={announcement} onClose={closeAnnouncement} />}
    </div>
  );
}
