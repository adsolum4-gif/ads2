import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useDispatch } from "react-redux";
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
} from "react-icons/md";
import { clearUser } from "../store";

const itemCls = ({ isActive }) =>
  isActive
    ? "flex items-center gap-x-3 py-2 px-4 bg-red-600 rounded-md"
    : "flex items-center gap-x-3 py-2 px-4 hover:bg-red-600 rounded-md";

const subCls = ({ isActive }) =>
  isActive ? "block py-2 px-4 bg-red-600 rounded-md" : "block py-2 px-4 hover:bg-red-600 rounded-md";

export default function Sidebar({ isCollapsed, closeSidebar }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [usersOpen, setUsersOpen] = useState(false);
  const [finOpen, setFinOpen] = useState(false);

  const logout = () => {
    dispatch(clearUser());
    navigate("/");
  };

  return (
    <div
      className={`transition-all duration-300 ${isCollapsed ? "w-16" : "w-64"} bg-red-200 text-white h-screen flex flex-col relative`}
    >
      <div className="flex items-center justify-center py-4 bg-white" style={{ borderRight: "3px solid red" }}>
        <img
          src={isCollapsed ? "/assets/logo-sm-light-Dl30vH7a.png" : "/assets/logo-light-D-kgBesC.png"}
          alt="Logo"
          className={isCollapsed ? "w-8" : "w-28"}
        />
      </div>
      <div className="flex-grow px-2 mt-4 overflow-y-auto">
        <NavLink to="/home" end className={itemCls} onClick={closeSidebar}>
          <MdDashboard className="text-xl" />
          {!isCollapsed && <span>Dashboard</span>}
        </NavLink>
        <NavLink to="/home/hold" className={itemCls} onClick={closeSidebar}>
          <MdPauseCircle className="text-xl" />
          {!isCollapsed && <span>On Hold Management</span>}
        </NavLink>

        <button className="flex items-center w-full px-4 py-2 rounded-md gap-x-3 hover:bg-red-600" onClick={() => setUsersOpen(!usersOpen)}>
          <MdPeople className="text-xl" />
          {!isCollapsed && (
            <>
              <span>Users management</span>
              <MdExpandMore className={`ml-auto transition-transform ${usersOpen ? "rotate-180" : ""}`} />
            </>
          )}
        </button>
        {!isCollapsed && usersOpen && (
          <div className="ml-8">
            <NavLink to="/home/allusers" className={subCls} onClick={closeSidebar}>All users</NavLink>
            <NavLink to="/home/negusers" className={subCls} onClick={closeSidebar}>Negative users</NavLink>
          </div>
        )}

        <NavLink to="/home/products" className={itemCls} onClick={closeSidebar}>
          <MdInventory className="text-xl" />
          {!isCollapsed && <span>Products</span>}
        </NavLink>
        <NavLink to="/home/packs" className={itemCls} onClick={closeSidebar}>
          <MdCardGiftcard className="text-xl" />
          {!isCollapsed && <span>Packs management</span>}
        </NavLink>

        <button className="flex items-center w-full px-4 py-2 rounded-md gap-x-3 hover:bg-red-600" onClick={() => setFinOpen(!finOpen)}>
          <MdAccountBalance className="text-xl" />
          {!isCollapsed && (
            <>
              <span>Financial operations</span>
              <MdExpandMore className={`ml-auto transition-transform ${finOpen ? "rotate-180" : ""}`} />
            </>
          )}
        </button>
        {!isCollapsed && finOpen && (
          <div className="ml-8">
            <NavLink to="/home/deposits" className={subCls} onClick={closeSidebar}>Deposits list</NavLink>
            <NavLink to="/home/withdrawals" className={subCls} onClick={closeSidebar}>Withdrawals list</NavLink>
          </div>
        )}

        <NavLink to="/home/events" className={itemCls} onClick={closeSidebar}>
          <MdEvent className="text-xl" />
          {!isCollapsed && <span>Events management</span>}
        </NavLink>
        <NavLink to="/home/announcements" className={itemCls} onClick={closeSidebar}>
          <MdCampaign className="text-xl" />
          {!isCollapsed && <span>Announcements</span>}
        </NavLink>
        <NavLink to="/home/logs" className={itemCls} onClick={closeSidebar}>
          <MdHistory className="text-xl" />
          {!isCollapsed && <span>View logs</span>}
        </NavLink>
        <NavLink to="/home/settings" className={itemCls} onClick={closeSidebar}>
          <MdSettings className="text-xl" />
          {!isCollapsed && <span>Settings management</span>}
        </NavLink>
        <NavLink to="/home/video" className={itemCls} onClick={closeSidebar}>
          <MdVideocam className="text-xl" />
          {!isCollapsed && <span>Update video</span>}
        </NavLink>
      </div>
      <button onClick={logout} className="flex items-center px-4 py-2 mb-4 text-red-500 rounded-md gap-x-3 hover:bg-red-100">
        <MdLogout className="text-xl" />
        {!isCollapsed && <span>Logout</span>}
      </button>
    </div>
  );
}
