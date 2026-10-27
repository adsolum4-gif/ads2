import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  MdPlayCircle,
  MdVerified,
  MdAccountBalanceWallet,
  MdAddCard,
  MdDescription,
  MdEvent,
  MdHelp,
  MdInfo,
  MdNotifications,
  MdChevronRight,
  MdClose,
  MdWavingHand,
} from "react-icons/md";
import BottomNav from "../components/BottomNav";
import Loader from "../components/Loader";
import { fetchPacks } from "../store/slices/packsSlice";
import { authApi } from "../api/client";
import { fetchProfileStart, fetchProfileSuccess, fetchProfileFailure, toggleWelcomeState, setWelcomeState } from "../store/slices/profileSlice";
import { fetchNotifications } from "../store/slices/notificationsSlice";
import VipBadge, { amountToReachVip, vipFromBalance, vipLevel, vipMeta, withVipLevels } from "../components/VipBadge";
import VipLevelDetailSheet from "../components/VipLevelDetailSheet";

const quickLinks = [
  { label: "Starting", icon: MdPlayCircle, route: "/home/starting" },
  { label: "Certificate", icon: MdVerified, route: "/home/certificate" },
  { label: "Withdraw", icon: MdAccountBalanceWallet, route: "/home/withdraw" },
  { label: "Deposit", icon: MdAddCard, route: "/home/deposit" },
  { label: "T & C", icon: MdDescription, route: "/home/rules" },
  { label: "Events", icon: MdEvent, route: "/home/events" },
  { label: "FAQ", icon: MdHelp, route: "/home/faq" },
  { label: "About Us", icon: MdInfo, route: "/home/about" },
];

