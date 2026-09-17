import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import Splash from "./pages/Splash";
import LoginLayout from "./pages/LoginLayout";
import Login from "./pages/Login";
import RegisterIntro from "./pages/RegisterIntro";
import SignupOtp from "./pages/SignupOtp";
import Terms from "./pages/Terms";
import Home from "./pages/Home";
import Starting from "./pages/Starting";
import Settings from "./pages/Settings";
import Payment from "./pages/Payment";
import Notifications from "./pages/Notifications";
import Records from "./pages/Records";
import Contact from "./pages/Contact";
import ContractRules from "./pages/ContractRules";
import About from "./pages/About";
import Faq from "./pages/Faq";
import Events from "./pages/Events";
import Certificate from "./pages/Certificate";
import Level from "./pages/Level";
import Withdraw from "./pages/Withdraw";
import Deposit from "./pages/Deposit";
import ChatWidget from "./ChatWidget";

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/login" element={<LoginLayout />}>
          <Route index element={<Login />} />
          <Route path="signup" element={<RegisterIntro />} />
        </Route>
        <Route path="/signup-otp" element={<SignupOtp />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/termsandconds" element={<Terms />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/home" element={<AppLayout />}>
            <Route index element={<Home />} />
            <Route path="starting" element={<Starting />} />
            <Route path="settings" element={<Settings />} />
            <Route path="profile" element={<Navigate to="/home/settings" replace />} />
            <Route path="personal" element={<Navigate to="/home/settings" replace />} />
            <Route path="payment" element={<Payment />} />
            <Route path="contact" element={<Contact />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="records" element={<Records />} />
            <Route path="rules" element={<ContractRules />} />
            <Route path="about" element={<About />} />
            <Route path="faq" element={<Faq />} />
            <Route path="events" element={<Events />} />
            <Route path="certificate" element={<Certificate />} />
            <Route path="level" element={<Level />} />
            <Route path="withdraw" element={<Withdraw />} />
            <Route path="deposit" element={<Deposit />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="top-right" richColors duration={5000} closeButton className="z-[9999999999999999999]" />
      <ChatWidget />
    </BrowserRouter>
  );
}
