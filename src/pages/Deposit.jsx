import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { FaCopy } from "react-icons/fa";
import BackButton from "../components/BackButton";
import { Spinner } from "../components/Loader";
import { fetchDeposits, submitDeposit } from "../store/slices/depositsSlice";
import { showApiError } from "../api/client";
import { fadeIn, slideIn } from "../utils/motion";
import { compressImage, formatFileSize } from "@shared/compressImage";

export default function Deposit() {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const deposits = useSelector((s) => s.deposits.deposits) || [];
  const user = useSelector((s) => s.profile.user);
  const submitting = useSelector((s) => s.deposits.isSubmitting);
  const preset = searchParams.get("amount");
  const [tab, setTab] = useState("deposit");
  const [amount, setAmount] = useState(() => {
    const n = Number(preset);
    return Number.isFinite(n) && n > 0 ? String(n) : "";
  });
  const [confirm, setConfirm] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);

  useEffect(() => {
    const n = Number(searchParams.get("amount"));
    if (Number.isFinite(n) && n > 0) setAmount(String(n));
  }, [searchParams]);

  useEffect(() => {
    if (!deposits.length) dispatch(fetchDeposits());
  }, [dispatch, deposits.length]);

  const onReceipt = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!String(file.type || "").startsWith("image/")) {
      toast.error("Please choose a JPG, PNG, or similar image.");
      return;
    }
    try {
      const compressed = await compressImage(file);
      setReceipt(compressed);
      setReceiptPreview(URL.createObjectURL(compressed));
      if (compressed.size < file.size) {
        toast.success(`Receipt optimized from ${formatFileSize(file.size)} to ${formatFileSize(compressed.size)}.`);
      }
    } catch (err) {
      toast.error(err.message || "Could not process this image.");
    }
  };

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Address copied to clipboard!");
  };

  const submit = async () => {
    if (!amount || !receipt) {
      toast.error("Amount and receipt are required!");
      return;
    }
    const result = await dispatch(submitDeposit({ amount, screenshot: receipt }));
    if (result.success) {
      toast.success("Deposit submitted successfully!");
      setConfirm(false);
      setAmount("");
      setReceipt(null);
      setReceiptPreview(null);
    } else showApiError(result.message);
  };

  return (
    <motion.div initial={fadeIn("right").initial} whileInView={fadeIn("right", 2).animate} className="max-w-full mx-auto md:p-6 p-2 md:mb-2 mb-52 bg-white rounded-lg">
      <BackButton />
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Deposit</h1>
      {confirm ? (
        <div>
          <div className="bg-red-600 text-white p-4 rounded-lg mb-4">
            <p>
              <span className="font-bold">ETH address:</span> {user?.settings?.erc_address || "0x2835a3a46a193946b395d877a29dc3bc51bd49"}
              <button onClick={() => copy(user?.settings?.erc_address)}>
                <FaCopy className="ml-2 cursor-pointer inline" />
              </button>
            </p>
            <p>
              <span className="font-bold">TRC20 address:</span> {user?.settings?.trc_address || "TTXWm4XjoRXem2Ce1KeevUcBrzK2Whpv61"}
              <button onClick={() => copy(user?.settings?.trc_address)}>
                <FaCopy className="ml-2 cursor-pointer inline" />
              </button>
            </p>
          </div>
          <div className="border p-4 rounded-lg text-center text-lg font-bold mb-4">Deposit: {amount || "N/A USD"}</div>
          <div className="mb-6">
            <label className="block text-gray-600 font-semibold mb-2">Deposit receipt</label>
            {receiptPreview && (
              <img src={receiptPreview} alt="Receipt Preview" className="w-full max-h-64 mb-4 object-cover rounded-lg" />
            )}
            <input type="file" accept="image/*" onChange={onReceipt} className="block w-full border p-2 rounded-lg" />
            <p className="text-xs text-gray-400 mt-2">JPG or PNG. Photos larger than 1MB are compressed automatically.</p>
          </div>
          <button onClick={submit} disabled={submitting} className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 flex justify-center items-center">
            {submitting ? <Spinner /> : "Confirm Deposit"}
          </button>
        </div>
      ) : (
        <>
          <div className="flex space-x-4 mb-10 border-b">
            <button onClick={() => setTab("deposit")} className={`pb-2 border-b-2 ${tab === "deposit" ? "border-red-600 text-red-600 font-semibold" : "border-transparent text-gray-500"}`}>
              Deposit Now
            </button>
            <button onClick={() => setTab("history")} className={`pb-2 border-b-2 ${tab === "history" ? "border-red-600 text-red-600 font-semibold" : "border-transparent text-gray-500"}`}>
              Deposit History
            </button>
          </div>
          {tab === "deposit" && (
            <motion.div initial={slideIn("right").initial} whileInView={slideIn("right", 2).animate}>
              <div className="bg-red-600 text-white p-4 rounded-lg mb-10">
                <p className="font-semibold text-sm">Total Balance</p>
                <p className="text-3xl font-bold">{Number(user?.wallet?.balance || 0).toFixed(2)} USD</p>
              </div>
              <div className="flex justify-between mb-10 gap-3">
                {[100, 200, 500].map((n) => (
                  <button key={n} onClick={() => setAmount(String(n))} className="bg-white border border-gray-300 rounded-lg p-4 w-full shadow text-gray-700 font-semibold hover:bg-gray-100">
                    USD <br /> {n}.00
                  </button>
                ))}
              </div>
              <div className="mb-10">
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Deposit Amount</label>
                <input type="number" id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount" className="mt-1 p-3 w-full border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500" />
              </div>
              <button onClick={() => setConfirm(true)} className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700">
                Next
              </button>
            </motion.div>
          )}
          {tab === "history" && (
            <div className="space-y-4">
              {deposits.length > 0 ? (
                deposits.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-white rounded-lg shadow border border-gray-200">
                    <div>
                      <p className="font-semibold text-gray-700">Deposit</p>
                      <p className="text-sm text-gray-500">{item.date}</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`${item.status === "Confirmed" ? "bg-green-500" : "bg-red-500"} text-white text-sm font-semibold px-3 py-1 rounded-full mb-1`}>
                        {item.status}
                      </span>
                      <p className="text-gray-700 font-bold">{item.amount} USD</p>
                      {item.created_at && (
                        <p className="text-gray-700 font-bold">
                          {new Date(item.created_at).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })} at{" "}
                          {new Date(item.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500">No deposit history available.</p>
              )}
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
