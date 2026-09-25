import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { FaUserCircle, FaCopy } from "react-icons/fa";
import { MdChevronRight, MdLogout } from "react-icons/md";
import { HiOutlineCreditCard } from "react-icons/hi";
import { IoPersonOutline } from "react-icons/io5";
import VipBadge, { vipLevel, vipMeta } from "../components/VipBadge";
import BottomNav from "../components/BottomNav";
import Loader from "../components/Loader";
import { authApi } from "../api/client";
import { fetchProfileStart, fetchProfileSuccess, fetchProfileFailure } from "../store/slices/profileSlice";
import { logout } from "../store/slices/authSlice";
import { fadeIn } from "../utils/motion";

function money(value) {
  const n = Number(value);
  return `$${Number.isFinite(n) ? n.toFixed(2) : "0.00"}`;
}

const MenuRow = ({ icon: Icon, label, onClick, last }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex w-full items-center cursor-pointer justify-between px-5 py-4 text-left ${last ? "" : "border-b border-gray-100"} hover:bg-gray-50 transition-colors`}
  >
    <div className="flex items-center space-x-4">
      <div className="bg-red-50 rounded-lg p-2">
        <Icon className="text-red-500 text-lg" />
      </div>
      <p className="text-gray-800 font-medium">{label}</p>
    </div>
    <MdChevronRight className="text-gray-300 text-xl" />
  </button>
);

export default function Profile() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((s) => s.profile.user);
  const loading = useSelector((s) => s.profile.isLoading);

  useEffect(() => {
    (async () => {
      dispatch(fetchProfileStart());
      const result = await authApi.fetchProfile();
      if (result.success) dispatch(fetchProfileSuccess(result.data));
      else {
        dispatch(fetchProfileFailure(result.message));
        if (!user) toast.error(result.message || "Failed to load profile.");
      }
    })();
  }, [dispatch]);

  const copy = () => {
    if (!user?.referral_code) return;
    navigator.clipboard.writeText(user.referral_code);
    toast.success("Referral code copied!");
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  if ((loading && !user) || !user) return <Loader />;

  const pack = user.wallet?.package || user.wallet?.packs;
  const meta = vipMeta(pack);
  const level = vipLevel(pack);
  const wallet = user.wallet || {};

  return (
    <div className="bg-[#f4f4f4] min-h-full flow-root mobile-bottom-nav-space md:pb-0">
      <motion.div
        initial={fadeIn("down").initial}
        animate={fadeIn("down", 2).animate}
        className="bg-red-600 rounded-2xl mx-3 md:mx-4 mt-3 md:mt-2 p-5 md:p-6 text-white"
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center min-w-0">
            {user.profile_picture ? (
              <img src={user.profile_picture} alt="Profile" className="w-14 h-14 md:w-16 md:h-16 mr-3 rounded-full object-cover border-2 border-white/30" />
            ) : (
              <FaUserCircle className="text-5xl mr-3 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-lg md:text-xl font-bold truncate">{user.username || "N/A"}</p>
              <p className="text-sm text-white/90 mt-0.5">Referral code:</p>
              <button type="button" onClick={copy} className="flex items-center font-bold tracking-wide">
                <span>{user.referral_code || "N/A"}</span>
                <FaCopy className="ml-2 text-sm opacity-90" />
              </button>
            </div>
          </div>
          <div className="text-center shrink-0 ml-3">
            <div className="flex justify-center">
              <VipBadge pack={pack} size={52} />
            </div>
            <p className="font-semibold text-xs mt-1.5 whitespace-nowrap">
              {meta.metal} (VIP{level})
            </p>
          </div>
        </div>

        <div className="border-t border-yellow-400/80 mt-4 pt-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
          <Stat label="Wallet Balance:" value={money(wallet.balance)} />
          <Stat label="On Hold Amount:" value={money(wallet.on_hold)} yellow />
          <Stat label="Commission:" value={money(wallet.commission ?? user.today_profit)} />
          <Stat label="Credit Score:" value={`${Number(wallet.credit_score ?? 0).toFixed(2)}%`} />
          <Stat label="Salary:" value={money(wallet.salary)} />
        </div>
      </motion.div>

      <div className="space-y-3 mx-3 md:mx-4 mt-4 mb-4 md:mb-6">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <MenuRow icon={HiOutlineCreditCard} label="Deposit" onClick={() => navigate("/home/deposit")} />
          <MenuRow icon={HiOutlineCreditCard} label="Withdraw" onClick={() => navigate("/home/withdraw")} last />
        </div>
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <MenuRow icon={IoPersonOutline} label="Personal Information" onClick={() => navigate("/home/personal")} />
          <MenuRow icon={HiOutlineCreditCard} label="Payment Methods" onClick={() => navigate("/home/payment")} last />
        </div>
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <MenuRow icon={IoPersonOutline} label="Contact Us" onClick={() => navigate("/home/contact")} />
          <MenuRow icon={IoPersonOutline} label="Notifications" onClick={() => navigate("/home/notifications")} last />
        </div>
        <motion.button
          type="button"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={handleLogout}
          className="relative z-20 w-full bg-red-600 hover:bg-red-700 text-white shadow-sm font-semibold py-3.5 rounded-xl flex items-center justify-center touch-manipulation"
        >
          <MdLogout className="mr-2 text-xl" /> Logout
        </motion.button>
        <div className="md:hidden h-12 shrink-0" aria-hidden="true" />
      </div>
      <BottomNav />
    </div>
  );
}

function Stat({ label, value, yellow }) {
  return (
    <div>
      <p className="text-white/90">{label}</p>
      <p className={`${yellow ? "text-yellow-300" : ""} font-bold text-base md:text-lg mt-0.5`}>{value}</p>
    </div>
  );
}
