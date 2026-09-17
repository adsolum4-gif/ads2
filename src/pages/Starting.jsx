import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { FaUserCircle, FaStar, FaTimes } from "react-icons/fa";
import BottomNav from "../components/BottomNav";
import ProductImage from "../components/ProductImage";
import VipBadge from "../components/VipBadge";
import DailyResetBanner from "../components/DailyResetBanner";
import { OvalLoader, Spinner } from "../components/Loader";
import { authApi, showApiError } from "../api/client";
import { fetchProfileStart, fetchProfileSuccess, fetchProfileFailure } from "../store/slices/profileSlice";
import { fetchProducts, fetchCurrentGame, playGame } from "../store/slices/productsSlice";

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

export default function Starting() {
  const dispatch = useDispatch();
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
  }, [dispatch]);

  const slides = products?.length ? chunk(products, 7) : [[]];

  useEffect(() => {
    const id = setInterval(() => {
      setPage((p) => (p + 1) % Math.max(slides.length, 1));
    }, 3000);
    return () => clearInterval(id);
  }, [slides.length]);

  const reviewProducts = useMemo(() => {
    const assigned = (currentGame?.products || []).filter((p) => p && (p.name || p.image));
    if (assigned.length) return assigned.slice(0, 3);
    return [...(products || [])].sort(() => Math.random() - 0.5).slice(0, 3);
  }, [currentGame, products]);

  const startTask = async () => {
    const result = await dispatch(fetchCurrentGame());
    if (!result.success) {
      toast.error(typeof result.message === "string" ? result.message : "Unable to start this task.");
      return;
    }
    const game = result.data;
    if (!game?.id) {
      toast.error("No task is available right now.");
      return;
    }
    if (game.special_product) {
      Swal.fire({
        title: "Congratulations! You got a special product!",
        text: "This submission contains a special product. Enjoy a higher commission.",
        icon: "success",
        confirmButtonText: "OK",
        customClass: { popup: "custom-swal-mobile-size" },
      });
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
    setSubmitting(true);
    try {
      const result = await dispatch(playGame(rating, comment));
      if (result?.success) {
        toast.success("Submission successful!");
        setRating(0);
        setComment("");
        setOpen(false);
      } else {
        showApiError(result);
      }
    } catch (err) {
      showApiError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const stats = [
    { label: "Wallet Balance", amount: `$${money(user?.wallet?.balance)}`, description: "Profits will be added here" },
    { label: "Today's Profit", amount: `$${money(user?.today_profit)}`, description: "Profit earned" },
    { label: "On Hold", amount: `$${money(user?.wallet?.on_hold)}`, description: "Will be added to your balance" },
    { label: "Salary", amount: `$${money(user?.wallet?.salary)}`, description: "Today's salary" },
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
              className="p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 border border-red-200"
            >
              <p className="font-bold text-sm text-gray-800 mb-1">{item.label}</p>
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
          <div className="bg-red-50 px-4 py-2 rounded-xl text-center">
            <p className="text-[10px] uppercase tracking-wide text-red-400 font-semibold">Today</p>
            <p className="text-red-600 text-xl font-bold">
              {user?.current_number_count || 0} / {user?.total_number_can_play || 0}
            </p>
          </div>
        </div>
        <DailyResetBanner onReset={refreshProfile} />
        <div className="relative flex justify-center items-center w-full mt-5">
          <button onClick={() => setPage((p) => (p - 1 + slides.length) % Math.max(slides.length, 1))} className="absolute left-0 bg-white hover:bg-gray-50 p-3 rounded-full z-10 shadow-md border border-gray-200">
            ❮
          </button>
          {isLoading && !products?.length ? (
            <Spinner color="red" />
          ) : slides[0]?.length > 0 ? (
            <div>
              <div className="col-span-4 flex justify-around w-full">
                {slides[page]?.slice(0, 4).map((p, i) => (
                  <div key={p.id || i} className="flex justify-center items-center border rounded-full mx-4 md:mx-10 bg-gray-100 p-0.5 h-[70px] w-[70px] md:w-[150px] md:h-[150px] overflow-hidden">
                    <ProductImage src={p.image} name={p.name} alt={p.name || `Product ${i + 1}`} className="w-full h-full object-cover rounded-full" />
                  </div>
                ))}
              </div>
              <div className="col-span-4 flex justify-center mt-4">
                {slides[page]?.slice(4, 7).map((p, i) => (
                  <div key={p.id || i} className="flex justify-center items-center border rounded-full bg-gray-100 p-0.5 mx-4 md:mx-14 w-[70px] h-[70px] md:w-[100px] md:h-[100px] lg:w-[150px] lg:h-[150px] overflow-hidden">
                    <ProductImage src={p.image} name={p.name} alt={p.name || `Product ${i + 5}`} className="w-full h-full object-cover rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <button onClick={() => setPage((p) => (p + 1) % Math.max(slides.length, 1))} className="absolute right-0 bg-white hover:bg-gray-50 p-3 rounded-full z-10 shadow-md border border-gray-200">
            ❯
          </button>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={startTask}
          className="mt-6 bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 px-6 rounded-xl w-full text-center shadow-md"
        >
          Starting
        </motion.button>
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
                <p className="text-sm text-white/75 mt-1.5 pr-8">Rate the products randomly assigned to this task.</p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="text-[11px] font-semibold uppercase tracking-wider bg-white/12 border border-white/15 rounded-full px-3 py-1">
                    Randomized set
                  </span>
                  {currentGame.special_product && (
                    <span className="text-[11px] font-semibold uppercase tracking-wider bg-amber-300/95 text-amber-950 rounded-full px-3 py-1">
                      Special product
                    </span>
                  )}
                </div>
              </div>

              <div className="px-5 py-5 overflow-y-auto space-y-5">
                <div className="grid grid-cols-3 gap-2.5">
                  {reviewProducts.map((p) => (
                    <div key={p.id || p.name} className="rounded-2xl border border-gray-100 bg-gray-50/80 overflow-hidden shadow-sm">
                      <div className="aspect-square bg-white">
                        <ProductImage src={p.image} name={p.name} alt={p.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="px-2 py-2 text-center">
                        <p className="text-[11px] sm:text-xs font-semibold text-gray-800 leading-tight line-clamp-2 min-h-[2rem]">{p.name}</p>
                        {p.price != null && (
                          <p className="text-[11px] font-bold text-red-600 mt-1">${money(p.price)}</p>
                        )}
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
