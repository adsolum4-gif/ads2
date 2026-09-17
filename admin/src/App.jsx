import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { useSelector } from "react-redux";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./components/AdminLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AllUsers from "./pages/AllUsers";
import NegativeUsers from "./pages/NegativeUsers";
import Deposits from "./pages/Deposits";
import Withdrawals from "./pages/Withdrawals";
import Holds from "./pages/Holds";
import Packs from "./pages/Packs";
import Products from "./pages/Products";
import Events from "./pages/Events";
import Announcements from "./pages/Announcements";
import Logs from "./pages/Logs";
import Settings from "./pages/Settings";
import Video from "./pages/Video";
import Profile from "./pages/Profile";
import Refer from "./pages/Refer";

function GuestOnly({ children }) {
  const user = useSelector((s) => s.userSlice.user);
  if (user?.access_token) return <Navigate to="/admin/home" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route
          path="/admin"
          element={
            <GuestOnly>
              <Login />
            </GuestOnly>
          }
        />
        <Route
          path="/admin/home"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="hold" element={<Holds />} />
          <Route path="allusers" element={<AllUsers />} />
          <Route path="negusers" element={<NegativeUsers />} />
          <Route path="negative" element={<NegativeUsers />} />
          <Route path="products" element={<Products />} />
          <Route path="packs" element={<Packs />} />
          <Route path="deposits" element={<Deposits />} />
          <Route path="withdrawals" element={<Withdrawals />} />
          <Route path="events" element={<Events />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="logs" element={<Logs />} />
          <Route path="settings" element={<Settings />} />
          <Route path="video" element={<Video />} />
          <Route path="profile" element={<Profile />} />
          <Route path="refer" element={<Refer />} />
          <Route path="notifications" element={<Navigate to="/admin/home" replace />} />
        </Route>
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="/home/*" element={<Navigate to="/admin/home" replace />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
      <Toaster position="top-center" closeButton richColors duration={6000} />
    </BrowserRouter>
  );
}
