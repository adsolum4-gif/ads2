import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import BackButton from "../components/BackButton";
import Loader, { Spinner } from "../components/Loader";
import { authApi, showApiError } from "../api/client";
import { fetchProfileStart, fetchProfileSuccess, fetchProfileFailure, setImagePreview, updateProfileSuccess } from "../store/slices/profileSlice";
import PasswordInput from "../components/PasswordInput";

export default function Personal() {
  const dispatch = useDispatch();
  const { user = {}, isLoading, profilePicture, imagePreview } = useSelector((s) => s.profile);
  const [loginPass, setLoginPass] = useState({ current_password: "", new_password: "", confirm_new_password: "" });
  const [txnPass, setTxnPass] = useState({ current_password: "", new_password: "", confirm_new_password: "" });
  const [showLogin, setShowLogin] = useState(false);
  const [showTxn, setShowTxn] = useState(false);
  const [savingLogin, setSavingLogin] = useState(false);
  const [savingTxn, setSavingTxn] = useState(false);

  useEffect(() => {
    if (!user?.username) {
      (async () => {
        dispatch(fetchProfileStart());
        const result = await authApi.fetchProfile();
        if (result.success) dispatch(fetchProfileSuccess(result.data));
        else dispatch(fetchProfileFailure(result.message));
      })();
    }
  }, [dispatch, user]);

  const setField = (e) => {
    dispatch(updateProfileSuccess({ ...user, [e.target.name]: e.target.value }));
  };

  const onFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      dispatch(setImagePreview(reader.result));
      dispatch(updateProfileSuccess({ ...user, profile_picture: file }));
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    if (!user.username || !user.email || !user.phone_number) {
      toast.error("Username, email, and phone number are required.");
      return;
    }
    try {
      const payload = { ...user };
      if (typeof profilePicture === "string" && profilePicture.startsWith("http")) {
        delete payload.profile_picture;
      }
      const data = await authApi.updateProfile(payload);
      toast.success("Profile updated successfully.");
      dispatch(updateProfileSuccess(data.data || data));
    } catch (err) {
      showApiError(err);
    }
  };

  const saveLoginPass = async () => {
    if (!loginPass.current_password || !loginPass.new_password || !loginPass.confirm_new_password) {
      toast.error("All password fields are required.");
      return;
    }
    if (loginPass.new_password !== loginPass.confirm_new_password) {
      toast.error("New passwords do not match.");
      return;
    }
    if (loginPass.current_password === loginPass.new_password) {
      toast.error("New password cannot be the same as the current password.");
      return;
    }
    setSavingLogin(true);
    try {
      await authApi.changePassword({ current_password: loginPass.current_password, new_password: loginPass.new_password });
      toast.success("Password updated successfully.");
      setShowLogin(false);
      setLoginPass({ current_password: "", new_password: "", confirm_new_password: "" });
    } catch (err) {
      showApiError(err);
    } finally {
      setSavingLogin(false);
    }
  };

  const saveTxnPass = async () => {
    const { current_password, new_password, confirm_new_password } = txnPass;
    if (!current_password || !new_password || !confirm_new_password) return toast.error("All fields are required.");
    if (new_password !== confirm_new_password) return toast.error("New password and confirm password must match.");
    if (current_password === new_password) return toast.error("New transaction password cannot be the same as the current password.");
    if (new_password.length !== 4 || Number.isNaN(Number(new_password))) return toast.error("Transaction password must be exactly 4 numeric characters.");
    setSavingTxn(true);
    try {
      await authApi.changeTransactionPassword({ current_password, new_password });
      toast.success("Transaction password updated successfully.");
      setShowTxn(false);
      setTxnPass({ current_password: "", new_password: "", confirm_new_password: "" });
    } catch (err) {
      showApiError(err);
    } finally {
      setSavingTxn(false);
    }
  };

  if (isLoading || !user) return <Loader />;

  return (
    <div className="bg-gray-50 md:p-6 p-2">
      <BackButton />
      <div className="bg-white rounded-lg shadow p-4 space-y-4 mb-6">
        <div>
          <label className="text-gray-600 font-semibold">Profile Picture</label>
          <div className="flex items-center space-x-4 mt-2">
            {(imagePreview || profilePicture) && (
              <img src={imagePreview || profilePicture} alt="Profile Preview" className="w-16 h-16 rounded-full object-cover border" />
            )}
            <input type="file" accept="image/*" onChange={onFile} className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600" />
          </div>
        </div>
        {["username", "email", "phone_number", "first_name", "last_name"].map((name) => (
          <div key={name}>
            <label className="text-gray-600 font-semibold">{labelMap[name]}</label>
            <input type={name === "email" ? "email" : "text"} name={name} value={user[name] || ""} onChange={setField} className="w-full mt-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600" />
          </div>
        ))}
        <div>
          <label className="text-gray-600 font-semibold">Gender</label>
          <div className="mt-2 flex space-x-4">
            <label className="flex items-center space-x-2">
              <input type="radio" name="gender" value="M" checked={user.gender === "M"} onChange={setField} className="form-radio h-4 w-4 text-red-600" />
              <span className="text-gray-700">Male</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="radio" name="gender" value="F" checked={user.gender === "F"} onChange={setField} className="form-radio h-4 w-4 text-red-600" />
              <span className="text-gray-700">Female</span>
            </label>
          </div>
        </div>
        <div>
          <label className="text-gray-600 font-semibold">Referral Code</label>
          <input type="text" value={user.referral_code || ""} readOnly className="w-full mt-1 p-2 border rounded-lg bg-gray-100 cursor-not-allowed" />
        </div>
      </div>
      <div className="md:space-x-4 md:space-y-0 md:flex md:mb-2 mb-52 grid space-y-4">
        <button onClick={saveProfile} className="w-full bg-red-600 text-white font-semibold py-3 rounded-lg hover:bg-red-500">Update</button>
        <button onClick={() => setShowLogin(true)} className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-500">Change Login Password</button>
        <button onClick={() => setShowTxn(true)} className="w-full bg-yellow-600 text-white font-semibold py-3 rounded-lg hover:bg-yellow-500">Change Transaction Password</button>
      </div>
      {showLogin && (
        <Modal title="Change Login Password" onClose={() => setShowLogin(false)} onSave={saveLoginPass} saving={savingLogin} values={loginPass} setValues={setLoginPass} />
      )}
      {showTxn && (
        <Modal title="Change Transaction Password" onClose={() => setShowTxn(false)} onSave={saveTxnPass} saving={savingTxn} values={txnPass} setValues={setTxnPass} />
      )}
    </div>
  );
}

const labelMap = {
  username: "Username",
  email: "Email",
  phone_number: "Phone Number",
  first_name: "First Name",
  last_name: "Last Name",
};

function Modal({ title, onClose, onSave, saving, values, setValues }) {
  const labels = {
    current_password: "Current password",
    new_password: "New password",
    confirm_new_password: "Confirm new password",
  };
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 font-bold text-lg">✕</button>
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        {["current_password", "new_password", "confirm_new_password"].map((name) => (
          <div key={name} className="mb-3">
            <label className="text-gray-600 font-semibold text-sm">{labels[name]}</label>
            <PasswordInput value={values[name]} onChange={(e) => setValues((p) => ({ ...p, [name]: e.target.value }))} className="mt-1 p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500" />
          </div>
        ))}
        <button onClick={onSave} className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold flex justify-center hover:bg-red-700">
          {saving ? <Spinner /> : "Save"}
        </button>
      </div>
    </div>
  );
}
