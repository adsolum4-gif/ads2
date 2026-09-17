import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { FaUserCircle, FaCopy } from "react-icons/fa";
import { MdLogout, MdLockReset, MdPerson, MdVpnKey } from "react-icons/md";
import VipBadge from "../components/VipBadge";
import BottomNav from "../components/BottomNav";
import Loader, { Spinner } from "../components/Loader";
import PasswordInput from "../components/PasswordInput";
import { authApi, showApiError } from "../api/client";
import { compressImage, formatFileSize } from "@shared/compressImage";
import {
  fetchProfileStart,
  fetchProfileSuccess,
  fetchProfileFailure,
  setImagePreview,
  updateProfileSuccess,
} from "../store/slices/profileSlice";
import { logout } from "../store/slices/authSlice";
import { fadeIn } from "../utils/motion";

const fieldCls =
  "w-full mt-1.5 p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-red-500/30 focus:border-red-500 transition-all";

export default function Settings() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, isLoading, profilePicture, imagePreview } = useSelector((s) => s.profile);
  const [form, setForm] = useState({
    username: "",
    email: "",
    phone_number: "",
    first_name: "",
    last_name: "",
    gender: "",
  });
  const [pictureFile, setPictureFile] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [loginPass, setLoginPass] = useState({ current_password: "", new_password: "", confirm_new_password: "" });
  const [txnPass, setTxnPass] = useState({ current_password: "", new_password: "", confirm_new_password: "" });
  const [savingLogin, setSavingLogin] = useState(false);
  const [savingTxn, setSavingTxn] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user) {
        dispatch(fetchProfileStart());
        const result = await authApi.fetchProfile();
        if (result.success) dispatch(fetchProfileSuccess(result.data));
        else {
          dispatch(fetchProfileFailure(result.message));
          toast.error(result.message || "Failed to load settings.");
        }
      }
    })();
  }, [dispatch, user]);

  useEffect(() => {
    if (!user) return;
    setForm({
      username: user.username || "",
      email: user.email || "",
      phone_number: user.phone_number || "",
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      gender: user.gender || "",
    });
  }, [user]);

  const setField = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!String(file.type || "").startsWith("image/")) {
      toast.error("Please choose a JPG, PNG, or similar image.");
      return;
    }
    try {
      const compressed = await compressImage(file);
      setPictureFile(compressed);
      dispatch(setImagePreview(URL.createObjectURL(compressed)));
      if (compressed.size < file.size) {
        toast.success(`Image optimized from ${formatFileSize(file.size)} to ${formatFileSize(compressed.size)}.`);
      }
    } catch (err) {
      toast.error(err.message || "Could not process this image.");
    }
  };

  const copyReferral = () => {
    if (!user?.referral_code) return;
    navigator.clipboard.writeText(user.referral_code);
    toast.success("Referral code copied!");
  };

  const saveProfile = async () => {
    if (!form.username || !form.email || !form.phone_number) {
      toast.error("Username, email, and phone number are required.");
      return;
    }
    setSavingProfile(true);
    try {
      const payload = { ...form };
      if (pictureFile) payload.profile_picture = pictureFile;
      const data = await authApi.updateProfile(payload);
      const updated = data.data || data;
      if (pictureFile && !updated?.profile_picture) {
        throw new Error("Profile photo could not be saved. Please try a smaller JPG or PNG.");
      }
      toast.success("Profile updated successfully.");
      dispatch(updateProfileSuccess(updated));
      dispatch(setImagePreview(updated?.profile_picture || null));
      setPictureFile(null);
    } catch (err) {
      showApiError(err);
    } finally {
      setSavingProfile(false);
    }
  };

  const saveLoginPass = async () => {
    if (!loginPass.current_password || !loginPass.new_password || !loginPass.confirm_new_password) {
      toast.error("All password fields are required.");
      return;
    }
    if (loginPass.new_password.length < 6) {
      toast.error("New password must be at least 6 characters.");
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
      await authApi.changePassword({
        current_password: loginPass.current_password,
        new_password: loginPass.new_password,
      });
      toast.success("Login password updated successfully.");
      setLoginPass({ current_password: "", new_password: "", confirm_new_password: "" });
    } catch (err) {
      showApiError(err);
    } finally {
      setSavingLogin(false);
    }
  };

  const saveTxnPass = async () => {
    const { current_password, new_password, confirm_new_password } = txnPass;
    if (!current_password || !new_password || !confirm_new_password) {
      toast.error("All transaction password fields are required.");
      return;
    }
    if (new_password !== confirm_new_password) {
      toast.error("New transaction passwords must match.");
      return;
    }
    if (current_password === new_password) {
      toast.error("New transaction password cannot be the same as the current password.");
      return;
    }
    if (new_password.length !== 4 || Number.isNaN(Number(new_password))) {
      toast.error("Transaction password must be exactly 4 numeric characters.");
      return;
    }
    setSavingTxn(true);
    try {
      await authApi.changeTransactionPassword({ current_password, new_password });
      toast.success("Transaction password updated successfully.");
      setTxnPass({ current_password: "", new_password: "", confirm_new_password: "" });
    } catch (err) {
      showApiError(err);
    } finally {
      setSavingTxn(false);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  if (isLoading || !user) return <Loader />;

  const avatarSrc = imagePreview || profilePicture || user.profile_picture;

  return (
    <div className="bg-gradient-to-br from-red-50 via-white to-red-50 md:p-2 p-2 min-h-full">
      <motion.div
        initial={fadeIn("down").initial}
        animate={fadeIn("down", 1).animate}
        className="bg-red-600 rounded-2xl mx-0 md:mx-2 md:my-4 p-5 md:p-8 text-white shadow-lg"
      >
        <div className="flex justify-between items-center gap-4">
          <div className="flex items-center min-w-0">
            {avatarSrc ? (
              <img src={avatarSrc} alt="Profile" className="md:w-20 md:h-20 w-14 h-14 mr-3 md:mr-5 rounded-full object-cover border-2 border-white/30" />
            ) : (
              <FaUserCircle className="md:text-6xl text-4xl mr-3 md:mr-5" />
            )}
            <div className="min-w-0">
              <p className="text-xl font-bold truncate">{user.username || "N/A"}</p>
              <div className="text-sm text-white/90 mt-1">
                Referral code
                <div className="flex items-center mt-0.5">
                  <span className="font-bold truncate">{user.referral_code || "N/A"}</span>
                  <FaCopy onClick={copyReferral} className="ml-2 cursor-pointer shrink-0" />
                </div>
              </div>
            </div>
          </div>
          <div className="text-center shrink-0">
            <VipBadge pack={user.wallet?.package} size={52} />
            <p className="font-bold text-xs mt-2">{user.wallet?.package?.name || "N/A"}</p>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-5 md:grid-cols-2 md:mx-2 mx-0 mb-52 md:mb-8">
        <motion.section
          initial={fadeIn("left").initial}
          animate={fadeIn("left", 2).animate}
          className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 md:p-6 space-y-4"
        >
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-red-100 rounded-lg p-2.5">
              <MdPerson className="text-red-600 text-xl" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">Edit profile</h2>
              <p className="text-sm text-gray-500">Update your personal details</p>
            </div>
          </div>

          <div>
            <label className="text-gray-600 font-semibold text-sm">Profile picture</label>
            <div className="flex items-center space-x-4 mt-2">
              {avatarSrc ? (
                <img src={avatarSrc} alt="Profile preview" className="w-16 h-16 rounded-full object-cover border" />
              ) : (
                <FaUserCircle className="text-5xl text-gray-300" />
              )}
              <input type="file" accept="image/*" onChange={onFile} className={fieldCls} />
            </div>
            <p className="text-xs text-gray-400 mt-2">JPG or PNG. Photos larger than 1MB are compressed automatically.</p>
          </div>

          {[
            ["username", "Username", "text"],
            ["email", "Email", "email"],
            ["phone_number", "Phone number", "text"],
            ["first_name", "First name", "text"],
            ["last_name", "Last name", "text"],
          ].map(([name, label, type]) => (
            <div key={name}>
              <label className="text-gray-600 font-semibold text-sm">{label}</label>
              <input type={type} name={name} value={form[name]} onChange={setField} className={fieldCls} />
            </div>
          ))}

          <div>
            <label className="text-gray-600 font-semibold text-sm">Gender</label>
            <div className="mt-2 flex space-x-6">
              {[
                ["M", "Male"],
                ["F", "Female"],
              ].map(([value, label]) => (
                <label key={value} className="flex items-center space-x-2">
                  <input type="radio" name="gender" value={value} checked={form.gender === value} onChange={setField} className="h-4 w-4 text-red-600" />
                  <span className="text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-gray-600 font-semibold text-sm">Referral code</label>
            <input type="text" value={user.referral_code || ""} readOnly className={`${fieldCls} bg-gray-100 cursor-not-allowed`} />
          </div>

          <button
            onClick={saveProfile}
            disabled={savingProfile}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center shadow-md"
          >
            {savingProfile ? <Spinner /> : "Save profile"}
          </button>
        </motion.section>

        <div className="space-y-5">
          <motion.section
            initial={fadeIn("right").initial}
            animate={fadeIn("right", 2).animate}
            className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 md:p-6 space-y-4"
          >
            <div className="flex items-center gap-3 mb-1">
              <div className="bg-red-100 rounded-lg p-2.5">
                <MdLockReset className="text-red-600 text-xl" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">Login password</h2>
                <p className="text-sm text-gray-500">Change the password you use to sign in</p>
              </div>
            </div>
            <PasswordField label="Current password" value={loginPass.current_password} onChange={(v) => setLoginPass((p) => ({ ...p, current_password: v }))} />
            <PasswordField label="New password" value={loginPass.new_password} onChange={(v) => setLoginPass((p) => ({ ...p, new_password: v }))} />
            <PasswordField label="Confirm new password" value={loginPass.confirm_new_password} onChange={(v) => setLoginPass((p) => ({ ...p, confirm_new_password: v }))} />
            <button
              onClick={saveLoginPass}
              disabled={savingLogin}
              className="w-full bg-gray-900 hover:bg-black text-white font-semibold py-3 rounded-xl flex items-center justify-center"
            >
              {savingLogin ? <Spinner /> : "Update login password"}
            </button>
          </motion.section>

          <motion.section
            initial={fadeIn("right").initial}
            animate={fadeIn("right", 3).animate}
            className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 md:p-6 space-y-4"
          >
            <div className="flex items-center gap-3 mb-1">
              <div className="bg-amber-100 rounded-lg p-2.5">
                <MdVpnKey className="text-amber-600 text-xl" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">Transaction password</h2>
                <p className="text-sm text-gray-500">4-digit code used for withdrawals</p>
              </div>
            </div>
            <PasswordField label="Current transaction password" value={txnPass.current_password} onChange={(v) => setTxnPass((p) => ({ ...p, current_password: v }))} maxLength={4} />
            <PasswordField label="New transaction password" value={txnPass.new_password} onChange={(v) => setTxnPass((p) => ({ ...p, new_password: v }))} maxLength={4} />
            <PasswordField label="Confirm new transaction password" value={txnPass.confirm_new_password} onChange={(v) => setTxnPass((p) => ({ ...p, confirm_new_password: v }))} maxLength={4} />
            <button
              onClick={saveTxnPass}
              disabled={savingTxn}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center"
            >
              {savingTxn ? <Spinner /> : "Update transaction password"}
            </button>
          </motion.section>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white shadow-lg font-bold py-3.5 rounded-xl flex items-center justify-center"
          >
            <MdLogout className="mr-2 text-xl" /> Logout
          </motion.button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

function PasswordField({ label, value, onChange, maxLength }) {
  return (
    <div>
      <label className="text-gray-600 font-semibold text-sm">{label}</label>
      <PasswordInput
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        className="mt-1.5 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
      />
    </div>
  );
}
