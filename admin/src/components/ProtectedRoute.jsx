import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";

export default function ProtectedRoute({ children }) {
  const user = useSelector((s) => s.userSlice.user);
  if (!user?.access_token) return <Navigate to="/admin" replace />;
  return children || <Outlet />;
}
