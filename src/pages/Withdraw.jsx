import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { toast } from "sonner";
import BackButton from "../components/BackButton";
import { Spinner } from "../components/Loader";
import { fetchWithdrawals, makeWithdrawal } from "../store/slices/withdrawalsSlice";
import { showApiError } from "../api/client";
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
          <div className="mb-10">
            <label className="block text-sm font-medium text-gray-700">Withdrawal Password</label>
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" className="mt-1 p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500" />
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
    </div>
  );
}
