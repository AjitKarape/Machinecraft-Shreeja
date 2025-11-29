import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { DataProvider } from "@/contexts/DataContext";
import { useUserRole } from "@/hooks/useUserRole";
import type { Database } from "@/integrations/supabase/types";
import { NavHeader } from "@/components/NavHeader";
import Dashboard from "./pages/Dashboard";
import DailyLog from "./pages/DailyLog";
import StockCount from "./pages/StockCount";
import CostSummary from "./pages/CostSummary";
import BankReco from "./pages/BankReco";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Index from "./pages/Index";

type AppRole = Database["public"]["Enums"]["app_role"];

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const RoleProtectedRoute = ({ 
  children, 
  allowedRoles 
}: { 
  children: React.ReactNode;
  allowedRoles: AppRole[];
}) => {
  const { roles, isLoading } = useUserRole();
  const navigate = useNavigate();
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (!isLoading && !hasChecked) {
      const hasAccess = roles.some(role => allowedRoles.includes(role));
      
      if (!hasAccess) {
        // Workers get redirected to their only accessible page
        if (roles.includes("worker")) {
          navigate("/daily-log", { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
      }
      setHasChecked(true);
    }
  }, [isLoading, roles, allowedRoles, navigate, hasChecked]);

  if (isLoading || !hasChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const hasAccess = roles.some(role => allowedRoles.includes(role));
  return hasAccess ? <>{children}</> : null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <DataProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={["admin", "editor"]}>
                    <NavHeader />
                    <Dashboard />
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/daily-log"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={["admin", "editor", "worker"]}>
                    <NavHeader />
                    <DailyLog />
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/stock-count"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={["admin", "editor"]}>
                    <NavHeader />
                    <StockCount />
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/cost-summary"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={["admin", "editor"]}>
                    <NavHeader />
                    <CostSummary />
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/bank-reco"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={["admin", "editor"]}>
                    <NavHeader />
                    <BankReco />
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={["admin"]}>
                    <NavHeader />
                    <Settings />
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </DataProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;