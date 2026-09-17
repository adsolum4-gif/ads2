import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  MdDashboard,
  MdPauseCircle,
  MdPeople,
  MdInventory,
  MdCardGiftcard,
  MdAccountBalance,
  MdEvent,
  MdCampaign,
  MdHistory,
  MdSettings,
  MdVideocam,
  MdLogout,
  MdExpandMore,
  MdPersonSearch,
  MdWarning,
  MdShare,
  MdPayments,
  MdAccountBalanceWallet,
} from "react-icons/md";
import { supabase } from "@shared/supabase";
import { clearUser } from "../store";
import { useAdminLive } from "../live";

const navItem = ({ isActive }) =>
  [
    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium tracking-tight transition-all duration-200",
    isActive
      ? "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-[0_8px_20px_-8px_rgba(220,38,38,0.9)]"
      : "text-white/70 hover:bg-white/[0.08] hover:text-white",
  ].join(" ");

const subItem = ({ isActive }) =>
  [
    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors",
    isActive ? "bg-white/15 text-white font-semibold" : "text-white/55 hover:bg-white/10 hover:text-white",
  ].join(" ");

function SectionLabel({ collapsed, children }) {
  if (collapsed) return <div className="mx-3 my-3 h-px bg-white/10" />;
  return (
    <p className="px-3 pt-5 pb-1.5 text-[10px] font-semibold tracking-[0.2em] text-white/35 uppercase">
      {children}
    </p>
  );
}

function Pulse({ show }) {
  if (!show) return null;
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-70" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
    </span>
  );
}

