import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NavHeader } from "@/components/NavHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Pencil, Upload, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
interface BankTransaction {
  id: string;
  date: string;
  description: string;
  expense_head: string | null;
  vendor: string | null;
  remark: string | null;
  amount: number;
  bank_account_id: string | null;
  bank_name: string | null;
}
interface BankAccount {
  id: string;
  name: string;
  account_number: string | null;
  account_type: string | null;
  current_balance: number;
  last_statement_date: string | null;
  is_primary: boolean;
  is_active: boolean;
}

// Auto-mapping rules: { searchTerm: { expense_head, vendor } }
const DESCRIPTION_MAPPING: Record<string, {
  expense_head: string;
  vendor: string;
}> = {
  "Avinash": {
    expense_head: "Other Cost",
    vendor: "Avinash"
  },
  "Bhatsange": {
    expense_head: "Rent ",
    vendor: "Sonu Sir"
  },
  "Ajit": {
    expense_head: "Funding",
    vendor: "Ajit"
  }
};

// Function to auto-map expense head and vendor based on description
const applyDescriptionMapping = (description: string, currentExpenseHead: string | null, currentVendor: string | null): {
  expense_head: string | null;
  vendor: string | null;
} => {
  // Don't override if both fields already have values
  if (currentExpenseHead && currentVendor) {
    return {
      expense_head: currentExpenseHead,
      vendor: currentVendor
    };
  }

  // Check each mapping rule
  for (const [searchTerm, mapping] of Object.entries(DESCRIPTION_MAPPING)) {
    if (description.toLowerCase().includes(searchTerm.toLowerCase())) {
      return {
        expense_head: currentExpenseHead || mapping.expense_head,
        vendor: currentVendor || mapping.vendor
      };
    }
  }

  // Return current values if no match
  return {
    expense_head: currentExpenseHead,
    vendor: currentVendor
  };
};
export default function BankReco() {
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [expenseHeads, setExpenseHeads] = useState<string[]>([]);
  const [selectedBankForUpload, setSelectedBankForUpload] = useState<string>("");
  const [selectedBankFilter, setSelectedBankFilter] = useState<string>("all");
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>("all");
  const [selectedVendorFilter, setSelectedVendorFilter] = useState<string>("all");
  const [bankStatementFormat, setBankStatementFormat] = useState<"icici" | "janata">("icici");
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [editingExpenseHead, setEditingExpenseHead] = useState("");
  const [editingVendor, setEditingVendor] = useState("");
  const [editingRemark, setEditingRemark] = useState("");
  const [bankBalance, setBankBalance] = useState<string>("");
  const [isAddBankOpen, setIsAddBankOpen] = useState(false);
  const [newBankName, setNewBankName] = useState("");
  const [newBankAccountNumber, setNewBankAccountNumber] = useState("");
  const [newBankAccountType, setNewBankAccountType] = useState("Current");
  useEffect(() => {
    fetchBankTransactions();
    fetchBankAccounts();
    fetchExpenseHeads();

    // Real-time subscription for bank_transactions
    const bankTransactionsChannel = supabase.channel('bank-transactions-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'bank_transactions'
    }, () => {
      fetchBankTransactions();
    }).subscribe();

    // Real-time subscription for bank_accounts
    const bankAccountsChannel = supabase.channel('bank-accounts-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'bank_accounts'
    }, () => {
      fetchBankAccounts();
    }).subscribe();

    // Real-time subscription for expense_mapping
    const expenseMappingChannel = supabase.channel('expense-mapping-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'expense_mapping'
    }, () => {
      fetchExpenseHeads();
    }).subscribe();
    return () => {
      supabase.removeChannel(bankTransactionsChannel);
      supabase.removeChannel(bankAccountsChannel);
      supabase.removeChannel(expenseMappingChannel);
    };
  }, []);
  const fetchExpenseHeads = async () => {
    const {
      data,
      error
    } = await supabase.from("expense_mapping").select("expense_head").order("expense_head");
    if (error) {
      toast.error("Error fetching expense heads");
    } else if (data) {
      setExpenseHeads(data.map(item => item.expense_head));
    }
  };
  const fetchBankAccounts = async () => {
    const {
      data,
      error
    } = await supabase.from("bank_accounts").select("*").order("is_primary", {
      ascending: false
    }).order("name");
    if (error) {
      toast.error("Error fetching bank accounts");
    } else if (data) {
      setBankAccounts(data);
      // Auto-select primary bank for upload if not already selected
      if (!selectedBankForUpload && data.length > 0) {
        const primaryBank = data.find(b => b.is_primary) || data[0];
        setSelectedBankForUpload(primaryBank.id);
      }
    }
  };
  const fetchBankTransactions = async () => {
    const {
      data,
      error
    } = await supabase.from("bank_transactions").select("*").order("date", {
      ascending: false
    });
    if (error) {
      toast.error("Error fetching bank transactions");
    } else if (data) {
      setBankTransactions(data);
      // Update any transactions missing bank names
      await updateMissingBankNames(data);
      // Apply description mapping to existing records missing expense_head or vendor
      await applyMappingToExistingTransactions(data);
    }
  };
  const applyMappingToExistingTransactions = async (transactions: BankTransaction[]) => {
    // Find transactions that are missing expense_head or vendor
    const transactionsNeedingMapping = transactions.filter(t => !t.expense_head || !t.vendor);
    if (transactionsNeedingMapping.length === 0) return;

    // Apply mapping and update if needed
    for (const transaction of transactionsNeedingMapping) {
      const mapping = applyDescriptionMapping(transaction.description, transaction.expense_head, transaction.vendor);

      // Only update if mapping produced new values
      if (mapping.expense_head !== transaction.expense_head || mapping.vendor !== transaction.vendor) {
        await supabase.from("bank_transactions").update({
          expense_head: mapping.expense_head,
          vendor: mapping.vendor
        }).eq("id", transaction.id);
      }
    }
  };
  const updateMissingBankNames = async (transactions: BankTransaction[]) => {
    // Find transactions with bank_account_id but no bank_name
    const transactionsNeedingUpdate = transactions.filter(t => t.bank_account_id && !t.bank_name);
    if (transactionsNeedingUpdate.length === 0) return;

    // Get all bank accounts
    const {
      data: banks
    } = await supabase.from("bank_accounts").select("id, name");
    if (!banks) return;

    // Update each transaction with the correct bank name
    for (const transaction of transactionsNeedingUpdate) {
      const bank = banks.find(b => b.id === transaction.bank_account_id);
      if (bank) {
        await supabase.from("bank_transactions").update({
          bank_name: bank.name
        }).eq("id", transaction.id);
      }
    }

    // Refresh transactions after update
    if (transactionsNeedingUpdate.length > 0) {
      const {
        data: updatedData
      } = await supabase.from("bank_transactions").select("*").order("date", {
        ascending: false
      });
      if (updatedData) {
        setBankTransactions(updatedData);
      }
    }
  };
  const handleAddBank = async () => {
    if (!newBankName) {
      toast.error("Please enter bank name");
      return;
    }
    const {
      error
    } = await supabase.from("bank_accounts").insert({
      name: newBankName,
      account_number: newBankAccountNumber || null,
      account_type: newBankAccountType
    });
    if (error) {
      toast.error("Error adding bank account");
    } else {
      toast.success("Bank account added successfully");
      setIsAddBankOpen(false);
      setNewBankName("");
      setNewBankAccountNumber("");
      setNewBankAccountType("Current");
      fetchBankAccounts();
    }
  };
  const handleTogglePrimaryBank = async (bankId: string) => {
    // First, unset all primary flags
    await supabase.from("bank_accounts").update({
      is_primary: false
    }).neq("id", bankId);

    // Then set the selected bank as primary
    const {
      error
    } = await supabase.from("bank_accounts").update({
      is_primary: true
    }).eq("id", bankId);
    if (error) {
      toast.error("Error updating primary bank");
    } else {
      toast.success("Primary bank updated");
      fetchBankAccounts();
    }
  };
  const handleToggleBankActive = async (bankId: string, currentStatus: boolean) => {
    const {
      error
    } = await supabase.from("bank_accounts").update({
      is_active: !currentStatus
    }).eq("id", bankId);
    if (error) {
      toast.error("Error updating bank status");
    } else {
      toast.success("Bank status updated");
      fetchBankAccounts();
    }
  };
  const parseICICIFormat = (rawData: any[]) => {
    const transactions: {
      date: string;
      description: string;
      amount: number;
      expense_head: string | null;
      vendor: string | null;
    }[] = [];
    let lastBalance = "";

    // Find header row for ICICI format
    let headerRowIndex = -1;
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i] as any[];
      if (!Array.isArray(row)) continue;
      const hasValueDate = row.some(cell => typeof cell === "string" && cell.toLowerCase().includes("value date"));
      const hasDescription = row.some(cell => typeof cell === "string" && cell.toLowerCase().includes("description"));
      if (hasValueDate && hasDescription) {
        headerRowIndex = i;
        break;
      }
    }
    if (headerRowIndex === -1) {
      throw new Error("Could not find ICICI transaction table headers");
    }
    const headerRow = rawData[headerRowIndex] as any[];
    const findCol = (match: string) => headerRow.findIndex(h => typeof h === "string" && h.toLowerCase().includes(match.toLowerCase()));
    const dateCol = findCol("value date");
    const descriptionCol = findCol("description");
    const crDrCol = findCol("cr/dr");
    const amountCol = findCol("transaction amount");
    const balanceCol = findCol("available balance");
    if (dateCol === -1 || descriptionCol === -1 || crDrCol === -1 || amountCol === -1) {
      throw new Error("Required ICICI columns not found");
    }
    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
      const row = rawData[i] as any[];
      if (!Array.isArray(row)) continue;
      const dateValue = row[dateCol];
      if (!dateValue) continue;
      const description = row[descriptionCol] ?? "";
      const crDr = row[crDrCol] ?? "";
      const amountRaw = row[amountCol] ?? 0;
      const balanceRaw = balanceCol !== -1 ? row[balanceCol] ?? "" : "";

      // Parse date (DD/MM/YYYY format)
      let parsedDate: Date;
      if (typeof dateValue === "string" && dateValue.includes("/")) {
        const [day, month, year] = dateValue.split("/");
        parsedDate = new Date(`${year}-${month}-${day}`);
      } else {
        parsedDate = new Date(dateValue);
      }
      if (isNaN(parsedDate.getTime())) continue;
      const parseNumber = (val: any) => {
        if (typeof val === "number") return val;
        const cleaned = val.toString().replace(/,/g, "").trim();
        const n = parseFloat(cleaned || "0");
        return isNaN(n) ? 0 : n;
      };
      const amount = parseNumber(amountRaw);
      const finalAmount = crDr.toString().toUpperCase() === "CR" ? amount : -amount;
      if (balanceRaw) {
        lastBalance = balanceRaw.toString();
      }
      const descriptionStr = description.toString();
      const mapping = applyDescriptionMapping(descriptionStr, null, null);
      transactions.push({
        date: parsedDate.toISOString().split("T")[0],
        description: descriptionStr,
        amount: finalAmount,
        expense_head: mapping.expense_head,
        vendor: mapping.vendor
      });
    }
    return {
      transactions,
      lastBalance
    };
  };
  const parseJanataFormat = (rawData: any[]) => {
    const transactions: {
      date: string;
      description: string;
      amount: number;
      expense_head: string | null;
      vendor: string | null;
    }[] = [];
    let lastBalance = "";

    // Find header row for Janata format
    let headerRowIndex = -1;
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i] as any[];
      if (!Array.isArray(row)) continue;
      const hasDate = row.some(cell => typeof cell === "string" && cell.toLowerCase().includes("date"));
      const hasParticulars = row.some(cell => typeof cell === "string" && cell.toLowerCase().includes("transaction particulars"));
      if (hasDate && hasParticulars) {
        headerRowIndex = i;
        break;
      }
    }
    if (headerRowIndex === -1) {
      throw new Error("Could not find Janata transaction table headers");
    }
    const headerRow = rawData[headerRowIndex] as any[];
    const findCol = (match: string) => headerRow.findIndex(h => typeof h === "string" && h.toLowerCase().includes(match.toLowerCase()));
    const dateCol = findCol("date");
    const particularsCol = findCol("transaction particulars");
    const withdrawalCol = findCol("withdrawal");
    const depositCol = findCol("deposit");
    const balanceCol = findCol("available balance");
    if (dateCol === -1 || particularsCol === -1 || withdrawalCol === -1 && depositCol === -1) {
      throw new Error("Required Janata columns not found");
    }
    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
      const row = rawData[i] as any[];
      if (!Array.isArray(row)) continue;
      const dateValue = row[dateCol];
      if (!dateValue) continue;
      const particulars = row[particularsCol] ?? "";
      const withdrawalRaw = withdrawalCol !== -1 ? row[withdrawalCol] ?? 0 : 0;
      const depositRaw = depositCol !== -1 ? row[depositCol] ?? 0 : 0;
      const balanceRaw = balanceCol !== -1 ? row[balanceCol] ?? "" : "";

      // Parse date
      let parsedDate: Date;
      if (typeof dateValue === "string" && dateValue.includes("/")) {
        const [day, month, year] = dateValue.split("/");
        parsedDate = new Date(`${year}-${month}-${day}`);
      } else {
        parsedDate = new Date(dateValue);
      }
      if (isNaN(parsedDate.getTime())) continue;
      const parseNumber = (val: any) => {
        if (typeof val === "number") return val;
        const cleaned = val.toString().replace(/,/g, "").trim();
        const n = parseFloat(cleaned || "0");
        return isNaN(n) ? 0 : n;
      };
      const withdrawal = parseNumber(withdrawalRaw);
      const deposit = parseNumber(depositRaw);
      const amount = deposit - withdrawal;
      if (balanceRaw) {
        lastBalance = balanceRaw.toString();
      }
      const particularsStr = particulars.toString();
      const mapping = applyDescriptionMapping(particularsStr, null, null);
      transactions.push({
        date: parsedDate.toISOString().split("T")[0],
        description: particularsStr,
        amount,
        expense_head: mapping.expense_head,
        vendor: mapping.vendor
      });
    }
    return {
      transactions,
      lastBalance
    };
  };
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, {
        type: "array"
      });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: ""
      });
      if (!Array.isArray(rawData) || rawData.length === 0) {
        toast.error("No data found in the statement");
        return;
      }

      // Parse based on selected format
      let transactions: {
        date: string;
        description: string;
        amount: number;
        expense_head: string | null;
        vendor: string | null;
      }[];
      let lastBalance: string;
      if (bankStatementFormat === "icici") {
        const result = parseICICIFormat(rawData);
        transactions = result.transactions;
        lastBalance = result.lastBalance;
      } else {
        const result = parseJanataFormat(rawData);
        transactions = result.transactions;
        lastBalance = result.lastBalance;
      }
      if (transactions.length === 0) {
        toast.error("No transactions found in the statement");
        return;
      }
      setBankBalance(lastBalance);

      // Fetch existing transactions to detect duplicates
      const {
        data: existingTransactions,
        error: fetchError
      } = await supabase.from("bank_transactions").select("date, description, amount");
      if (fetchError) {
        toast.error("Error checking for duplicates");
        return;
      }

      // Create a Set of existing transaction keys for fast lookup
      const existingKeys = new Set((existingTransactions || []).map(t => `${t.date}|${t.description}|${t.amount}`));

      // Separate new transactions from duplicates
      const newTransactions = transactions.filter(t => {
        const key = `${t.date}|${t.description}|${t.amount}`;
        return !existingKeys.has(key);
      });
      const duplicateCount = transactions.length - newTransactions.length;
      if (newTransactions.length === 0) {
        toast.info("All transactions already exist in the database");
        event.target.value = "";
        return;
      }

      // Associate transactions with selected bank account
      const transactionsWithBank = newTransactions.map(t => ({
        ...t,
        bank_account_id: selectedBankForUpload,
        bank_name: bankAccounts.find(b => b.id === selectedBankForUpload)?.name || null
      }));

      // Insert only new transactions
      const {
        error
      } = await supabase.from("bank_transactions").insert(transactionsWithBank);

      // Update bank account balance and last statement date
      if (!error && selectedBankForUpload) {
        const selectedBank = bankAccounts.find(b => b.id === selectedBankForUpload);
        if (selectedBank) {
          const newBalance = lastBalance ? parseFloat(lastBalance.replace(/,/g, "")) : selectedBank.current_balance;
          const latestDate = transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.date;
          await supabase.from("bank_accounts").update({
            current_balance: newBalance,
            last_statement_date: latestDate || new Date().toISOString().split("T")[0]
          }).eq("id", selectedBankForUpload);
        }
      }
      if (error) {
        toast.error("Error importing transactions");
      } else {
        if (duplicateCount > 0) {
          toast.success(`Imported ${newTransactions.length} new transaction${newTransactions.length !== 1 ? "s" : ""}. Skipped ${duplicateCount} duplicate${duplicateCount !== 1 ? "s" : ""}.`);
        } else {
          toast.success(`Successfully imported ${newTransactions.length} transaction${newTransactions.length !== 1 ? "s" : ""}`);
        }
        fetchBankTransactions();
      }
      event.target.value = "";
    } catch (error) {
      console.error("Error parsing file", error);
      toast.error("Error parsing file");
    }
  };
  const handleUpdateTransaction = async (id: string) => {
    const {
      error
    } = await supabase.from("bank_transactions").update({
      expense_head: editingExpenseHead || null,
      vendor: editingVendor || null,
      remark: editingRemark || null
    }).eq("id", id);
    if (error) {
      toast.error("Error updating transaction");
    } else {
      toast.success("Transaction updated");
      setEditingTransactionId(null);
      setEditingExpenseHead("");
      setEditingVendor("");
      setEditingRemark("");
      fetchBankTransactions();
    }
  };
  const handleDeleteTransaction = async (id: string) => {
    const {
      error
    } = await supabase.from("bank_transactions").delete().eq("id", id);
    if (error) {
      toast.error("Error deleting transaction");
    } else {
      toast.success("Transaction deleted");
      fetchBankTransactions();
    }
  };
  const startEditingTransaction = (transaction: BankTransaction) => {
    setEditingTransactionId(transaction.id);
    setEditingExpenseHead(transaction.expense_head || "");
    setEditingVendor(transaction.vendor || "");
    setEditingRemark(transaction.remark || "");
  };
  const getFilteredTransactions = () => {
    let filtered = bankTransactions;
    if (selectedBankFilter !== "all") {
      filtered = filtered.filter(t => t.bank_account_id === selectedBankFilter);
    }
    if (selectedMonthFilter !== "all") {
      filtered = filtered.filter(t => {
        const date = new Date(t.date);
        const transactionMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        return transactionMonth === selectedMonthFilter;
      });
    }
    if (selectedVendorFilter !== "all") {
      filtered = filtered.filter(t => t.vendor === selectedVendorFilter);
    }
    return filtered;
  };
  const handleDownloadExcel = () => {
    const filteredTransactions = getFilteredTransactions();
    if (filteredTransactions.length === 0) {
      toast.error("No transactions to download");
      return;
    }
    const data = filteredTransactions.map(t => ({
      Date: format(new Date(t.date), 'dd/MM/yyyy'),
      Bank: t.bank_name || "",
      Description: t.description,
      "Expense Head": t.expense_head || "",
      Remark: t.remark || "",
      Vendor: t.vendor || "",
      Amount: `₹${t.amount.toLocaleString('en-IN', {
        minimumFractionDigits: 2
      })}`
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");

    // Set column widths
    worksheet['!cols'] = [{
      wch: 12
    },
    // Date
    {
      wch: 15
    },
    // Bank
    {
      wch: 40
    },
    // Description
    {
      wch: 15
    },
    // Expense Head
    {
      wch: 20
    },
    // Remark
    {
      wch: 15
    },
    // Vendor
    {
      wch: 12
    } // Amount
    ];
    const fileName = `Bank_Transactions_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast.success("Excel file downloaded successfully");
  };
  const handleDownloadPDF = () => {
    const filteredTransactions = getFilteredTransactions();
    if (filteredTransactions.length === 0) {
      toast.error("No transactions to download");
      return;
    }
    const doc = new jsPDF({
      orientation: 'landscape'
    });

    // Add title
    doc.setFontSize(16);
    doc.text("Bank Transactions", 14, 15);

    // Add filter info
    doc.setFontSize(10);
    let yPos = 22;
    if (selectedBankFilter !== "all") {
      const bankName = bankAccounts.find(b => b.id === selectedBankFilter)?.name;
      doc.text(`Bank: ${bankName}`, 14, yPos);
      yPos += 5;
    }
    if (selectedMonthFilter !== "all") {
      const [year, monthNum] = selectedMonthFilter.split('-');
      const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long'
      });
      doc.text(`Month: ${monthName}`, 14, yPos);
      yPos += 5;
    }
    if (selectedVendorFilter !== "all") {
      doc.text(`Vendor: ${selectedVendorFilter}`, 14, yPos);
      yPos += 5;
    }

    // Prepare table data - Use Rs. instead of ₹ for PDF compatibility
    const tableData = filteredTransactions.map(t => {
      const amount = t.amount;
      const formattedAmount = amount >= 0 ? `+Rs.${amount.toLocaleString('en-IN', {
        minimumFractionDigits: 2
      })}` : `-Rs.${Math.abs(amount).toLocaleString('en-IN', {
        minimumFractionDigits: 2
      })}`;
      return [format(new Date(t.date), 'dd/MM/yyyy'), t.bank_name || "", t.description, t.expense_head || "", t.remark || "", t.vendor || "", formattedAmount];
    });

    // Calculate totals
    const totalAmount = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
    const formattedTotal = totalAmount >= 0 ? `Rs.${totalAmount.toLocaleString('en-IN', {
      minimumFractionDigits: 2
    })}` : `-Rs.${Math.abs(totalAmount).toLocaleString('en-IN', {
      minimumFractionDigits: 2
    })}`;
    autoTable(doc, {
      startY: yPos + 5,
      head: [['Date', 'Bank', 'Description', 'Expense Head', 'Remark', 'Vendor', 'Amount']],
      body: tableData,
      foot: [['', '', '', '', '', 'Total:', formattedTotal]],
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold'
      },
      footStyles: {
        fillColor: [240, 240, 240],
        textColor: 0,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: {
          cellWidth: 25
        },
        1: {
          cellWidth: 30
        },
        2: {
          cellWidth: 60
        },
        3: {
          cellWidth: 30
        },
        4: {
          cellWidth: 35
        },
        5: {
          cellWidth: 30
        },
        6: {
          cellWidth: 30,
          halign: 'right'
        }
      }
    });
    const fileName = `Bank_Transactions_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    toast.success("PDF file downloaded successfully");
  };
  return <div className="min-h-screen bg-gradient-mesh">
      <NavHeader />
      
      <main className="px-3 py-2">
        <div className="mb-3">
          <h1 className="text-foreground mb-1 text-xl font-medium">Bank Reconciliation</h1>
        </div>

        <div className="space-y-3">
          {/* Bank Accounts Management Section */}
          <div className="glass neu-card p-4 rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-foreground">Bank Accounts</h3>
              <Dialog open={isAddBankOpen} onOpenChange={setIsAddBankOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Plus className="w-4 h-4 mr-1.5" />
                    Add Bank Account
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Bank Account</DialogTitle>
                    <DialogDescription>
                      Add a new bank account to manage statements and reconciliation.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label>Bank Name</Label>
                      <Input value={newBankName} onChange={e => setNewBankName(e.target.value)} placeholder="e.g., ICICI Bank, Janata Bank" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Account Number (Optional)</Label>
                      <Input value={newBankAccountNumber} onChange={e => setNewBankAccountNumber(e.target.value)} placeholder="Account number" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Account Type</Label>
                      <Select value={newBankAccountType} onValueChange={setNewBankAccountType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Current">Current</SelectItem>
                          <SelectItem value="Savings">Savings</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAddBankOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddBank}>Add Bank Account</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {bankAccounts.map(bank => <div key={bank.id} className="bg-card border border-border rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-foreground">{bank.name}</h4>
                        {bank.is_primary && <span className="px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                            Primary
                          </span>}
                      </div>
                      {bank.account_number && <p className="text-xs text-muted-foreground">A/C: {bank.account_number}</p>}
                      <p className="text-xs text-muted-foreground">{bank.account_type}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={bank.is_active} onCheckedChange={() => handleToggleBankActive(bank.id, bank.is_active)} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Balance:</span>
                      <span className="font-semibold text-foreground">₹{bank.current_balance.toLocaleString('en-IN', {
                      minimumFractionDigits: 2
                    })}</span>
                    </div>
                    {bank.last_statement_date && <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Last Statement:</span>
                        <span>{new Date(bank.last_statement_date).toLocaleDateString()}</span>
                      </div>}
                    {!bank.is_primary}
                  </div>
                </div>)}
            </div>
          </div>

          {/* Upload and Transactions Section */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold text-foreground">Transactions</h2>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleDownloadExcel} className="glass-button">
                  <Download className="w-4 h-4 mr-1.5" />
                  Excel
                </Button>
                <Button size="sm" variant="outline" onClick={handleDownloadPDF} className="glass-button">
                  <Download className="w-4 h-4 mr-1.5" />
                  PDF
                </Button>
              </div>
              <Select value={selectedBankFilter} onValueChange={setSelectedBankFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by bank" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Banks</SelectItem>
                  {bankAccounts.map(bank => <SelectItem key={bank.id} value={bank.id}>{bank.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedMonthFilter} onValueChange={setSelectedMonthFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {Array.from(new Set(bankTransactions.map(t => {
                  const date = new Date(t.date);
                  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                }))).sort((a, b) => b.localeCompare(a)).map(month => {
                  const [year, monthNum] = month.split('-');
                  const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long'
                  });
                  return <SelectItem key={month} value={month}>{monthName}</SelectItem>;
                })}
                </SelectContent>
              </Select>
              <Select value={selectedVendorFilter} onValueChange={setSelectedVendorFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by vendor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  {Array.from(new Set(bankTransactions.map(t => t.vendor).filter(Boolean))).sort().map(vendor => <SelectItem key={vendor} value={vendor!}>{vendor}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Select value={selectedBankForUpload} onValueChange={bankId => {
              setSelectedBankForUpload(bankId);
              // Auto-determine format based on bank name
              const selectedBank = bankAccounts.find(b => b.id === bankId);
              if (selectedBank) {
                if (selectedBank.name.toLowerCase().includes('janata')) {
                  setBankStatementFormat('janata');
                } else {
                  setBankStatementFormat('icici');
                }
              }
            }}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select bank for upload" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map(bank => <SelectItem key={bank.id} value={bank.id}>
                      {bank.name} ({bank.name.toLowerCase().includes('janata') ? 'Janata Format' : 'ICICI Format'})
                    </SelectItem>)}
                </SelectContent>
              </Select>
              <div className="relative">
                <Input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" id="excel-upload" disabled={!selectedBankForUpload} />
                <Label htmlFor="excel-upload">
                  <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground" asChild disabled={!selectedBankForUpload}>
                    <span className="cursor-pointer">
                      <Upload className="w-4 h-4 mr-1.5" />
                      Upload Statement
                    </span>
                  </Button>
                </Label>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            {(() => {
            const filteredTransactions = getFilteredTransactions();
            return filteredTransactions.length > 0 ? <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left py-2 px-3 text-xs font-medium text-foreground">Date</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-foreground">Bank</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-foreground">Description</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-foreground">Expense Head</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-foreground">Remark</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-foreground">Vendor</th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-foreground">Amount</th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.map(transaction => <tr key={transaction.id} className="border-t border-border hover:bg-muted/50">
                          <td className="py-2 px-3 text-sm text-foreground">
                            {format(new Date(transaction.date), 'dd/MM/yyyy')}
                          </td>
                          <td className="py-2 px-3 text-sm">
                            {transaction.bank_name && <span className="inline-block px-2 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground rounded">
                                {transaction.bank_name}
                              </span>}
                          </td>
                          <td className="py-2 px-3 text-sm text-foreground max-w-xs truncate">
                            {transaction.description}
                          </td>
                          <td className="py-2 px-3 text-sm">
                            {editingTransactionId === transaction.id ? <Select value={editingExpenseHead} onValueChange={setEditingExpenseHead}>
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Select Expense Head" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[200px]">
                                  {expenseHeads.map(head => <SelectItem key={head} value={head}>
                                      {head}
                                    </SelectItem>)}
                                </SelectContent>
                              </Select> : <span className="text-foreground">
                                {transaction.expense_head || "-"}
                              </span>}
                          </td>
                          <td className="py-2 px-3 text-sm">
                            {editingTransactionId === transaction.id ? <Input value={editingRemark} onChange={e => setEditingRemark(e.target.value)} placeholder="Remark" className="h-8" /> : <span className="text-foreground">
                                {transaction.remark || "-"}
                              </span>}
                          </td>
                          <td className="py-2 px-3 text-sm">
                            {editingTransactionId === transaction.id ? <Input value={editingVendor} onChange={e => setEditingVendor(e.target.value)} placeholder="Vendor" className="h-8" /> : <span className="text-foreground">
                                {transaction.vendor || "-"}
                              </span>}
                          </td>
                          <td className={`py-2 px-3 text-sm text-right font-medium ${transaction.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {transaction.amount >= 0 ? "+₹" : "-₹"}
                            {Math.abs(transaction.amount).toLocaleString('en-IN', {
                        minimumFractionDigits: 2
                      })}
                          </td>
                          <td className="py-2 px-3 text-right">
                            {editingTransactionId === transaction.id ? <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-primary" onClick={() => handleUpdateTransaction(transaction.id)}>
                                  Save
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => {
                          setEditingTransactionId(null);
                          setEditingExpenseHead("");
                          setEditingVendor("");
                          setEditingRemark("");
                        }}>
                                  Cancel
                                </Button>
                              </div> : <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-primary hover:text-primary hover:bg-primary/10" onClick={() => startEditingTransaction(transaction)}>
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteTransaction(transaction.id)}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>}
                          </td>
                        </tr>)}
                    </tbody>
                  </table>
                </div> : <div className="p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    {selectedBankFilter === "all" ? "No bank transactions uploaded yet. Upload an Excel file to get started." : "No transactions found for the selected bank."}
                  </p>
                </div>;
          })()}
          </div>
        </div>
      </main>
    </div>;
}