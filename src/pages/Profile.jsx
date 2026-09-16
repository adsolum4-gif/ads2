import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { FaUserCircle, FaCopy } from "react-icons/fa";
import VipBadge from "../components/VipBadge";
import { MdChevronRight, MdLogout } from "react-icons/md";
import { HiOutlineCreditCard } from "react-icons/hi";
import { IoPersonOutline } from "react-icons/io5";
import BottomNav from "../components/BottomNav";
import Loader from "../components/Loader";
import { authApi } from "../api/client";
import { fetchProfileStart, fetchProfileSuccess, fetchProfileFailure } from "../store/slices/profileSlice";
import { logout } from "../store/slices/authSlice";
import { fadeIn } from "../utils/motion";

const MenuRow = ({ icon: Icon, label, onClick, last }) => (
  <motion.div
    initial={fadeIn("right").initial}
    whileInView={fadeIn("right", 2).animate}
    whileHover={{ x: 5 }}
    onClick={onClick}
    className={`flex items-center cursor-pointer justify-between p-5 ${last ? "" : "border-b"} hover:bg-red-50 transition-all duration-200`}
  >
    <div className="flex items-center space-x-4">
      <div className="bg-red-100 rounded-lg p-2.5">
        <Icon className="text-red-600 text-xl" />
      </div>
      <p className="text-gray-700 font-bold">{label}</p>
    </div>
    <MdChevronRight className="text-gray-400 text-xl" />
  </motion.div>
);

export default function Profile() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((s) => s.profile.user);
  const loading = useSelector((s) => s.profile.isLoading);

  useEffect(() => {
    (async () => {
      if (!user) {
        dispatch(fetchProfileStart());
        const result = await authApi.fetchProfile();
        if (result.success) dispatch(fetchProfileSuccess(result.data));
        else {
          dispatch(fetchProfileFailure(result.message));
          toast.error(result.message || "Failed to load profile.");
        }
      }
    })();
  }, [dispatch, user]);

  const copy = () => {
    if (user?.referral_code) {
      navigator.clipboard.writeText(user.referral_code);
      toast.success("Referral code copied!");
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  if (loading || !user) return <Loader />;

  return (
    <div className="bg-white md:overflow-hidden">
      <motion.div
        initial={fadeIn("down").initial}
        whileInView={fadeIn("down", 2).animate}
        className="bg-red-600 rounded-2xl md:mx-4 md:my-6 mx-2 md:p-8 p-2 mt-2 text-white"
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            {user.profile_picture ? (
              <img src={user.profile_picture} alt="Profile" className="md:w-24 md:h-24 w-16 h-16 md:mr-6 mr-2 rounded-full object-cover" />
            ) : (
              <FaUserCircle className="md:text-6xl text-4xl md:mr-6 mr-2" />
            )}
            <div>
              <p className="text-xl font-bold">{user.username || "N/A"}</p>
              <div className="text-md">
                Referral code:
                <div className="flex flex-wrap items-center mt-1">
                  <span className="font-bold">{user.referral_code || "N/A"}</span>
                  <FaCopy onClick={copy} className="ml-2 cursor-pointer" />
                </div>
              </div>
            </div>
          </div>
          <div className="text-center">
            <div className="flex justify-center ml-4">
              <VipBadge pack={user.wallet?.package} size={56} />
            </div>
            <p className="font-bold text-sm mt-2">{user.wallet?.package?.name || "N/A"}</p>
          </div>
        </div>
        <div className="border-t border-yellow-400 mt-2 md:mt-6 gap-2 md:gap-6 sm:flex sm:justify-between text-md hidden md:flex">
          <Stat label="Wallet Balance:" value={`$${user.wallet?.balance || "0.00"}`} />
          <Stat label="On Hold Amount:" value={`$${user.wallet?.on_hold || "0.00"}`} yellow />
          <Stat label="Commission:" value={`$${user.today_profit || "0.00"}`} />
          <Stat label="Credit Score:" value={`${user.wallet?.credit_score || "N/A"}%`} />
          <Stat label="Salary:" value={`$${user.wallet?.salary || "N/A"}`} />
        </div>
        <div className="border-t md:hidden border-yellow-400 mt-2 pt-4 grid gap-2 text-md">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Wallet Balance:" value={`$${user.wallet?.balance || "0.00"}`} />
            <Stat label="On Hold Amount:" value={`$${user.wallet?.on_hold || "0.00"}`} yellow />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Commission:" value={`$${user.today_profit || "0.00"}`} />
            <Stat label="Credit Score:" value={`${user.wallet?.credit_score || "N/A"} %`} />
            <Stat label="Salary:" value={`$${user.wallet?.salary || "N/A"}`} />
          </div>
        </div>
      </motion.div>

      <div className="space-y-4 md:mx-6 mx-2 md:mb-4 mb-52">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100">
          <MenuRow icon={HiOutlineCreditCard} label="Deposit" onClick={() => navigate("/home/deposit")} />
          <MenuRow icon={HiOutlineCreditCard} label="Withdraw" onClick={() => navigate("/home/withdraw")} last />
        </div>
        <div className="bg-white rounded-xl shadow-lg border border-gray-100">
          <MenuRow icon={IoPersonOutline} label="Personal Information" onClick={() => navigate("/home/personal")} />
          <MenuRow icon={HiOutlineCreditCard} label="Payment Methods" onClick={() => navigate("/home/payment")} last />
        </div>
        <div className="bg-white rounded-xl shadow-lg border border-gray-100">
          <MenuRow icon={IoPersonOutline} label="Contact Us" onClick={() => navigate("/home/contact")} />
          <MenuRow icon={IoPersonOutline} label="Notifications" onClick={() => navigate("/home/notifications")} last />
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleLogout}
          className="w-full bg-red-600 hover:bg-red-700 text-white md:mb-2 mb-52 shadow-lg font-bold py-3.5 rounded-xl flex items-center justify-center"
        >
          <MdLogout className="mr-2 text-xl" /> Logout
        </motion.button>
      </div>
      <BottomNav />
    </div>
  );
}

function Stat({ label, value, yellow }) {
  return (
    <div className="text-center">
      <p>{label}</p>
      <p className={`${yellow ? "text-yellow-400" : ""} font-bold text-lg`}>{value}</p>
    </div>
  );
}
