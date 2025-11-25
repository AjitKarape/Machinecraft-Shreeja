import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";

interface Toy {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  current_stock: number;
  last_transaction_at: string | null;
}

interface Employee {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  is_active: boolean;
}

interface DataContextType {
  toys: Toy[];
  employees: Employee[];
  isLoading: boolean;
  refetchToys: () => Promise<void>;
  refetchEmployees: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [toys, setToys] = useState<Toy[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  const fetchToys = async () => {
    try {
      const { data, error } = await supabase.from("toys").select("*").order("name");
      if (error) throw error;
      if (data) setToys(data);
    } catch (error) {
      console.error("Error fetching toys:", error);
      // Trigger auth refresh if unauthorized
      if (error?.message?.includes("JWT")) {
        await supabase.auth.refreshSession();
      }
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase.from("employees").select("*");
      if (error) throw error;
      if (data) setEmployees(data);
    } catch (error) {
      console.error("Error fetching employees:", error);
      if (error?.message?.includes("JWT")) {
        await supabase.auth.refreshSession();
      }
    }
  };

  const fetchAllData = async () => {
    setIsLoading(true);
    await Promise.all([fetchToys(), fetchEmployees()]);
    setIsLoading(false);
  };

  // Check authentication status
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event);
      setSession(session);
      
      // Refetch data when session is refreshed
      if (event === "TOKEN_REFRESHED" && session) {
        console.log("Token refreshed, refetching data");
        fetchAllData();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch data only when authenticated
  useEffect(() => {
    if (!session) {
      setIsLoading(false);
      return;
    }

    fetchAllData();

    // Subscribe to realtime changes
    const toysChannel = supabase
      .channel("toys-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "toys" }, fetchToys)
      .subscribe();

    const employeesChannel = supabase
      .channel("employees-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "employees" }, fetchEmployees)
      .subscribe();

    return () => {
      supabase.removeChannel(toysChannel);
      supabase.removeChannel(employeesChannel);
    };
  }, [session]);

  return (
    <DataContext.Provider
      value={{
        toys,
        employees,
        isLoading,
        refetchToys: fetchToys,
        refetchEmployees: fetchEmployees,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}