export default function Home() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const showWelcome = useSelector((s) => s.profile.showWelcome);
  const user = useSelector((s) => s.profile.user);
  const { notifications } = useSelector((s) => s.notifications);
  const unread = notifications.filter((n) => !n.is_read).length;
  const { packs, isLoading, error } = useSelector((s) => s.packs);
  const rawPacks = packs?.data || packs || [];
  const packList = withVipLevels(rawPacks);
  const balance = Number(user?.wallet?.balance || 0);
  const currentVip = vipFromBalance(packList, balance);
  const [vipDetailPack, setVipDetailPack] = useState(null);
  const missionsDone = Number(user?.current_number_count ?? 0);
  const missionsTotal = Number(user?.total_number_can_play ?? 0);
  const setsDone = Number(user?.review_sets_completed ?? 0);
  const setsTotal = Math.max(
    1,
    Number(user?.review_sets_allowed ?? user?.wallet?.package?.number_of_set ?? 1)
  );

  const openVipDeposit = (deposit) => {
    setVipDetailPack(null);
    const amt = Number(deposit?.amount);
    if (Number.isFinite(amt) && amt > 0) {
      navigate(`/home/deposit?amount=${amt.toFixed(2)}`);
    } else {
      navigate("/home/deposit");
    }
  };

  useEffect(() => {
    if (!rawPacks.length) dispatch(fetchPacks());
  }, [dispatch, rawPacks.length]);

  useEffect(() => {
    (async () => {
      if (!user) {
        dispatch(fetchProfileStart());
        try {
          const result = await authApi.fetchProfile();
          if (result.success) dispatch(fetchProfileSuccess(result.data));
          else {
            dispatch(fetchProfileFailure(result.message));
            toast.error(result.message || "Failed to load profile.");
          }
        } catch {
          toast.error("An error occurred while fetching your profile.");
        }
      }
    })();
  }, [dispatch, user]);

  useEffect(() => {
    dispatch(fetchNotifications());
    const id = setInterval(() => dispatch(fetchNotifications(true)), 120000);
    return () => clearInterval(id);
  }, [dispatch]);

  useEffect(() => {
    if (showWelcome) {
      const t = setTimeout(() => dispatch(setWelcomeState(false)), 5000);
      return () => clearTimeout(t);
    }
  }, [showWelcome, dispatch]);

  if (isLoading && !packList.length) return <Loader />;

  const videoSrc = user?.settings?.video || "/assets/home_video-NDno8SV9.mp4";

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex flex-col relative">
      <div className="relative w-full md:h-[31rem] h-[15rem] md:mt-0 mt-2 overflow-hidden shadow-lg">
        <video className="w-full h-full object-cover" autoPlay loop muted playsInline>
          <source src={videoSrc} type="video/mp4" />
          Your browser does not support HTML5 video.
        </video>
      </div>

      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute top-[14.5rem] md:top-[30rem] left-[5%] bg-white text-gray-700 py-3 px-5 rounded-full shadow-lg z-30 flex items-center justify-center border border-gray-100"
        style={{ width: "90%", maxWidth: "90%" }}
      >
        <div className="relative flex items-center mr-3">
          <div className="bg-red-100 rounded-full p-2">
            <MdNotifications onClick={() => navigate("/home/notifications")} className="text-xl cursor-pointer text-red-600" />
          </div>
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse font-semibold shadow-md">
              {unread}
            </span>
          )}
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="home-ticker font-medium text-sm text-gray-600 whitespace-nowrap">
            Welcome to Adsterra. We collaborate with you to drive better exposure and create proven value with Adsterra platform strategy and product solutions.
          </p>
        </div>
      </motion.div>

      <div className="bg-red-600 py-14">
        <div className="container mx-auto grid grid-cols-4 md:flex justify-around md:flex-wrap gap-5 px-4">
          {quickLinks.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              whileHover={{ scale: 1.08, y: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => item.route && navigate(item.route)}
              className="bg-white cursor-pointer rounded-xl shadow-lg hover:shadow-2xl p-4 md:w-[130px] md:h-[90px] text-center flex flex-col items-center justify-center transition-all duration-300 border border-gray-100"
            >
              <item.icon className="text-3xl text-red-600 mb-2" />
              <p className="text-xs font-bold text-gray-700">{item.label}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {showWelcome && (
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className="fixed bottom-24 left-4 md:left-80 bg-red-600 text-white px-5 py-3 rounded-xl shadow-xl flex items-center cursor-pointer z-10 md:bottom-4 hover:bg-red-700 transition-colors"
          onClick={() => dispatch(toggleWelcomeState())}
        >
          <MdWavingHand className="mr-3 text-2xl" />
          <div>
            <p className="text-lg font-bold">Hi, {user?.first_name} 👋</p>
            <p className="text-sm">Welcome Back</p>
          </div>
          <MdClose className="ml-3 text-2xl" />
        </motion.div>
      )}

      <div className="container mx-auto mt-10 px-4 md:mb-6 mb-52">
        {user && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-md p-4 sm:p-5 mb-8 inline-block w-full sm:w-auto sm:min-w-[12rem]">
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 sm:gap-x-10">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-red-400 font-semibold">Today</p>
                <p className="text-2xl font-bold text-red-600 leading-tight">
                  {missionsDone}
                  <span className="text-gray-400 font-semibold text-lg"> / {missionsTotal || "—"}</span>
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-red-400 font-semibold">Sets completed</p>
                <p className="text-2xl font-bold text-red-600 leading-tight">
                  {setsDone}
                  <span className="text-gray-400 font-semibold text-lg"> / {setsTotal}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">VIP Levels</h2>
            <p className="text-sm text-gray-500 mt-1">
              Your level is {currentVip?.name || "VIP 1"} from your ${balance.toFixed(2)} balance. Tap a level to view benefits.
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/home/level")}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded-full px-5 py-2.5 flex items-center shadow-md hover:shadow-lg transition-all duration-200"
          >
            View More
            <MdChevronRight className="text-2xl ml-1" />
          </motion.button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
          {isLoading ? (
            <p className="col-span-full text-center text-gray-500 py-8">Loading packs...</p>
          ) : error ? (
            <p className="col-span-full text-center text-red-500 py-8">Error loading packs</p>
          ) : packList.length > 0 ? (
            packList.map((pack, i) => {
              const meta = vipMeta(pack);
              const remaining = amountToReachVip(pack, balance);
              const isCurrent = vipLevel(pack) === vipLevel(currentVip);
              return (
                <motion.div
                  key={pack.id || i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.35 }}
                  whileHover={{ scale: 1.04, y: -4 }}
                  onClick={() => setVipDetailPack(pack)}
                  className={`bg-white p-4 sm:p-5 rounded-xl cursor-pointer shadow-md hover:shadow-xl flex flex-col justify-center items-center transition-all duration-300 border ${isCurrent ? "border-red-500 ring-2 ring-red-200" : meta.border}`}
                >
                  <div className="flex justify-between w-full items-center mb-3">
                    <VipBadge pack={pack} size={44} />
                    <span className="bg-red-600 text-white rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm">${pack.usd_value}</span>
                  </div>
                  <h3 className="font-bold text-gray-800 md:text-lg text-base text-center">{pack.name}</h3>
                  <p className={`text-[11px] font-semibold uppercase tracking-wide mt-0.5 mb-2 ${meta.text}`}>{meta.title}</p>
                  <p className="text-gray-600 text-xs md:text-sm text-center leading-relaxed line-clamp-2">
                    {pack.short_description || "Tap to see membership benefits"}
                  </p>
                  <p className={`mt-2 text-[11px] font-semibold ${isCurrent ? "text-red-600" : remaining > 0 ? "text-gray-500" : "text-emerald-600"}`}>
                    {isCurrent ? "Current level · View benefits" : remaining > 0 ? "Tap for details" : "Unlocked · View benefits"}
                  </p>
                </motion.div>
              );
            })
          ) : (
            <p className="col-span-full text-center text-gray-500 py-8">No packs available.</p>
          )}
        </div>
      </div>
      <VipLevelDetailSheet
        open={!!vipDetailPack}
        pack={vipDetailPack}
        balance={balance}
        currentLevel={vipLevel(currentVip)}
        onClose={() => setVipDetailPack(null)}
        onDeposit={openVipDeposit}
      />
      <BottomNav />
    </div>
  );
}
