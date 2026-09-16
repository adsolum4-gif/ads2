import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import Loader from "./Loader";

export default function ProtectedRoute() {
  const isAuthenticated = useSelector((s) => s.auth.isAuthenticated);
  const token = localStorage.getItem("accessToken");
  const [ok, setOk] = useState(() => Boolean(token && isAuthenticated));

  useEffect(() => {
    setOk(Boolean(token && isAuthenticated));
  }, [isAuthenticated, token]);

  if (ok === null) return <Loader />;
  if (!ok) return <Navigate to="/login" replace />;
  return <Outlet />;
}
