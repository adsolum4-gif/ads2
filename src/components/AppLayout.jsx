import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { FaUserCircle } from "react-icons/fa";
import Sidebar from "./Sidebar";
import AnnouncementModal from "./AnnouncementModal";
import { announcementApi } from "../api/client";
import { fetchProfileStart, fetchProfileSuccess } from "../store/slices/profileSlice";
import { authApi } from "../api/client";

export default function AppLayout() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((s) => s.profile.user);
  const [announcement, setAnnouncement] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user) {
        dispatch(fetchProfileStart());
        const result = await authApi.fetchProfile();
        if (result.success) dispatch(fetchProfileSuccess(result.data));
      }
      try {
        const active = await announcementApi.getActiveAnnouncement();
        if (active.success && active.data) {
          setAnnouncement(active.data);
          setShow(true);
        }
      } catch {
        /* ignore */
      }
    })();
  }, [dispatch, user]);

  const closeAnnouncement = async () => {
    if (announcement) await announcementApi.markAnnouncementAsSeen(announcement.id);
    setShow(false);
    setAnnouncement(null);
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
          <div className="flex items-center justify-center space-x-2 text-gray-500">
            <a href="/home/profile" className="flex items-center">
              <span className="text-lg font-medium">{user?.first_name || ""}</span>
              {user?.profile_picture ? (
                <img src={user.profile_picture} alt="Profile" className="w-6 h-6 ml-2 rounded-full object-cover" />
              ) : (
                <FaUserCircle className="text-3xl md:mr-6 mr-2" />
              )}
            </a>
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
