import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import BackButton from "../components/BackButton";
import Loader, { Spinner } from "../components/Loader";
import { fetchPaymentMethod, postPaymentMethod, setPaymentData } from "../store/slices/paymentsSlice";
import { showApiError } from "../api/client";

export default function Payment() {
  const dispatch = useDispatch();
  const { data, isLoading } = useSelector((s) => s.payments);

  useEffect(() => {
    if (!data) dispatch(fetchPaymentMethod());
  }, [dispatch, data]);

  const setField = (key, value) => dispatch(setPaymentData({ ...data, [key]: value }));

  const save = async () => {
    if (!data?.wallet || !data?.exchange) {
      toast.error("Both Wallet Address and Exchange fields are required.");
      return;
    }
    try {
      const result = await dispatch(postPaymentMethod({ wallet: data.wallet, exchange: data.exchange }));
      if (result.success) toast.success("Payment details updated successfully!");
      else showApiError(result);
    } catch (err) {
      showApiError(err);
    }
  };

  if (isLoading && !data) return <Loader />;

  return (
    <div className="bg-gray-50 p-2 md:p-6">
      <BackButton />
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <p className="text-green-600 mb-4">Dear user, for your security please do not enter your bank details.</p>
        <Field label="Name" value={data?.name} readOnly />
        <Field label="Phone Number" value={data?.phone_number} readOnly />
        <Field label="Email Address" value={data?.email_address} readOnly />
        <Field label="Wallet Address" value={data?.wallet} onChange={(v) => setField("wallet", v)} />
        <Field label="Exchange" value={data?.exchange} onChange={(v) => setField("exchange", v)} />
      </div>
      <button onClick={save} disabled={isLoading} className="w-full bg-red-600 md:mb-2 mb-52 text-white font-semibold py-3 rounded-lg mt-6 flex items-center justify-center">
        {isLoading ? <Spinner /> : "Confirm"}
      </button>
    </div>
  );
}

function Field({ label, value, onChange, readOnly }) {
  return (
    <div>
      <label className="text-gray-600 font-semibold">{label}</label>
      <input
        type="text"
        value={value || ""}
        readOnly={readOnly}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className={`w-full mt-1 p-2 border rounded-lg ${readOnly ? "bg-gray-100 cursor-not-allowed" : "focus:outline-none focus:ring-2 focus:ring-red-600"}`}
      />
    </div>
  );
}
