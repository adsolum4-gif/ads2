import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { FaUserCircle, FaStar, FaTimes } from "react-icons/fa";
import BottomNav from "../components/BottomNav";
import ProductImage from "../components/ProductImage";
import VipBadge from "../components/VipBadge";
import DailyResetBanner from "../components/DailyResetBanner";
import {
  dailyReviewResetSupportDraft,
  SUPPORT_STATE_DRAFT,
  SUPPORT_STATE_OPEN_COMPOSER,
} from "@shared/dailyReviewSupport";
import { formatDailyResetCountdown, msUntilNextMidnight, splitRemaining, useDailyResetCountdown } from "../utils/dailyResetTimer";
import { OvalLoader, Spinner } from "../components/Loader";
import { authApi, showApiError } from "../api/client";
import {
  isSpecialClearBlockedMessage,
  showSpecialTopUpRequiredModal,
  specialTopUpOwed,
} from "../utils/specialProductTopUp";
import { fetchProfileStart, fetchProfileSuccess, fetchProfileFailure } from "../store/slices/profileSlice";
import { fetchProducts, fetchCurrentGame, playGame } from "../store/slices/productsSlice";
import { fetchNotifications } from "../store/slices/notificationsSlice";

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function money(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

const RATING_LABELS = ["Tap a star to rate", "Poor", "Fair", "Good", "Great", "Excellent"];

function isDailySessionComplete(profile) {
  const done = Number(profile?.current_number_count ?? 0);
  const total = Number(profile?.total_number_can_play ?? 0);
  return total > 0 && done >= total;
}

function reviewSetsAllowed(profile) {
  const n = Number(profile?.review_sets_allowed ?? profile?.wallet?.package?.number_of_set ?? 1);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function reviewSetsCompleted(profile) {
  return Math.max(0, Number(profile?.review_sets_completed ?? 0));
}

function allReviewSetsComplete(profile) {
  return reviewSetsCompleted(profile) >= reviewSetsAllowed(profile) && isDailySessionComplete(profile);
}

function goToDailyReviewResetSupport(navigate, profile) {
  navigate("/home/support", {
    state: {
      [SUPPORT_STATE_OPEN_COMPOSER]: true,
      [SUPPORT_STATE_DRAFT]: dailyReviewResetSupportDraft(profile),
    },
  });
}

async function showDailySessionCompleteModal(totalTasks, navigate, profile) {
  const timer = formatDailyResetCountdown(splitRemaining(msUntilNextMidnight()));
  const noMoreRuns =
    reviewSetsCompleted(profile) >= reviewSetsAllowed(profile);
  const waitLine = noMoreRuns
    ? `<p style="line-height:1.55;margin-top:0.75rem"><strong>Wait for tomorrow</strong> (${timer}) or contact support if you need further assistance.</p>`
    : `<p style="line-height:1.55;margin-top:0.75rem"><strong>Wait for tomorrow</strong> (${timer}) or contact support for an early daily reset.</p>`;
  const result = await Swal.fire({
    title: "Congratulations!",
    html: `<p style="line-height:1.55">You have completed all <strong>${totalTasks}</strong> product reviews for this run.</p>${waitLine}`,
    icon: "success",
    showDenyButton: true,
    confirmButtonText: "Wait for reset",
    denyButtonText: "Contact support",
    confirmButtonColor: "#dc2626",
    denyButtonColor: "#374151",
    width: 360,
    padding: "1.75em 1.1em 1.25em",
    customClass: { popup: "special-product-swal" },
  });
  if (result.isDenied) goToDailyReviewResetSupport(navigate, profile);
}

export default function Starting() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const user = useSelector((s) => s.profile.user);
  const isLoading = useSelector((s) => s.products.isLoading);
  const currentLoading = useSelector((s) => s.products.isLoading_current);
  const products = useSelector((s) => s.products.products);
  const currentGame = useSelector((s) => s.products.currentGame);
  const { label: resetCountdownLabel } = useDailyResetCountdown();

  const missionsDone = Number(user?.current_number_count || 0);
  const missionsTotal = Number(user?.total_number_can_play || 0);
  const sessionComplete = isDailySessionComplete(user);
  const allSetsComplete = allReviewSetsComplete(user);

  const specialStillOwesTopUp = (game) =>
    Boolean(game?.special_product)
    && specialTopUpOwed(user?.wallet?.on_hold, game?.penalty_hold) >= 0.01;

  useEffect(() => {
    (async () => {
      dispatch(fetchProfileStart());
      const result = await authApi.fetchProfile();
      if (result.success) dispatch(fetchProfileSuccess(result.data));
      else if (!user) {
        dispatch(fetchProfileFailure(result.message));
        toast.error(result.message || "Failed to load profile.");
      }
    })();
  }, [dispatch]);

  useEffect(() => {
    if (!products?.length) dispatch(fetchProducts());
  }, [dispatch, products]);

  const refreshProfile = useCallback(async () => {
    const result = await authApi.fetchProfile();
    if (result.success) dispatch(fetchProfileSuccess(result.data));
    return result;
  }, [dispatch]);

  const slides = products?.length ? chunk(products, 7) : [[]];

  useEffect(() => {
    const id = setInterval(() => {
      setPage((p) => (p + 1) % Math.max(slides.length, 1));
    }, 3000);
    return () => clearInterval(id);
  }, [slides.length]);

  const commissionRate = useMemo(() => {
    const fromGame = Number(currentGame?.profit_rate);
    if (Number.isFinite(fromGame) && fromGame > 0) return fromGame;
    const fromPack = Number(user?.wallet?.package?.profit_percentage);
    if (Number.isFinite(fromPack) && fromPack > 0) return fromPack;
    return null;
  }, [currentGame?.profit_rate, user?.wallet?.package?.profit_percentage]);

  const reviewProducts = useMemo(() => {
    const assigned = (currentGame?.products || []).filter((p) => p && (p.name || p.image));
    if (assigned.length) return assigned;
    const pool = [...(products || [])].sort(() => Math.random() - 0.5);
    return pool.slice(0, 1);
  }, [currentGame, products]);

  const pictureGridClass =
    reviewProducts.length <= 1
      ? "grid grid-cols-1 max-w-[220px] mx-auto gap-2.5"
      : reviewProducts.length === 2
        ? "grid grid-cols-2 gap-2.5"
        : "grid grid-cols-2 sm:grid-cols-3 gap-2.5";

  const startTask = async () => {
    if (sessionComplete) return;
    const result = await dispatch(fetchCurrentGame());
    if (!result.success) {
      const message = typeof result.message === "string" ? result.message : "";
      if (/completed all product review sets/i.test(message)) {
        await refreshProfile();
        toast.info("You have completed all available product reviews. Contact support if you need assistance.");
        return;
      }
      if (/completed all tasks for today/i.test(message)) {
        const refreshed = await refreshProfile();
        const profile = refreshed?.success ? refreshed.data : user;
        const total = Number(profile?.total_number_can_play ?? missionsTotal);
        await showDailySessionCompleteModal(total || missionsDone, navigate, profile);
        return;
      }
      toast.error(message || "Unable to start this task.");
      return;
    }
    const game = result.data;
    if (!game?.id) {
      toast.error("No task is available right now.");
      return;
    }
    const specialNeedsTopUp =
      Boolean(game.special_product)
      && specialTopUpOwed(user?.wallet?.on_hold, game?.penalty_hold) >= 0.01;
    if (specialNeedsTopUp) {
      await refreshProfile();
      dispatch(fetchNotifications(true));
      const remaining = Number(game.top_up_amount);
      if (Number.isFinite(remaining) && remaining >= 0.01) {
        await Swal.fire({
          title: "Congratulations!",
          text: "You got a special product.",
          icon: "success",
          confirmButtonText: "Continue",
          confirmButtonColor: "#dc2626",
          width: 320,
          padding: "1.75em 1.1em 1.25em",
          customClass: { popup: "special-product-swal" },
        });
      }
    }
    setRating(0);
    setComment("");
    setOpen(true);
  };

  const submitReview = async () => {
    if (!rating || rating < 1 || rating > 5) {
      toast.error("Please select a rating between 1 and 5.");
      return;
    }
    const isSpecialTask = Boolean(currentGame?.special_product);
    const profile = await refreshProfile();
    const onHold = profile?.success ? profile.data?.wallet?.on_hold : user?.wallet?.on_hold;
    const stillOwed = specialTopUpOwed(onHold, currentGame?.penalty_hold);
    if (isSpecialTask && stillOwed >= 0.01) {
      await showSpecialTopUpRequiredModal(stillOwed);
      return;
    }
    const score = rating;
    const reviewComment = comment;
    setOpen(false);
    setSubmitting(true);
    try {
      const result = await dispatch(playGame(score, reviewComment));
      if (result?.success) {
        toast.success("Submission successful!");
        setRating(0);
        setComment("");
        const refreshed = await refreshProfile();
        const profile = refreshed?.success ? refreshed.data : user;
        if (isDailySessionComplete(profile)) {
          const total = Number(profile?.total_number_can_play ?? missionsTotal);
          await showDailySessionCompleteModal(total, navigate, profile);
        }
      } else {
        setOpen(true);
        const msg = typeof result?.message === "string" ? result.message : "";
        const owed = specialTopUpOwed(user?.wallet?.on_hold, currentGame?.penalty_hold);
        if (isSpecialTask && (owed >= 0.01 || isSpecialClearBlockedMessage(msg))) {
          if (owed >= 0.01) await showSpecialTopUpRequiredModal(owed);
          else showApiError(msg || result);
        } else {
          showApiError(msg || result);
        }
      }
    } catch (err) {
      setOpen(true);
      const msg = err?.response?.data?.message || err?.message || "";
      const owed = specialTopUpOwed(user?.wallet?.on_hold, currentGame?.penalty_hold);
      if (isSpecialTask && (owed >= 0.01 || isSpecialClearBlockedMessage(msg))) {
        if (owed >= 0.01) await showSpecialTopUpRequiredModal(owed);
        else showApiError(err);
      } else {
        showApiError(err);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const holdAmount = Number(user?.wallet?.on_hold);
  const clearHoldAmount =
    Number.isFinite(holdAmount) && holdAmount <= -0.01 ? Math.abs(holdAmount) : 0;

  const stats = [
    { label: "Wallet Balance", amount: `$${money(user?.wallet?.balance)}`, description: "Does not reset after 24 hours" },
    { label: "Today's Profit", amount: `$${money(user?.today_profit)}`, description: "Resets after 24 hours" },
    {
      label: "On Hold",
      amount: `$${money(user?.wallet?.on_hold)}`,
      description: clearHoldAmount > 0 ? "Negative amount held on this account" : "Will be added to your balance",
      clearNow: clearHoldAmount > 0,
    },
    { label: "Salary", amount: `$${money(user?.wallet?.salary)}`, description: "Accumulated from completed tasks" },
  ];

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-50 pb-4">
      <div className="w-full mx-auto mt-4 bg-white rounded-xl shadow-lg p-5 border border-gray-100">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center">
            {user?.profile_picture ? (
              <img src={user.profile_picture} alt="Profile" className="w-14 h-14 md:mr-6 mr-3 rounded-full object-cover border-2 border-red-100 shadow-md" />
            ) : (
              <div className="w-14 h-14 md:mr-6 mr-3 rounded-full bg-red-50 flex items-center justify-center">
                <FaUserCircle className="text-4xl md:text-5xl text-red-600" />
              </div>
            )}
            <p className="font-bold text-xl text-gray-800">Hi, {user?.first_name} 👋</p>
          </div>
          <div className="rounded-xl p-1.5 shadow-sm">
            <VipBadge pack={user?.wallet?.package} size={56} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {stats.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="relative p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 border border-red-200"
            >
              {item.clearNow && (
                <button
                  type="button"
                  onClick={() => navigate(`/home/deposit?amount=${clearHoldAmount.toFixed(2)}`)}
                  className="absolute top-3 right-3 text-[11px] font-semibold text-red-600 hover:text-red-700 underline underline-offset-2"
                >
                  Clear now
                </button>
              )}
              <p className="font-bold text-sm text-gray-800 mb-1 pr-16">{item.label}</p>
              <p className="text-xs text-gray-600 mb-2">{item.description}</p>
              <p className="text-red-600 font-bold text-xl">
                {item.amount} <span className="text-sm text-gray-600">USD</span>
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="w-full h-auto mt-6 bg-white rounded-xl shadow-lg p-5 border border-gray-100">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Start Optimization</h2>
            <p className="text-sm text-gray-500 mt-1">Review and submit tasks</p>
          </div>
          <div className="bg-red-50 px-4 py-2.5 rounded-xl text-center shrink-0">
            <p className="text-[10px] uppercase tracking-wide text-red-400 font-semibold">Today</p>
            <p className="text-red-600 text-xl font-bold leading-tight">
              {missionsDone}
              <span className="text-gray-500 font-semibold text-base"> / {missionsTotal}</span>
            </p>
            <p className="text-[10px] uppercase tracking-wide text-red-400 font-semibold mt-2">Sets completed</p>
            <p className="text-red-600 text-lg font-bold leading-tight">
              {reviewSetsCompleted(user)}
              <span className="text-gray-500 font-semibold text-sm"> / {reviewSetsAllowed(user)}</span>
            </p>
          </div>
        </div>
        <DailyResetBanner onReset={refreshProfile} />
        {sessionComplete ? (
          <div className="relative flex justify-center items-center w-full mt-5 min-h-[200px] rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50/90 to-white px-6 py-10 text-center">
            <div>
              <p className="text-4xl mb-3" aria-hidden>
                ✅
              </p>
              <p className="text-lg font-bold text-gray-800">
                {allSetsComplete ? "All product reviews completed" : "All tasks completed for this run"}
              </p>
              <p className="text-sm text-gray-600 mt-2 max-w-sm mx-auto leading-relaxed">
                {allSetsComplete
                  ? "Contact support if you need further assistance, or wait for "
                  : "Come back in "}
                <span className="font-semibold text-emerald-800">{resetCountdownLabel}</span>
                {allSetsComplete ? "." : " for a new daily reset, or ask support to reset this run early."}
              </p>
              <button
                type="button"
                onClick={() => goToDailyReviewResetSupport(navigate, user)}
                className="mt-5 inline-flex items-center justify-center rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-5 py-2.5 shadow-md shadow-red-600/20"
              >
                Contact support to reset reviews
              </button>
            </div>
          </div>
        ) : (
          <div className="relative flex justify-center items-center w-full mt-5">
            <button
              type="button"
              onClick={() => setPage((p) => (p - 1 + slides.length) % Math.max(slides.length, 1))}
              className="absolute left-0 bg-white hover:bg-gray-50 p-3 rounded-full z-10 shadow-md border border-gray-200"
            >
              ❮
            </button>
            {isLoading && !products?.length ? (
              <Spinner color="red" />
            ) : slides[0]?.length > 0 ? (
              <div>
                <div className="col-span-4 flex justify-around w-full">
                  {slides[page]?.slice(0, 4).map((p, i) => (
                    <div
                      key={p.id || i}
                      className="flex justify-center items-center border rounded-full mx-4 md:mx-10 bg-gray-100 p-0.5 h-[70px] w-[70px] md:w-[150px] md:h-[150px] overflow-hidden"
                    >
                      <ProductImage
                        src={p.image}
                        name={p.name}
                        alt={p.name || `Product ${i + 1}`}
                        className="w-full h-full object-cover rounded-full"
                      />
                    </div>
                  ))}
                </div>
                <div className="col-span-4 flex justify-center mt-4">
                  {slides[page]?.slice(4, 7).map((p, i) => (
                    <div
                      key={p.id || i}
                      className="flex justify-center items-center border rounded-full bg-gray-100 p-0.5 mx-4 md:mx-14 w-[70px] h-[70px] md:w-[100px] md:h-[100px] lg:w-[150px] lg:h-[150px] overflow-hidden"
                    >
                      <ProductImage
                        src={p.image}
                        name={p.name}
                        alt={p.name || `Product ${i + 5}`}
                        className="w-full h-full object-cover rounded-full"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => setPage((p) => (p + 1) % Math.max(slides.length, 1))}
              className="absolute right-0 bg-white hover:bg-gray-50 p-3 rounded-full z-10 shadow-md border border-gray-200"
            >
              ❯
            </button>
          </div>
        )}
        <motion.button
          type="button"
          whileHover={sessionComplete ? undefined : { scale: 1.02 }}
          whileTap={sessionComplete ? undefined : { scale: 0.98 }}
          onClick={startTask}
          disabled={sessionComplete || submitting}
          className={`mt-6 font-bold py-3.5 px-6 rounded-xl w-full text-center shadow-md ${
            sessionComplete
              ? "bg-gray-200 text-gray-600 cursor-not-allowed shadow-none"
              : "bg-red-600 hover:bg-red-700 text-white shadow-red-600/25"
          }`}
        >
          {sessionComplete ? "All tasks completed for the day" : "Starting"}
        </motion.button>
        {sessionComplete && (
          <div className="text-center mt-2 space-y-2">
            <p className="text-xs text-gray-500">New product reviews in {resetCountdownLabel}</p>
            <button
              type="button"
              onClick={() => goToDailyReviewResetSupport(navigate, user)}
              className="text-xs font-semibold text-red-600 hover:text-red-700 underline underline-offset-2"
            >
              Contact support for an early reset
            </button>
          </div>
        )}
      </div>

      <div className="w-full md:mb-2 mb-52 mx-auto mt-6 bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-3 flex items-center">
          <span className="bg-red-600 text-white rounded-lg px-2 py-1 text-sm mr-2">ℹ️</span>
          Important Information
        </h2>
        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start">
            <span className="text-red-600 mr-2 mt-1">•</span>
            <span>
              <strong>Working hours:</strong> {user?.settings?.service_availability_start_time || "00:00"} - {user?.settings?.service_availability_end_time || "23:00:00"}
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-red-600 mr-2 mt-1">•</span>
            <span>For inquiries about applicants, please consult Customer Support Services</span>
          </li>
        </ul>
      </div>

      {currentLoading && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20">
          <OvalLoader />
        </div>
      )}

      <AnimatePresence>
        {open && currentGame && (
          <motion.div
            key="task-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-3 sm:px-4"
          >
            <button
              type="button"
              aria-label="Close task review"
              className="absolute inset-0 bg-[#0f0a0a]/75 backdrop-blur-md"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              transition={{ type: "spring", damping: 24, stiffness: 260 }}
              className="relative w-full max-w-lg mb-4 sm:mb-0 bg-white rounded-[28px] shadow-[0_24px_80px_rgba(15,10,10,0.45)] overflow-hidden max-h-[92vh] flex flex-col border border-white/70"
            >
              <div className="relative overflow-hidden bg-gradient-to-br from-[#1a0b0d] via-[#4a1018] to-[#c7081e] px-6 pt-6 pb-7 text-white">
                <div className="absolute -top-16 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-red-400/20 blur-2xl" />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/90"
                >
                  <FaTimes />
                </button>
                <p className="text-[11px] tracking-[0.22em] uppercase text-white/65 font-medium">Product review</p>
                <h2 className="text-2xl font-semibold mt-1 tracking-tight">Submit your review</h2>
                <p className="text-sm text-white/75 mt-1.5 pr-8">
                  {specialStillOwesTopUp(currentGame)
                    ? "Special product review — top up required"
                    : currentGame.special_product
                      ? "Complete your assigned product review"
                      : "Rate the product assigned to this task."}
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="text-[11px] font-semibold uppercase tracking-wider bg-white/12 border border-white/15 rounded-full px-3 py-1">
                    Randomized set
                  </span>
                  {specialStillOwesTopUp(currentGame) && (
                    <span className="text-[11px] font-semibold uppercase tracking-wider bg-amber-300/20 border border-amber-200/40 text-amber-100 rounded-full px-3 py-1">
                      Special product
                    </span>
                  )}
                </div>
              </div>

              <div className="px-5 py-5 overflow-y-auto space-y-5">
                <div className={pictureGridClass}>
                  {reviewProducts.map((p) => (
                    <div key={p.id || p.name} className="rounded-2xl border border-gray-100 bg-gray-50/80 overflow-hidden shadow-sm">
                      <div className="aspect-square bg-white">
                        <ProductImage src={p.image} name={p.name} alt={p.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="px-2 py-2 text-center">
                        <p className="text-[11px] sm:text-xs font-semibold text-gray-800 leading-tight line-clamp-2 min-h-[2rem]">{p.name}</p>
                        {(() => {
                          const isSpecial = specialStillOwesTopUp(currentGame);
                          const linePrice = p.price;
                          if (linePrice == null) return null;
                          return (
                            <p className="text-[11px] font-bold text-red-600 mt-1">
                              ${money(linePrice)}
                              {isSpecial && <span className="block text-[10px] font-medium text-amber-700/90">Combination task value</span>}
                            </p>
                          );
                        })()}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-gray-100 bg-gradient-to-b from-white to-gray-50 px-4 py-4 text-center">
                  <p className="text-xs font-semibold tracking-wide uppercase text-gray-400">Star rating</p>
                  <div className="flex justify-center gap-2 mt-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setRating(i + 1)}
                        className="p-1"
                        aria-label={`Rate ${i + 1} star${i === 0 ? "" : "s"}`}
                      >
                        <FaStar className={`text-2xl sm:text-3xl transition-transform ${i < rating ? "text-amber-400 scale-110" : "text-gray-200 hover:text-amber-200"}`} />
                      </button>
                    ))}
                  </div>
                  <p className={`text-sm mt-1.5 font-medium ${rating ? "text-gray-800" : "text-gray-400"}`}>{RATING_LABELS[rating]}</p>
                </div>

                <textarea
                  placeholder="Leave an optional comment..."
                  className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-red-500/25 focus:border-red-500"
                  rows="3"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-[#0f0a0a] text-white px-4 py-3.5">
                    <p className="text-[11px] uppercase tracking-wider text-white/50">Total amount</p>
                    <p className="text-xl font-semibold mt-0.5">${money(currentGame.amount)}</p>
                  </div>
                  <div className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3.5">
                    <p className="text-[11px] uppercase tracking-wider text-red-400">Commission</p>
                    <p className="text-xl font-semibold text-red-600 mt-0.5">${money(currentGame.commission)}</p>
                    {commissionRate != null && !currentGame?.special_product && (
                      <p className="text-[11px] text-red-500/90 mt-1 leading-snug">
                        ${money(currentGame.amount)} × {Number(commissionRate).toFixed(2)}%
                        {currentGame.pack_name ? ` (${currentGame.pack_name})` : ""}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 px-1">
                  <span>Created {currentGame.created_at ? new Date(currentGame.created_at).toLocaleString() : "—"}</span>
                  <span className="font-semibold text-gray-700">Rating no. {currentGame.rating_no || 5}</span>
                </div>

                <button
                  type="button"
                  onClick={submitReview}
                  disabled={submitting}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:text-gray-500 text-white font-semibold py-3.5 rounded-2xl flex justify-center items-center shadow-lg shadow-red-600/25"
                >
                  {submitting ? <Spinner /> : currentGame?.pending ? "Confirm submission" : "Submit task"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <BottomNav />
    </div>
  );
}