export default function Sidebar({ isCollapsed, closeSidebar }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const admin = useSelector((s) => s.userSlice.user);
  const live = useAdminLive();
  const [usersOpen, setUsersOpen] = useState(pathname.includes("users") || pathname.includes("negusers"));
  const [finOpen, setFinOpen] = useState(pathname.includes("deposit") || pathname.includes("withdrawal"));
  const [pulse, setPulse] = useState({ user: false, deposit: false });

  useEffect(() => {
    if (pathname.includes("allusers") || pathname.includes("negusers")) setUsersOpen(true);
    if (pathname.includes("deposit") || pathname.includes("withdrawal")) setFinOpen(true);
  }, [pathname]);

  useEffect(() => {
    if (live.last?.type === "user") setPulse((p) => ({ ...p, user: true }));
    if (live.last?.type === "deposit" && live.last?.eventType === "INSERT") {
      setPulse((p) => ({ ...p, deposit: true }));
    }
  }, [live.version]);

  useEffect(() => {
    if (pathname.includes("allusers")) setPulse((p) => ({ ...p, user: false }));
    if (pathname.includes("deposit")) setPulse((p) => ({ ...p, deposit: false }));
  }, [pathname]);

  const logout = async () => {
    await supabase.auth.signOut().catch(() => {});
    dispatch(clearUser());
    navigate("/admin");
  };

  return (
    <aside
      className={`h-screen flex flex-col text-white transition-all duration-300 ${
        isCollapsed ? "w-[84px]" : "w-[272px]"
      }`}
      style={{
        background: "linear-gradient(180deg, #32141a 0%, #1c0b10 52%, #12070a 100%)",
        boxShadow: "inset -1px 0 0 rgba(255,255,255,0.06)",
      }}
    >
      <div className={`flex items-center ${isCollapsed ? "justify-center px-2" : "px-4"} py-5 border-b border-white/10`}>
        <div
          className={`flex flex-col items-center justify-center rounded-2xl bg-white shadow-lg shadow-black/20 ${
            isCollapsed ? "p-2" : "px-3 py-2.5 w-full"
          }`}
        >
          <img
            src={isCollapsed ? "/assets/logo-sm-light-Dl30vH7a.png" : "/assets/logo-light-D-kgBesC.png"}
            alt="Logo"
            className={isCollapsed ? "w-8 h-8 object-contain" : "h-8 w-auto object-contain"}
          />
          {!isCollapsed && (
            <span className="mt-1 text-[10px] font-semibold tracking-[0.18em] text-red-700 uppercase">
              Admin
            </span>
          )}
        </div>
      </div>

      <nav className="flex-1 px-3 py-2 overflow-y-auto admin-sidebar-scroll">
        <SectionLabel collapsed={isCollapsed}>Overview</SectionLabel>
        <NavLink to="/admin/home" end className={navItem} onClick={closeSidebar} title="Dashboard">
          <MdDashboard className="text-[20px] shrink-0" />
          {!isCollapsed && <span>Dashboard</span>}
        </NavLink>
        <NavLink to="/admin/home/hold" className={navItem} onClick={closeSidebar} title="On hold">
          <MdPauseCircle className="text-[20px] shrink-0" />
          {!isCollapsed && <span>On hold</span>}
        </NavLink>

        <SectionLabel collapsed={isCollapsed}>People</SectionLabel>
        <button
          className={`w-full ${navItem({ isActive: pathname.includes("allusers") || pathname.includes("negusers") })}`}
          onClick={() => {
            if (isCollapsed) navigate("/admin/home/allusers");
            else setUsersOpen((o) => !o);
          }}
          title="Users"
        >
          <MdPeople className="text-[20px] shrink-0" />
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left">Users</span>
              <Pulse show={pulse.user} />
              <MdExpandMore className={`text-lg opacity-70 transition-transform ${usersOpen ? "rotate-180" : ""}`} />
            </>
          )}
          {isCollapsed && pulse.user && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
          )}
        </button>
        {!isCollapsed && usersOpen && (
          <div className="ml-4 mt-1 mb-1 space-y-1 border-l border-white/10 pl-3">
            <NavLink to="/admin/home/allusers" className={subItem} onClick={closeSidebar}>
              <MdPersonSearch className="text-base" />
              <span className="flex-1">All users</span>
              <Pulse show={pulse.user} />
            </NavLink>
            <NavLink to="/admin/home/negusers" className={subItem} onClick={closeSidebar}>
              <MdWarning className="text-base" /> Negative users
            </NavLink>
          </div>
        )}

        <NavLink to="/admin/home/refer" className={navItem} onClick={closeSidebar} title="Refer">
          <MdShare className="text-[20px] shrink-0" />
          {!isCollapsed && <span>Refer</span>}
        </NavLink>

        <SectionLabel collapsed={isCollapsed}>Catalog</SectionLabel>
        <NavLink to="/admin/home/products" className={navItem} onClick={closeSidebar} title="Products">
          <MdInventory className="text-[20px] shrink-0" />
          {!isCollapsed && <span>Products</span>}
        </NavLink>
        <NavLink to="/admin/home/packs" className={navItem} onClick={closeSidebar} title="VIP packs">
          <MdCardGiftcard className="text-[20px] shrink-0" />
          {!isCollapsed && <span>VIP packs</span>}
        </NavLink>

        <SectionLabel collapsed={isCollapsed}>Finance</SectionLabel>
        <button
          className={`w-full ${navItem({
            isActive: pathname.includes("deposit") || pathname.includes("withdrawal"),
          })}`}
          onClick={() => {
            if (isCollapsed) navigate("/admin/home/deposits");
            else setFinOpen((o) => !o);
          }}
          title="Finance"
        >
          <MdAccountBalance className="text-[20px] shrink-0" />
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left">Finance</span>
              <Pulse show={pulse.deposit} />
              <MdExpandMore className={`text-lg opacity-70 transition-transform ${finOpen ? "rotate-180" : ""}`} />
            </>
          )}
          {isCollapsed && pulse.deposit && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
          )}
        </button>
        {!isCollapsed && finOpen && (
          <div className="ml-4 mt-1 mb-1 space-y-1 border-l border-white/10 pl-3">
            <NavLink to="/admin/home/deposits" className={subItem} onClick={closeSidebar}>
              <MdPayments className="text-base" />
              <span className="flex-1">Deposits</span>
              <Pulse show={pulse.deposit} />
            </NavLink>
            <NavLink to="/admin/home/withdrawals" className={subItem} onClick={closeSidebar}>
              <MdAccountBalanceWallet className="text-base" /> Withdrawals
            </NavLink>
          </div>
        )}

        <SectionLabel collapsed={isCollapsed}>Content</SectionLabel>
        <NavLink to="/admin/home/events" className={navItem} onClick={closeSidebar} title="Events">
          <MdEvent className="text-[20px] shrink-0" />
          {!isCollapsed && <span>Events</span>}
        </NavLink>
        <NavLink to="/admin/home/announcements" className={navItem} onClick={closeSidebar} title="Announcements">
          <MdCampaign className="text-[20px] shrink-0" />
          {!isCollapsed && <span>Announcements</span>}
        </NavLink>
        <NavLink to="/admin/home/video" className={navItem} onClick={closeSidebar} title="Home video">
          <MdVideocam className="text-[20px] shrink-0" />
          {!isCollapsed && <span>Home video</span>}
        </NavLink>

        <SectionLabel collapsed={isCollapsed}>System</SectionLabel>
        <NavLink to="/admin/home/logs" className={navItem} onClick={closeSidebar} title="Logs">
          <MdHistory className="text-[20px] shrink-0" />
          {!isCollapsed && <span>Logs</span>}
        </NavLink>
        <NavLink to="/admin/home/settings" className={navItem} onClick={closeSidebar} title="Settings">
          <MdSettings className="text-[20px] shrink-0" />
          {!isCollapsed && <span>Settings</span>}
        </NavLink>
      </nav>

      <div className="p-3 border-t border-white/10 space-y-2">
        {!isCollapsed && (
          <div className="flex items-center gap-2 px-2 py-1.5">
            <span className={`h-2 w-2 rounded-full ${live.connected ? "bg-emerald-400" : "bg-amber-400"}`} />
            <span className="text-[11px] text-white/45">{live.connected ? "Live updates on" : "Syncing…"}</span>
          </div>
        )}
        {!isCollapsed && admin?.username && (
          <div className="px-2 pb-1 text-[11px] text-white/40 truncate">{admin.username}</div>
        )}
        <button
          onClick={logout}
          title="Logout"
          className={`flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm font-medium text-red-300 hover:bg-red-500/15 hover:text-red-200 transition-colors ${
            isCollapsed ? "justify-center" : ""
          }`}
        >
          <MdLogout className="text-xl shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
