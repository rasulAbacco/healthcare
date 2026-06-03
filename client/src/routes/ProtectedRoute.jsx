// client/src/routes/ProtectedRoute.jsx
// Replace your existing ProtectedRoute.jsx with this file
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, role, module }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/login" replace />;
  if (module && user.module !== module) return <Navigate to="/login" replace />;
  return children;
}