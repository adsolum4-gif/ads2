import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { toast } from "sonner";
import BackButton from "../components/BackButton";
import { Spinner } from "../components/Loader";
import { fetchWithdrawals, makeWithdrawal } from "../store/slices/withdrawalsSlice";
import { authApi, showApiError } from "../api/client";
import { slideIn } from "../utils/motion";
import PasswordInput from "../components/PasswordInput";

export default function Withdraw() {
  const dispatch = useDispatch();
  const history = useSelector((s) => s.withdrawals.history) || [];
  const loading = useSelector((s) => s.withdrawals.isLoading);
  const submitting = useSelector((s) => s.withdrawals.isSubmitting);
  const user = useSelector((s) => s.profile.user);
  const [tab, setTab] = useState("withdraw");
  const [amount, setAmount] = useState("");
  const [password, setPassword] = useState("");
  const [showSetPin, setShowSetPin] = useState(false);
  const [pin, setPin] = useState({ new_password: "", confirm_new_password: "" });
  const [savingPin, setSavingPin] = useState(false);

  useEffect(() => {
    dispatch(fetchWithdrawals());
  }, [dispatch]);

  const submit = async () => {
    if (!amount || !password) {
      toast.error("Both amount and password are required.");
      return;
    }
    if (Number(amount) <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }
    const result = await dispatch(makeWithdrawal({ amount, password }));
    if (!result.success) showApiError(result.message);
    else {
      setAmount("");
      setPassword("");
      dispatch(fetchWithdrawals());
    }
  };

  const saveWithdrawalPassword = async () => {
    const next = pin.new_password;
    const confirmPin = pin.confirm_new_password;
    if (!next || !confirmPin) {
      toast.error("Enter and confirm the withdrawal password.");
      return;
    }
    if (next.length !== 4 || Number.isNaN(Number(next))) {
      toast.error("Withdrawal password must be exactly 4 digits.");
      return;
    }
    if (next !== confirmPin) {
      toast.error("Withdrawal passwords do not match.");
      return;
    }
    setSavingPin(true);
    try {
      await authApi.setTransactionPassword({ new_password: next });
      toast.success("Withdrawal password set successfully.");
      setShowSetPin(false);
      setPin({ new_password: "", confirm_new_password: "" });
    } catch (err) {
      showApiError(err);
    } finally {
      setSavingPin(false);
    }
  };

  return (
    <div className="mx-auto md:p-6 p-2 md:mb-2 mb-52 bg-white rounded-lg">
      <BackButton />
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Withdraw</h1>
      <div className="flex space-x-4 mb-10 border-b">
        <button onClick={() => setTab("withdraw")} className={`pb-2 border-b-2 ${tab === "withdraw" ? "border-red-600 text-red-600 font-semibold" : "border-transparent text-gray-500"}`}>
          Withdraw Now
        </button>
        <button onClick={() => setTab("history")} className={`pb-2 border-b-2 ${tab === "history" ? "border-red-600 text-red-600 font-semibold" : "border-transparent text-gray-500"}`}>
          Withdrawal History
        </button>
      </div>
      {tab === "withdraw" && (
        <motion.div initial={slideIn("right").initial} animate={slideIn("right", 2).animate}>
          <div className="bg-red-600 text-white p-4 rounded-lg mb-10">
            <p className="font-semibold text-sm">Total Balance</p>
            <p className="text-3xl font-bold">{Number(user?.wallet?.balance || 0).toFixed(2)} USD</p>
          </div>
          <div className="mb-10">
            <label className="block text-sm font-medium text-gray-700">Withdrawal Amount</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount" className="mt-1 p-3 w-full border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500" />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700">Withdrawal Password</label>
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" maxLength={4} className="mt-1 p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500" />
            <button
              type="button"
              onClick={() => setShowSetPin(true)}
              className="mt-3 w-full border border-red-200 text-red-600 font-semibold py-2.5 rounded-xl hover:bg-red-50"
            >
              Set withdrawal password
            </button>
          </div>
          <button onClick={submit} disabled={submitting} className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 flex items-center justify-center">
            {submitting ? <Spinner /> : "Submit"}
          </button>
        </motion.div>
      )}
      {tab === "history" && (
        <div className="space-y-4">
          {loading ? (
            <Spinner color="red" />
          ) : Array.isArray(history) && history.length > 0 ? (
            history.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-white rounded-lg shadow border border-gray-200">
                <div>
                  <p className="font-semibold text-gray-700">Withdrawal</p>
                  <p className="text-sm text-gray-500">{item.date}</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`${item.status === "Processed" ? "bg-green-500" : item.status === "Pending" ? "bg-yellow-500" : "bg-red-500"} text-white text-sm font-semibold px-3 py-1 rounded-full mb-1`}>
                    {item.status}
                  </span>
                  <p className="text-gray-700 font-bold">{item.amount} USD</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500">No withdrawal history available.</p>
          )}
        </div>
      )}
      {showSetPin && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full relative">
            <button onClick={() => setShowSetPin(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 font-bold text-lg">✕</button>
            <h2 className="text-xl font-bold mb-1">Set withdrawal password</h2>
            <p className="text-sm text-gray-500 mb-4">Choose a 4-digit code for withdrawals. Current password is not required.</p>
            <div className="mb-3">
              <label className="text-gray-600 font-semibold text-sm">New withdrawal password</label>
              <PasswordInput value={pin.new_password} onChange={(e) => setPin((p) => ({ ...p, new_password: e.target.value }))} placeholder="4 digits" maxLength={4} className="mt-1 p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500" />
            </div>
            <div className="mb-4">
              <label className="text-gray-600 font-semibold text-sm">Confirm withdrawal password</label>
              <PasswordInput value={pin.confirm_new_password} onChange={(e) => setPin((p) => ({ ...p, confirm_new_password: e.target.value }))} placeholder="4 digits" maxLength={4} className="mt-1 p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500" />
            </div>
            <button onClick={saveWithdrawalPassword} className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold flex justify-center hover:bg-red-700">
              {savingPin ? <Spinner /> : "Save password"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
