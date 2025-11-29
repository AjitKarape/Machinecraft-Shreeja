import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserRoleContextType {
  roles: AppRole[];
  isLoading: boolean;
  isAdmin: boolean;
  isWorker: boolean;
  isEditor: boolean;
  hasRole: (role: AppRole) => boolean;
}

const UserRoleContext = createContext<UserRoleContextType | undefined>(undefined);

export const UserRoleProvider = ({ children }: { children: ReactNode }) => {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserRoles = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setRoles([]);
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        if (error) {
          console.error("Error fetching user roles:", error);
          setRoles([]);
        } else {
          setRoles(data?.map(r => r.role) || []);
        }
      } catch (error) {
        console.error("Error in fetchUserRoles:", error);
        setRoles([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserRoles();

    // Subscribe to role changes
    const channel = supabase
      .channel("user-role-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_roles",
        },
        () => {
          fetchUserRoles();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const hasRole = (role: AppRole): boolean => {
    return roles.includes(role);
  };

  return (
    <UserRoleContext.Provider
      value={{
        roles,
        isLoading,
        isAdmin: hasRole("admin"),
        isWorker: hasRole("worker"),
        isEditor: hasRole("editor"),
        hasRole,
      }}
    >
      {children}
    </UserRoleContext.Provider>
  );
};

export const useUserRole = (): UserRoleContextType => {
  const context = useContext(UserRoleContext);
  if (context === undefined) {
    throw new Error("useUserRole must be used within a UserRoleProvider");
  }
  return context;
};
