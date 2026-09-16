import { useNavigate } from "react-router-dom";

export default function RegisterIntro() {
  const navigate = useNavigate();
  return (
    <div className="relative flex items-center justify-center min-h-screen overflow-hidden bg-[#0f0a0a]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(199,8,30,0.28),_transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(80,10,20,0.45),_#0f0a0a)]" />
      <div className="relative z-10 w-full max-w-lg mx-4 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/60">
        <img src="/assets/logo-light-D-kgBesC.png" alt="Adsterra" className="h-16 mx-auto mb-6 object-contain" />
        <h2 className="text-2xl font-bold text-center text-gray-900 tracking-tight mb-6">Register now</h2>
        <div className="space-y-6">
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
            <h3 className="text-base font-semibold text-red-800 mb-1">Enhanced security</h3>
            <p className="text-sm text-red-700/80 leading-relaxed">
              We require email verification for all new accounts to keep your workspace secure.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-3">Registration process</h4>
            <div className="space-y-3 text-gray-600">
              {["Enter your email address", "Verify your email with an OTP code", "Complete your registration"].map(
                (text, i) => (
                  <div key={text} className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                      {i + 1}
                    </div>
                    <span className="text-sm">{text}</span>
                  </div>
                )
              )}
            </div>
          </div>
          <button
            onClick={() => navigate("/signup-otp")}
            className="w-full bg-red-600 text-white font-semibold py-3.5 rounded-xl hover:bg-red-700 shadow-lg shadow-red-600/25 hover:-translate-y-0.5 transition-all"
          >
            Start registration
          </button>
        </div>
        <p className="text-center mt-6">
          <button type="button" onClick={() => navigate("/login")} className="text-red-600 font-semibold hover:text-red-700 text-sm">
            Back to login
          </button>
        </p>
      </div>
    </div>
  );
}
