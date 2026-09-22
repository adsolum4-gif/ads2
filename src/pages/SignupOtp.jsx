import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { api, authApi } from "../api/client";
import { Spinner } from "../components/Loader";
import PasswordInput from "../components/PasswordInput";
import PhoneCountryInput, { buildInternationalPhone } from "../components/PhoneCountryInput";
import { loginSuccess, setUserProfile } from "../store/slices/authSlice";
import { fetchProfileSuccess } from "../store/slices/profileSlice";
import { fetchNotifications } from "../store/slices/notificationsSlice";

const empty = {
  email: "",
  otp_code: "",
  username: "",
  phone_number: "",
  country_code: "US",
  country_dial: "+1",
  password: "",
  confirmPassword: "",
  first_name: "",
  last_name: "",
  gender: "",
  transactional_password: "",
  invitation_code: "",
  termsAccepted: false,
};

export default function SignupOtp() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [params] = useSearchParams();
  const refToken = (params.get("ref") || "").trim();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    ...empty,
    invitation_code: params.get("invite") || params.get("code") || "",
  });
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [referralOpen, setReferralOpen] = useState(false);

  const update = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  useEffect(() => {
    if (!refToken) return;
    (async () => {
      try {
        const { data } = await api.get("/auth/referral-link/", { params: { token: refToken } });
        const payload = data?.data || data;
        setReferralOpen(Boolean(payload?.valid && payload?.unused));
      } catch {
        setReferralOpen(false);
      }
    })();
  }, [refToken]);

  const sendOtp = async () => {
    if (!form.email) {
      toast.error("Please enter your email address.");
      return;
    }
    setLoading(true);
    const result = await authApi.sendOtp(form.email);
    setLoading(false);
    if (result.success) {
      toast.success(result.message || "OTP resent successfully!");
      setStep(2);
      setCooldown(60);
      const timer = setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) {
            clearInterval(timer);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } else toast.error(result.message);
  };

  const verify = async () => {
    if (!form.otp_code) {
      toast.error("Please enter the OTP code.");
      return;
    }
    if (form.otp_code.length !== 6) {
      toast.error("OTP code must be 6 digits.");
      return;
    }
    setLoading(true);
    const result = await authApi.verifyOtp({ email: form.email, otp_code: form.otp_code });
    setLoading(false);
    if (result.success) setStep(3);
    else toast.error(result.message);
  };

  const complete = async (e) => {
    e.preventDefault();
    if (form.username.length < 3) return toast.error("Username must be at least 3 characters long");
    const phone = buildInternationalPhone(form.country_dial, form.phone_number);
    if (!form.country_dial) return toast.error("Please select your country.");
    if (form.phone_number.replace(/\D/g, "").length < 6) return toast.error("Please enter a valid phone number.");
    if (!phone) return toast.error("Please enter a valid phone number.");
    if (form.password.length < 6) return toast.error("Password must be at least 6 characters long");
    if (form.password !== form.confirmPassword) return toast.error("Passwords do not match");
    if (form.transactional_password.length !== 4) return toast.error("Transaction password must be exactly 4 digits");
    if (!referralOpen && !form.invitation_code.trim()) return toast.error("Please enter an invitation code.");
    if (!referralOpen && form.invitation_code.trim().length !== 4) return toast.error("Invitation code must be 4 digits.");
    if (!referralOpen && form.invitation_code.trim() === "0000") return toast.error("Invalid invitation code.");
    if (!form.termsAccepted) return toast.error("Please accept the terms and conditions to continue");
    setLoading(true);
    const result = await authApi.signupWithOtp({
      email: form.email,
      otp_code: form.otp_code,
      username: form.username,
      phone_number: phone,
      password: form.password,
      first_name: form.first_name,
      last_name: form.last_name,
      gender: form.gender,
      transactional_password: form.transactional_password,
      invitation_code: referralOpen ? "" : form.invitation_code.trim(),
      referral_token: referralOpen ? refToken : null,
    });
    setLoading(false);
    if (result.success) {
      if (result.access_token) {
        dispatch(loginSuccess({ token: result.access_token, refreshToken: result.refresh_token }));
      }
      if (result.data) {
        dispatch(setUserProfile(result.data));
        dispatch(fetchProfileSuccess(result.data));
      }
      dispatch(fetchNotifications());
      toast.success("Registration successful. Welcome in.");
      navigate("/home", { replace: true });
    } else toast.error(result.message);
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen overflow-hidden bg-[#0f0a0a]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(199,8,30,0.28),_transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(80,10,20,0.45),_#0f0a0a)]" />
      <div className="relative z-10 w-full max-w-2xl mx-4 my-6 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/60 overflow-y-auto max-h-[92vh]">
        <img src="/assets/logo-light-D-kgBesC.png" alt="Adsterra" className="h-16 mx-auto mb-6 object-contain" />
        <h2 className="text-2xl font-semibold text-center mb-6">
          {step === 1 ? "Verify Your Email" : step === 2 ? "Enter Verification Code" : "Complete Registration"}
        </h2>

        {step === 1 && (
          <div className="space-y-4">
            <label className="block text-gray-700 font-medium mb-2">Email Address</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={update}
              placeholder="Enter your email address"
              className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
            <button
              onClick={sendOtp}
              disabled={loading}
              className="w-full bg-red-600 text-white font-bold py-3 rounded-lg"
            >
              {loading ? "Sending..." : "Send Verification Code"}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-gray-600 text-center">
              Email delivery needs a domain, so codes are not sent yet. Enter <span className="font-bold">123456</span> to continue testing.
            </p>
            <input
              type="text"
              name="otp_code"
              value={form.otp_code}
              onChange={update}
              maxLength={6}
              placeholder="Enter 6-digit code"
              className="w-full border border-gray-300 rounded-lg p-3 text-center tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-red-600"
            />
            <button onClick={verify} disabled={loading} className="w-full bg-red-600 text-white font-bold py-3 rounded-lg">
              {loading ? "Verifying..." : "Verify Code"}
            </button>
            <button
              onClick={sendOtp}
              disabled={cooldown > 0}
              className="w-full text-red-600"
            >
              {cooldown > 0 ? `Wait ${cooldown}s` : "Resend Code"}
            </button>
          </div>
        )}

        {step === 3 && (
          <form className="space-y-4" onSubmit={complete}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Username" required>
                <input name="username" value={form.username} onChange={update} placeholder="Enter your username" className={inputCls} required />
              </Field>
              <div className="md:col-span-2">
                <Field label="Phone Number" required>
                  <PhoneCountryInput
                    countryCode={form.country_code}
                    localNumber={form.phone_number}
                    onCountryChange={(country) =>
                      setForm((prev) => ({ ...prev, country_code: country.code, country_dial: country.dial }))
                    }
                    onLocalNumberChange={(value) => setForm((prev) => ({ ...prev, phone_number: value }))}
                    required
                    className={inputCls}
                  />
                </Field>
              </div>
              <Field label="First Name">
                <input name="first_name" value={form.first_name} onChange={update} placeholder="Enter your first name" className={inputCls} />
              </Field>
              <Field label="Last Name">
                <input name="last_name" value={form.last_name} onChange={update} placeholder="Enter your last name" className={inputCls} />
              </Field>
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-2">Gender</label>
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2">
                  <input type="radio" name="gender" value="M" checked={form.gender === "M"} onChange={update} />
                  <span>Male</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="radio" name="gender" value="F" checked={form.gender === "F"} onChange={update} />
                  <span>Female</span>
                </label>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Password" required>
                <PasswordInput name="password" value={form.password} onChange={update} placeholder="Enter your password" className={inputCls} required />
              </Field>
              <Field label="Confirm password" required>
                <PasswordInput name="confirmPassword" value={form.confirmPassword} onChange={update} placeholder="Confirm your password" className={inputCls} required />
              </Field>
              <Field label="Transaction password" required>
                <PasswordInput name="transactional_password" value={form.transactional_password} onChange={update} placeholder="Enter 4-digit code" maxLength={4} className={inputCls} required />
                <p className="text-gray-500 text-xs mt-1">4-digit numeric code for transactions</p>
              </Field>
              <Field label="Invitation Code" required={!referralOpen}>
                {referralOpen ? (
                  <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                    You are using an admin referral link. You do not need an invitation code. After you register, an invitation code will be sent to your notifications.
                  </p>
                ) : (
                  <>
                    <input
                      name="invitation_code"
                      value={form.invitation_code}
                      onChange={(e) =>
                        update({
                          target: {
                            name: "invitation_code",
                            value: e.target.value.replace(/\D/g, "").slice(0, 4),
                          },
                        })
                      }
                      placeholder="4-digit code"
                      inputMode="numeric"
                      maxLength={4}
                      className={inputCls}
                      required
                    />
                    <p className="text-gray-500 text-xs mt-1">Enter a one-time invitation code from an admin or referrer</p>
                  </>
                )}
              </Field>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <input type="checkbox" name="termsAccepted" checked={form.termsAccepted} onChange={update} className="mt-1 w-4 h-4 text-red-600" required />
                <label className="text-gray-700 text-sm leading-relaxed">
                  I agree to the{" "}
                  <a href="/termsandconds" target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline font-medium">
                    Terms and Conditions
                  </a>
                </label>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full font-bold py-4 rounded-lg flex items-center justify-center space-x-2 ${
                loading ? "bg-gray-400" : "bg-red-600 hover:bg-red-500"
              } text-white`}
            >
              {loading ? (
                <>
                  <Spinner />
                  <span>Creating Account...</span>
                </>
              ) : (
                "Complete Registration"
              )}
            </button>
          </form>
        )}

        <div className="text-center text-gray-600 mt-4 md:mb-2 mb-12">
          <button type="button" onClick={() => (step === 1 ? navigate("/") : setStep(step - 1))} className="text-red-600 hover:underline">
            {step === 1 ? "Back to Login" : "Go Back"}
          </button>
        </div>
        <p className="text-center text-gray-600 text-sm">
          Already have an account?{" "}
          <button onClick={() => navigate("/login")} className="text-red-600 hover:underline">
            Login here
          </button>
        </p>
      </div>
    </div>
  );
}

const inputCls =
  "w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 focus:outline-none focus:bg-white focus:ring-2 focus:ring-red-500/30 focus:border-red-500 transition-all";

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-gray-700 font-medium mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
