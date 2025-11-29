import { Navigate } from "react-router-dom";
import { useUserRole } from "@/contexts/UserRoleContext";

export default function Index() {
  const { isWorker, isLoading } = useUserRole();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Workers go to their only accessible page
  if (isWorker) {
    return <Navigate to="/daily-log" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}
