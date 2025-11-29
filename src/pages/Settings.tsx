import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NavHeader } from "@/components/NavHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, RefreshCw, ChevronDown, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useData } from "@/contexts/DataContext";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  is_active: boolean;
  last_login: string | null;
}
interface UserRole {
  user_id: string;
  role: string;
}
export default function Settings() {
  const {
    toys,
    employees,
    refetchToys,
    refetchEmployees
  } = useData();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, string[]>>({});
  const [isAddToyOpen, setIsAddToyOpen] = useState(false);
  const [isEditToyOpen, setIsEditToyOpen] = useState(false);
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [editingToy, setEditingToy] = useState<any>(null);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserRole, setNewUserRole] = useState("worker");
  const [toyName, setToyName] = useState("");
  const [toyDescription, setToyDescription] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [employeePhone, setEmployeePhone] = useState("");
  const [employeeNotes, setEmployeeNotes] = useState("");
  
  // Expense Mapping states
  const [expenseMappings, setExpenseMappings] = useState<any[]>([]);
  const [isAddExpenseMappingOpen, setIsAddExpenseMappingOpen] = useState(false);
  const [isEditExpenseMappingOpen, setIsEditExpenseMappingOpen] = useState(false);
  const [editingExpenseMapping, setEditingExpenseMapping] = useState<any>(null);
  const [newExpenseHead, setNewExpenseHead] = useState("");
  const [newGroup, setNewGroup] = useState("");
  const [newOpeningBalance, setNewOpeningBalance] = useState("0");
  const [newOpeningBalanceDate, setNewOpeningBalanceDate] = useState("2024-04-01");
  useEffect(() => {
    fetchUserData();
    fetchExpenseMappings();

    // Real-time subscription for profiles
    const profilesChannel = supabase.channel('profiles-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'profiles'
    }, () => {
      fetchUserData();
    }).subscribe();

    // Real-time subscription for user_roles
    const rolesChannel = supabase.channel('user-roles-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'user_roles'
    }, () => {
      fetchUserData();
    }).subscribe();
    
    // Real-time subscription for expense_mapping
    const expenseMappingChannel = supabase.channel('expense-mapping-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'expense_mapping'
    }, () => {
      fetchExpenseMappings();
    }).subscribe();
    
    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(rolesChannel);
      supabase.removeChannel(expenseMappingChannel);
    };
  }, []);
  const fetchUserData = async () => {
    const {
      data: usersData
    } = await supabase.from("profiles").select("*");
    const {
      data: rolesData
    } = await supabase.from("user_roles").select("*");
    if (usersData) setUsers(usersData);
    if (rolesData) {
      const rolesMap: Record<string, string[]> = {};
      rolesData.forEach((role: UserRole) => {
        if (!rolesMap[role.user_id]) {
          rolesMap[role.user_id] = [];
        }
        rolesMap[role.user_id].push(role.role);
      });
      setUserRoles(rolesMap);
    }
  };
  const handleAddToy = async () => {
    if (!toyName) {
      toast.error("Please enter a toy name");
      return;
    }
    const {
      error
    } = await supabase.from("toys").insert({
      name: toyName,
      description: toyDescription
    });
    if (error) {
      toast.error("Error adding toy");
    } else {
      toast.success("Toy added successfully");
      setIsAddToyOpen(false);
      setToyName("");
      setToyDescription("");
      refetchToys();
    }
  };
  const handleEditToy = async () => {
    if (!toyName || !editingToy) {
      toast.error("Please enter a toy name");
      return;
    }
    const { error } = await supabase
      .from("toys")
      .update({
        name: toyName,
        description: toyDescription
      })
      .eq("id", editingToy.id);
    
    if (error) {
      toast.error("Error updating toy");
    } else {
      toast.success("Toy updated successfully");
      setIsEditToyOpen(false);
      setEditingToy(null);
      setToyName("");
      setToyDescription("");
      refetchToys();
    }
  };

  const handleDeleteToy = async (id: string) => {
    const {
      error
    } = await supabase.from("toys").delete().eq("id", id);
    if (error) {
      toast.error("Error deleting toy");
    } else {
      toast.success("Toy deleted successfully");
      refetchToys();
    }
  };
  
  const openEditToy = (toy: any) => {
    setEditingToy(toy);
    setToyName(toy.name);
    setToyDescription(toy.description || "");
    setIsEditToyOpen(true);
  };
  const handleAddEmployee = async () => {
    if (!employeeName) {
      toast.error("Please enter employee name");
      return;
    }
    const {
      error
    } = await supabase.from("employees").insert({
      name: employeeName,
      phone: employeePhone,
      notes: employeeNotes
    });
    if (error) {
      toast.error("Error adding employee");
    } else {
      toast.success("Employee added successfully");
      setIsAddEmployeeOpen(false);
      setEmployeeName("");
      setEmployeePhone("");
      setEmployeeNotes("");
      refetchEmployees();
    }
  };
  const handleDeleteEmployee = async (id: string) => {
    const {
      error
    } = await supabase.from("employees").delete().eq("id", id);
    if (error) {
      toast.error("Error deleting employee");
    } else {
      toast.success("Employee deleted successfully");
      refetchEmployees();
    }
  };
  const handleToggleEmployeeStatus = async (id: string, currentStatus: boolean) => {
    const {
      error
    } = await supabase.from("employees").update({
      is_active: !currentStatus
    }).eq("id", id);
    if (error) {
      toast.error("Error updating employee status");
    } else {
      toast.success("Employee status updated");
      refetchEmployees();
    }
  };
  const handleToggleUserAccess = async (userId: string, currentStatus: boolean) => {
    // Optimistic update
    const optimisticUsers = users.map(u => u.user_id === userId ? {
      ...u,
      is_active: !currentStatus
    } : u);
    setUsers(optimisticUsers);
    const {
      error
    } = await supabase.from("profiles").update({
      is_active: !currentStatus
    }).eq("user_id", userId);
    if (error) {
      // Revert on error
      setUsers(users);
      toast.error("Error updating user access");
    } else {
      toast.success("User access updated");
    }
  };
  const handleOpenResetPassword = (user: UserProfile) => {
    setSelectedUserForReset(user);
    setNewPassword("");
    setIsResetPasswordOpen(true);
  };
  const handleUpdatePassword = async () => {
    if (!selectedUserForReset || !newPassword) {
      toast.error("Please enter a new password");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }
    try {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      const {
        data,
        error
      } = await supabase.functions.invoke("admin-update-password", {
        body: {
          userId: selectedUserForReset.user_id,
          newPassword
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });
      if (error || data && 'error' in data) {
        throw new Error((data as any)?.error || error?.message || 'Unknown error');
      }
      toast.success("Password updated successfully");
      setIsResetPasswordOpen(false);
      setNewPassword("");
      setSelectedUserForReset(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error updating password");
    }
  };
  const handleToggleRole = async (userId: string, role: 'admin' | 'editor' | 'worker') => {
    const currentRoles = userRoles[userId] || [];
    const hasRole = currentRoles.includes(role);
    const action = hasRole ? "remove" : "add";

    // Optimistic update - update UI immediately
    const optimisticRoles = {
      ...userRoles
    };
    if (hasRole) {
      optimisticRoles[userId] = currentRoles.filter(r => r !== role);
    } else {
      optimisticRoles[userId] = [...currentRoles, role];
    }
    setUserRoles(optimisticRoles);
    try {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      const {
        data,
        error
      } = await supabase.functions.invoke("admin-manage-role", {
        body: {
          userId,
          role,
          action
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });
      if (error || data && 'error' in data) {
        throw new Error((data as any)?.error || error?.message || 'Unknown error');
      }
      toast.success(hasRole ? "Role removed successfully" : "Role added successfully");
    } catch (error) {
      // Revert optimistic update on error
      setUserRoles(userRoles);
      toast.error(error instanceof Error ? error.message : "Error updating role");
    }
  };
  const handleAddUser = async () => {
    if (!newUserEmail || !newUserPassword || !newUserName) {
      toast.error("Please fill in all fields");
      return;
    }
    try {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      const response = await fetch("https://apowrdellfsklcmhzplx.supabase.co/functions/v1/admin-create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          email: newUserEmail,
          password: newUserPassword,
          name: newUserName,
          role: newUserRole
        })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to create user");
      }
      toast.success("User created successfully");
      setIsAddUserOpen(false);
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserName("");
      setNewUserRole("worker");
      fetchUserData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error creating user");
    }
  };
  
  const fetchExpenseMappings = async () => {
    const { data, error } = await supabase
      .from("expense_mapping")
      .select("*")
      .order("group_name")
      .order("expense_head");
    
    if (error) {
      toast.error("Error fetching expense mappings");
    } else if (data) {
      setExpenseMappings(data);
    }
  };
  
  const handleAddExpenseMapping = async () => {
    if (!newExpenseHead || !newGroup) {
      toast.error("Please fill in all fields");
      return;
    }
    
    const { error } = await supabase.from("expense_mapping").insert({
      expense_head: newExpenseHead,
      group_name: newGroup,
      opening_balance: parseFloat(newOpeningBalance) || 0,
      opening_balance_date: newOpeningBalanceDate
    });
    
    if (error) {
      toast.error("Error adding expense mapping");
    } else {
      toast.success("Expense mapping added successfully");
      setIsAddExpenseMappingOpen(false);
      setNewExpenseHead("");
      setNewGroup("");
      setNewOpeningBalance("0");
      setNewOpeningBalanceDate("2024-04-01");
      fetchExpenseMappings();
    }
  };

  const handleDeleteExpenseMapping = async (id: string) => {
    const { error } = await supabase
      .from("expense_mapping")
      .delete()
      .eq("id", id);
    
    if (error) {
      toast.error("Error deleting expense mapping");
    } else {
      toast.success("Expense mapping deleted successfully");
      fetchExpenseMappings();
    }
  };

  const openEditExpenseMapping = (mapping: any) => {
    setEditingExpenseMapping(mapping);
    setNewExpenseHead(mapping.expense_head);
    setNewGroup(mapping.group_name);
    setNewOpeningBalance(mapping.opening_balance?.toString() || "0");
    setNewOpeningBalanceDate(mapping.opening_balance_date || "2024-04-01");
    setIsEditExpenseMappingOpen(true);
  };

  const handleEditExpenseMapping = async () => {
    if (!newExpenseHead || !newGroup || !editingExpenseMapping) {
      toast.error("Please fill in all fields");
      return;
    }
    
    const { error } = await supabase
      .from("expense_mapping")
      .update({
        expense_head: newExpenseHead,
        group_name: newGroup,
        opening_balance: parseFloat(newOpeningBalance) || 0,
        opening_balance_date: newOpeningBalanceDate
      })
      .eq("id", editingExpenseMapping.id);
    
    if (error) {
      toast.error("Error updating expense mapping");
    } else {
      toast.success("Expense mapping updated successfully");
      setIsEditExpenseMappingOpen(false);
      setEditingExpenseMapping(null);
      setNewExpenseHead("");
      setNewGroup("");
      setNewOpeningBalance("0");
      setNewOpeningBalanceDate("2024-04-01");
      fetchExpenseMappings();
    }
  };

  return <div className="min-h-screen bg-gradient-mesh">
      <NavHeader />
      
      <main className="px-3 py-3">
        <div className="mb-4">
          <h1 className="text-foreground mb-1 text-xl font-medium">Settings</h1>
          
        </div>

        <Tabs defaultValue="toys" className="space-y-4">
          <TabsList className="glass neu-card text-sm">
            <TabsTrigger value="toys" className="text-xs">Toys</TabsTrigger>
            <TabsTrigger value="expense-mapping" className="text-xs">Expense Mapping</TabsTrigger>
            <TabsTrigger value="users" className="text-xs">User Management</TabsTrigger>
          </TabsList>

          <TabsContent value="toys" className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-foreground">Toys</h2>
              <div className="flex gap-2">
                <Dialog open={isAddToyOpen} onOpenChange={setIsAddToyOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                      <Plus className="w-4 h-4 mr-1.5" />
                      Add Toy
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Add New Toy</DialogTitle>
                      <DialogDescription>
                        Enter the toy name and description to add a new toy to your inventory.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-2">
                      <div className="grid gap-2">
                        <Label>Toy Name</Label>
                        <Input value={toyName} onChange={e => setToyName(e.target.value)} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Description (Optional)</Label>
                        <Textarea value={toyDescription} onChange={e => setToyDescription(e.target.value)} />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsAddToyOpen(false)}>Cancel</Button>
                      <Button onClick={handleAddToy}>Add Toy</Button>
                    </div>
                  </DialogContent>
                </Dialog>
                
                {/* Edit Toy Dialog */}
                <Dialog open={isEditToyOpen} onOpenChange={(open) => {
                  setIsEditToyOpen(open);
                  if (!open) {
                    setEditingToy(null);
                    setToyName("");
                    setToyDescription("");
                  }
                }}>
                  <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Edit Toy</DialogTitle>
                      <DialogDescription>
                        Update the toy name and description.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-2">
                      <div className="grid gap-2">
                        <Label>Toy Name</Label>
                        <Input value={toyName} onChange={e => setToyName(e.target.value)} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Description (Optional)</Label>
                        <Textarea value={toyDescription} onChange={e => setToyDescription(e.target.value)} />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => {
                        setIsEditToyOpen(false);
                        setEditingToy(null);
                        setToyName("");
                        setToyDescription("");
                      }}>Cancel</Button>
                      <Button onClick={handleEditToy}>Update Toy</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="grid gap-3">
              {toys.map(toy => (
                <div key={toy.id} className="bg-card border border-border rounded-lg overflow-hidden">
                  <div className="bg-muted px-4 py-3 flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-foreground">{toy.name}</h3>
                      {toy.description && <p className="text-xs text-muted-foreground mt-0.5">{toy.description}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0 text-primary hover:text-primary hover:bg-primary/10" 
                        onClick={() => openEditToy(toy)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10" 
                        onClick={() => handleDeleteToy(toy.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              
              {toys.length === 0 && <div className="bg-card border border-border rounded-lg p-8 text-center">
                  <p className="text-sm text-muted-foreground">No toys added yet. Click "Add Toy" to create one.</p>
                </div>}
            </div>
          </TabsContent>

          <TabsContent value="expense-mapping" className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-foreground">Expense Mapping</h2>
              <Dialog open={isAddExpenseMappingOpen} onOpenChange={setIsAddExpenseMappingOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Plus className="w-4 h-4 mr-1.5" />
                    Add Expense Mapping
                  </Button>
                </DialogTrigger>
                  <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Add Expense Mapping</DialogTitle>
                      <DialogDescription>
                        Map expense heads to groups. Use "Revenue" or "Receipts" group for income items.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-2">
                      <div className="grid gap-2">
                        <Label>Expense Head</Label>
                        <Input value={newExpenseHead} onChange={e => setNewExpenseHead(e.target.value)} placeholder="e.g., Website Sale, Funding, Salary" />
                      </div>
                      <div className="grid gap-2">
                        <Label>Group</Label>
                        <Select value={newGroup} onValueChange={setNewGroup}>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Select a group" />
                          </SelectTrigger>
                          <SelectContent className="bg-background z-50">
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Inflow</div>
                            <SelectItem value="Revenue">Revenue</SelectItem>
                            <SelectItem value="Receipts">Receipts</SelectItem>
                            <SelectItem value="Funding">Funding</SelectItem>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1">Outflow</div>
                            <SelectItem value="Direct Expenses">Direct Expenses</SelectItem>
                            <SelectItem value="Operating Cost">Operating Cost</SelectItem>
                            <SelectItem value="Assets">Assets</SelectItem>
                            <SelectItem value="Investment">Investment</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Inflow: Revenue, Receipts, Funding | Outflow: All others</p>
                      </div>
                      <div className="grid gap-2">
                        <Label>Opening Balance</Label>
                        <Input 
                          type="number" 
                          step="0.01"
                          value={newOpeningBalance} 
                          onChange={e => setNewOpeningBalance(e.target.value)} 
                          placeholder="0.00" 
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Opening Balance Date</Label>
                        <Input 
                          type="date"
                          value={newOpeningBalanceDate} 
                          onChange={e => setNewOpeningBalanceDate(e.target.value)} 
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsAddExpenseMappingOpen(false)}>Cancel</Button>
                      <Button onClick={handleAddExpenseMapping}>Add Mapping</Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Edit Expense Mapping Dialog */}
                <Dialog open={isEditExpenseMappingOpen} onOpenChange={(open) => {
                  setIsEditExpenseMappingOpen(open);
                  if (!open) {
                    setEditingExpenseMapping(null);
                    setNewExpenseHead("");
                    setNewGroup("");
                    setNewOpeningBalance("0");
                    setNewOpeningBalanceDate("2024-04-01");
                  }
                }}>
                  <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Edit Expense Mapping</DialogTitle>
                      <DialogDescription>
                        Update the expense head, group, or opening balance details.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-2">
                      <div className="grid gap-2">
                        <Label>Expense Head</Label>
                        <Input value={newExpenseHead} onChange={e => setNewExpenseHead(e.target.value)} placeholder="e.g., Website Sale, Funding, Salary" />
                      </div>
                      <div className="grid gap-2">
                        <Label>Group</Label>
                        <Select value={newGroup} onValueChange={setNewGroup}>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Select a group" />
                          </SelectTrigger>
                          <SelectContent className="bg-background z-50">
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Inflow</div>
                            <SelectItem value="Revenue">Revenue</SelectItem>
                            <SelectItem value="Receipts">Receipts</SelectItem>
                            <SelectItem value="Funding">Funding</SelectItem>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1">Outflow</div>
                            <SelectItem value="Direct Expenses">Direct Expenses</SelectItem>
                            <SelectItem value="Operating Cost">Operating Cost</SelectItem>
                            <SelectItem value="Assets">Assets</SelectItem>
                            <SelectItem value="Investment">Investment</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Inflow: Revenue, Receipts, Funding | Outflow: All others</p>
                      </div>
                      <div className="grid gap-2">
                        <Label>Opening Balance</Label>
                        <Input 
                          type="number" 
                          step="0.01"
                          value={newOpeningBalance} 
                          onChange={e => setNewOpeningBalance(e.target.value)} 
                          placeholder="0.00" 
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Opening Balance Date</Label>
                        <Input 
                          type="date"
                          value={newOpeningBalanceDate} 
                          onChange={e => setNewOpeningBalanceDate(e.target.value)} 
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => {
                        setIsEditExpenseMappingOpen(false);
                        setEditingExpenseMapping(null);
                        setNewExpenseHead("");
                        setNewGroup("");
                        setNewOpeningBalance("0");
                        setNewOpeningBalanceDate("2024-04-01");
                      }}>Cancel</Button>
                      <Button onClick={handleEditExpenseMapping}>Update Mapping</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left py-2 px-3 text-xs font-medium text-foreground">Expense Head</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-foreground">Group</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-foreground">Opening Balance</th>
                    <th className="text-center py-2 px-3 text-xs font-medium text-foreground">OB Date</th>
                    <th className="text-center py-2 px-3 text-xs font-medium text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {expenseMappings.map(mapping => (
                    <tr key={mapping.id} className="hover:bg-muted/50">
                      <td className="py-2 px-3 text-xs text-foreground">{mapping.expense_head}</td>
                      <td className="py-2 px-3 text-xs text-foreground">{mapping.group_name}</td>
                      <td className="py-2 px-3 text-xs text-foreground text-right">
                        ₹{parseFloat(mapping.opening_balance || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-2 px-3 text-xs text-foreground text-center">
                        {mapping.opening_balance_date ? new Date(mapping.opening_balance_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => openEditExpenseMapping(mapping)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteExpenseMapping(mapping.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {expenseMappings.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                        No expense mappings added yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-1">User Management</h2>
                
              </div>
              <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90">
                    <Plus className="w-4 h-4 mr-2" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New User</DialogTitle>
                    <DialogDescription>Create a new user account with email and password</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="user-name">Name</Label>
                      <Input id="user-name" value={newUserName} onChange={e => setNewUserName(e.target.value)} placeholder="Enter user's full name" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="user-email">Email</Label>
                      <Input id="user-email" type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="user@example.com" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="user-password">Password</Label>
                      <Input id="user-password" type="password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} placeholder="Minimum 6 characters" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="user-role">Role</Label>
                      <Select value={newUserRole} onValueChange={setNewUserRole}>
                        <SelectTrigger id="user-role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="worker">Worker</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddUser}>Create User</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left py-2 px-3 text-xs font-medium text-foreground">User Name</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-foreground">Email</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-foreground">Role</th>
                    <th className="text-center py-2 px-3 text-xs font-medium text-foreground">Admin</th>
                    <th className="text-center py-2 px-3 text-xs font-medium text-foreground">Editor</th>
                    <th className="text-center py-2 px-3 text-xs font-medium text-foreground">Access</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-foreground">Last Login</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => {
                  const roles = userRoles[user.user_id] || [];
                  const displayRole = roles.length > 0 ? roles.join(", ") : "worker";
                  return <tr key={user.id} className="border-t border-border">
                        <td className="py-2 px-3 text-sm text-foreground">{user.name}</td>
                        <td className="py-2 px-3 text-sm text-foreground">{user.email}</td>
                        <td className="py-2 px-3">
                          <span className="inline-block px-2 py-0.5 text-xs font-medium text-primary-foreground bg-primary rounded-full">
                            {displayRole}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <Switch checked={roles.includes("admin")} onCheckedChange={() => handleToggleRole(user.user_id, "admin")} />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <Switch checked={roles.includes("editor")} onCheckedChange={() => handleToggleRole(user.user_id, "editor")} />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <Switch checked={user.is_active} onCheckedChange={() => handleToggleUserAccess(user.user_id, user.is_active)} />
                        </td>
                        <td className="py-2 px-3 text-sm text-muted-foreground">
                          {user.last_login ? new Date(user.last_login).toLocaleDateString() : "Never"}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenResetPassword(user)}>
                            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                            Reset Password
                          </Button>
                        </td>
                      </tr>;
                })}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>

        {/* Reset Password Dialog */}
        <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
              <DialogDescription>
                Set a new password for {selectedUserForReset?.name} ({selectedUserForReset?.email})
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input id="new-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Enter new password (min 6 characters)" minLength={6} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
              setIsResetPasswordOpen(false);
              setNewPassword("");
              setSelectedUserForReset(null);
            }}>
                Cancel
              </Button>
              <Button onClick={handleUpdatePassword}>
                Update Password
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>;
}