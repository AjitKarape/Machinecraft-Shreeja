import { NavLink } from "@/components/NavLink";
import { LayoutDashboard, ClipboardList, IndianRupee, Settings, LogOut, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
export const NavHeader = () => {
  const navigate = useNavigate();
  const handleSignOut = async () => {
    const {
      error
    } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error signing out");
    } else {
      navigate("/auth");
    }
  };
  return <header className="bg-background border-b border-border px-3 py-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-yellow-800">machinecraft.co</h1>
        
        <nav className="flex items-center gap-1">
          <NavLink to="/dashboard" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground" activeClassName="bg-accent text-accent-foreground">
            <LayoutDashboard className="w-4 h-4" />
            Action Plan
          </NavLink>
          
          <NavLink to="/daily-log" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground" activeClassName="bg-accent text-accent-foreground">
            <ClipboardList className="w-4 h-4" />
            Daily Log
          </NavLink>
          
          <NavLink to="/stock-count" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground" activeClassName="bg-accent text-accent-foreground">
            <Package className="w-4 h-4" />
            Stock
          </NavLink>
          
          <NavLink to="/cost-summary" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground" activeClassName="bg-accent text-accent-foreground">
            <IndianRupee className="w-4 h-4" />
            Cost Summary
          </NavLink>
          
          <NavLink to="/bank-reco" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground" activeClassName="bg-accent text-accent-foreground">
            <ClipboardList className="w-4 h-4" />
            Bank Reco
          </NavLink>
          
          <NavLink to="/settings" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground" activeClassName="bg-accent text-accent-foreground">
            <Settings className="w-4 h-4" />
            Settings
          </NavLink>
        </nav>

        <Button variant="ghost" size="sm" onClick={handleSignOut} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </header>;
};