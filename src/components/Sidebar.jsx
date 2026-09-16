import { NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useDispatch } from "react-redux";
import {
  MdHome,
  MdPlayCircle,
  MdReceiptLong,
  MdPerson,
  MdNotifications,
  MdAccountBalanceWallet,
  MdAddCard,
  MdEvent,
  MdLogout,
} from "react-icons/md";
import { logout } from "../store/slices/authSlice";
import { slideIn } from "../utils/motion";

const links = [
  { to: "/home", label: "Home", icon: MdHome, end: true },
  { to: "/home/starting", label: "Starting", icon: MdPlayCircle },
  { to: "/home/records", label: "Records", icon: MdReceiptLong },
  { to: "/home/profile", label: "Profile", icon: MdPerson },
  { to: "/home/notifications", label: "Notifications", icon: MdNotifications },
  { to: "/home/withdraw", label: "Withdraw", icon: MdAccountBalanceWallet },
  { to: "/home/deposit", label: "Deposit", icon: MdAddCard },
  { to: "/home/events", label: "Events", icon: MdEvent },
];

export default function Sidebar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  return (
    <div className="w-[368px] bg-red-200 px-4 py-6 hidden md:flex flex-col justify-between h-screen shadow-md overflow-y-auto">
      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}>
        <img src="/assets/logo-light-D-kgBesC.png" alt="Logo" className="w-auto h-auto" />
      </motion.div>
      <div className="mt-2 flex flex-col space-y-3 text-gray-600 flex-grow">
        {links.map((link) => (
          <motion.div key={link.to} initial={slideIn("left", 0).initial} whileInView={slideIn("left", 2).animate}>
            <NavLink
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                isActive
                  ? "text-primary font-bold flex items-center gap-x-4 w-full px-5 py-3 hover:bg-gray-100 hover:text-gray-800 rounded-lg transition"
                  : "flex items-center gap-x-4 w-full px-5 py-3 hover:bg-gray-100 hover:text-gray-800 rounded-lg transition"
              }
            >
              <link.icon className="text-2xl" />
              <p>{link.label}</p>
            </NavLink>
          </motion.div>
        ))}
      </div>
      <motion.button
        initial={slideIn("up").initial}
        whileInView={slideIn("up", 2).animate}
        className="flex items-center gap-x-3 py-2 px-4 text-red-500 hover:bg-red-100 rounded-md"
        onClick={handleLogout}
      >
        <MdLogout className="text-2xl" />
        <p>Logout</p>
      </motion.button>
    </div>
  );
}
