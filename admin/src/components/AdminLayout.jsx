import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { formatDistanceToNow } from "date-fns";
import { MdMenu, MdNotifications, MdExpandMore, MdPerson, MdLogout, MdRefresh } from "react-icons/md";
import { IoMdNotifications } from "react-icons/io";
import { CircularProgress } from "@mui/material";
import Sidebar from "./Sidebar";
import { AdminLiveProvider, useAdminLive } from "../live";
import { clearUser, toggleSidebar } from "../store";
import { api, unwrap, showError } from "../api/client";
import { endpoints } from "../api/endpoints";
import { supabase } from "@shared/supabase";

export default function AdminLayout() {
  return (
    <AdminLiveProvider>
      <AdminShell />
    </AdminLiveProvider>
  );
}

function AdminShell() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const collapsed = useSelector((s) => s.userSlice.sidebarCollapsed);
  const user = useSelector((s) => s.userSlice.user);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [marking, setMarking] = useState(false);
  const [admin, setAdmin] = useState(user);
  const live = useAdminLive();

  const loadNotifs = async () => {
    try {
      const { data } = await api.get(endpoints.NOTIFICATIONS);
      const list = unwrap({ data });
      setNotifs(Array.isArray(list) ? list : list?.results || list?.data || []);
    } catch {
      setNotifs([]);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(endpoints.GET_ADMIN);
        const payload = unwrap({ data });
        setAdmin(payload);
      } catch {
        /* keep stored user */
      }
    })();
    loadNotifs();
  }, []);

  useEffect(() => {
    if (!live.version) return;
    loadNotifs();
  }, [live.version]);

  const unread = notifs.filter((n) => !n.is_read).length;

  const markAll = async () => {
    setMarking(true);
    try {
      await api.post(endpoints.MARK_ALL_READ);
      await loadNotifs();
    } catch (e) {
      showError(e);
    } finally {
      setMarking(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut().catch(() => {});
    dispatch(clearUser());
    navigate("/admin");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f6f3f4]">
      <div className={`${mobileOpen ? "fixed inset-y-0 left-0 z-50 md:static" : "hidden md:block"}`}>
        <Sidebar isCollapsed={collapsed} closeSidebar={() => setMobileOpen(false)} />
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <header className="flex items-center justify-between h-16 px-4 bg-white border-b border-gray-100 shadow-sm">
          <button onClick={() => dispatch(toggleSidebar())} className="hidden text-2xl text-gray-600 md:block">
            <MdMenu />
          </button>
          <button onClick={() => setMobileOpen(true)} className="text-2xl text-gray-600 md:hidden">
            <MdMenu />
          </button>
          <div className="flex items-center gap-4 ml-auto">
            <div className="relative">
              <button className="relative text-2xl text-gray-600" onClick={() => setNotifOpen(!notifOpen)}>
                <MdNotifications />
                {unread > 0 && (
                  <span className="absolute flex items-center justify-center w-4 h-4 text-xs text-white bg-red-600 rounded-full -top-1 -right-1">
                    {unread}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 z-50 mt-2 bg-white rounded-lg shadow-md w-80">
                  <h3 className="px-6 py-4 font-semibold text-gray-700 text-md">NOTIFICATIONS</h3>
                  <div className="px-6 space-y-4 overflow-y-auto max-h-64">
                    {notifs.length ? (
                      notifs.map((n) => (
                        <div key={n.id} className="flex items-start cursor-pointer">
                          <span className="relative mt-1 text-red-500">
                            <IoMdNotifications className="text-xl" />
                          </span>
                          <div className="relative ml-3">
                            <p className="text-sm font-semibold text-gray-700">
                              {n.title}
                              {!n.is_read && <span className="bg-blue-500 absolute top-2 ml-2 rounded-full size-1.5" />}
                            </p>
                            <p className="text-sm text-gray-700">{n.message}</p>
                            <p className="text-xs text-gray-500">
                              {n.created_at ? formatDistanceToNow(new Date(n.created_at), { addSuffix: true }) : ""}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="mt-6 mb-10 text-center text-gray-700">
                        You don't have any notifications at the moment. Stay tuned for updates!
                      </p>
                    )}
                  </div>
                  <div className="px-6 py-4 mt-3 border-t">
                    <button disabled={marking} onClick={markAll} className="flex items-center gap-2 mx-auto mt-4 text-sm text-blue-600 hover:underline">
                      {marking && <CircularProgress size={14} />}
                      <MdRefresh /> Reset
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="relative">
              <button className="flex items-center text-gray-600 hover:text-gray-800" onClick={() => setMenuOpen(!menuOpen)}>
                <img
                  src={admin?.profile_picture || "/assets/profile-pic-Cd7mtiQf.jpg"}
                  alt="Admin Profile"
                  className="w-8 h-8 mr-2 rounded-full object-cover"
                />
                <span className="hidden ml-2 md:inline-block">{admin?.username}</span>
                <MdExpandMore className="ml-1" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 w-48 py-2 mt-2 bg-white rounded-lg shadow-md z-50">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      navigate("/admin/home/profile");
                    }}
                    className="flex items-center w-full px-4 py-2 space-x-2 text-left text-gray-700 hover:bg-gray-100"
                  >
                    <MdPerson className="text-lg text-gray-500" />
                    <span>Update profile</span>
                  </button>
                  <hr className="my-1 border-gray-200" />
                  <button onClick={logout} className="flex items-center w-full px-4 py-2 space-x-2 text-left text-gray-700 hover:bg-gray-100">
                    <MdLogout className="text-lg text-gray-500" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto bg-[#f6f3f4] md:p-4">
          <Outlet />
        </div>
      </div>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden" onClick={() => setMobileOpen(false)} />}
    </div>
  );
}
