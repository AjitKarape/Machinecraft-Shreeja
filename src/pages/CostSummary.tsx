import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NavHeader } from "@/components/NavHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IndianRupee, TrendingUp, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useData } from "@/contexts/DataContext";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
interface BankTransaction {
  id: string;
  date: string;
  amount: number;
  expense_head?: string;
  bank_name?: string;
  description: string;
  vendor?: string;
  remark?: string;
}
interface ExpenseMapping {
  id: string;
  expense_head: string;
  group_name: string;
  is_revenue: boolean;
  opening_balance: number;
  opening_balance_date: string | null;
}
interface StockCount {
  toy_id: string;
  closing_balance: number;
  date: string;
}
interface AggregatedAmount {
  month: string;
  expense_head: string;
  amount: number;
  transactionIds: string[];
}
export default function CostSummary() {
  const {
    toys
  } = useData();
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
  const [expenseMappings, setExpenseMappings] = useState<ExpenseMapping[]>([]);
  const [stockCounts, setStockCounts] = useState<StockCount[]>([]);
  const [selectedFinancialYear, setSelectedFinancialYear] = useState<number>(getCurrentFinancialYear());
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    "Inflow": true,
    "Outflow": true
  });
  useEffect(() => {
    fetchBankTransactions();
    fetchExpenseMappings();
    fetchStockCounts();
    const transactionsChannel = supabase.channel("bank-transactions-changes").on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "bank_transactions"
    }, fetchBankTransactions).subscribe();
    const mappingsChannel = supabase.channel("expense-mappings-changes").on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "expense_mapping"
    }, fetchExpenseMappings).subscribe();
    const stocksChannel = supabase.channel("stock-counts-cost-changes").on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "stock_counts"
    }, fetchStockCounts).subscribe();
    return () => {
      supabase.removeChannel(transactionsChannel);
      supabase.removeChannel(mappingsChannel);
      supabase.removeChannel(stocksChannel);
    };
  }, []);
  const fetchBankTransactions = async () => {
    const {
      data
    } = await supabase.from("bank_transactions").select("*").order("date", {
      ascending: false
    });
    if (data) setBankTransactions(data);
  };
  const fetchExpenseMappings = async () => {
    const {
      data
    } = await supabase.from("expense_mapping").select("*");
    if (data) setExpenseMappings(data);
  };
  const fetchStockCounts = async () => {
    const {
      data
    } = await supabase.from("stock_counts").select("toy_id, closing_balance, date");
    if (data) setStockCounts(data);
  };
  function getCurrentFinancialYear(): number {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    return currentMonth >= 3 ? currentYear : currentYear - 1;
  }
  function getFinancialYearMonths(fyYear: number): string[] {
    const months: string[] = [];
    for (let i = 0; i < 12; i++) {
      const month = (i + 3) % 12;
      const year = month < 3 ? fyYear + 1 : fyYear;
      months.push(`${year}-${String(month + 1).padStart(2, '0')}-01`);
    }
    return months;
  }
  const calculateFinishedToysForMonth = (monthStr: string) => {
    const monthDate = new Date(monthStr);
    const monthEnd = endOfMonth(monthDate);

    // Get stock counts at end of month for each toy
    const monthStocks: Record<string, number> = {};

    // For each toy, get the latest stock count up to month end
    toys.forEach(toy => {
      const stocksForToy = stockCounts.filter(sc => sc.toy_id === toy.id && new Date(sc.date) <= monthEnd).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      if (stocksForToy.length > 0) {
        monthStocks[toy.id] = stocksForToy[0].closing_balance;
      } else {
        monthStocks[toy.id] = 0;
      }
    });

    // Sum up all toy stocks
    return Object.values(monthStocks).reduce((sum, stock) => sum + stock, 0);
  };
  const normalizeHead = (head: string | undefined | null) => {
    const raw = (head ?? "").trim();
    const lower = raw.toLowerCase();

    // Map common variants to canonical expense head names
    if (lower === "other cost") return "Other Cost";
    if (lower === "rent") return "Rent ";
    return raw;
  };

  // Aggregate bank transactions by month and expense_head
  const aggregateTransactionsByMonth = (): AggregatedAmount[] => {
    const aggregated: Record<string, AggregatedAmount> = {};
    bankTransactions.forEach(txn => {
      if (!txn.expense_head) return;
      const normalizedHead = normalizeHead(txn.expense_head);
      if (!normalizedHead) return;
      const txnDate = new Date(txn.date);
      const monthStr = format(new Date(txnDate.getFullYear(), txnDate.getMonth(), 1), "yyyy-MM-dd");
      const key = `${monthStr}-${normalizedHead}`;
      if (!aggregated[key]) {
        aggregated[key] = {
          month: monthStr,
          expense_head: normalizedHead,
          amount: 0,
          transactionIds: []
        };
      }
      aggregated[key].amount += txn.amount;
      aggregated[key].transactionIds.push(txn.id);
    });
    return Object.values(aggregated);
  };
  const fyMonths = getFinancialYearMonths(selectedFinancialYear);
  const aggregatedData = aggregateTransactionsByMonth();

  // Define Cash Flow groups - simplified, use group names for classification
  const inflowGroupNames = ["Revenue", "Receipts", "Funding"];
  
  const inflowHeads = expenseMappings.filter(m => 
    inflowGroupNames.includes(m.group_name)
  ).map(m => normalizeHead(m.expense_head));
  
  const outflowHeads = expenseMappings.filter(m => 
    !inflowGroupNames.includes(m.group_name)
  ).map(m => normalizeHead(m.expense_head));
  // Find unmapped expense heads
  const allExpenseHeads = Array.from(new Set(bankTransactions.map(t => normalizeHead(t.expense_head)).filter(Boolean))) as string[];
  const unmappedExpenses = allExpenseHeads.filter(head => !inflowHeads.includes(head) && !outflowHeads.includes(head));
  
  const getAmountForMonth = (expenseHead: string, month: string) => {
    const item = aggregatedData.find(a => a.expense_head === expenseHead && a.month === month);
    let amount = item ? item.amount : 0;

    // Add opening balance only to the first month of the FY where opening_balance_date falls
    const firstMonth = fyMonths[0];
    if (month === firstMonth) {
      const mapping = expenseMappings.find(m => normalizeHead(m.expense_head) === expenseHead);
      if (mapping && mapping.opening_balance && mapping.opening_balance_date) {
        const openingBalanceDate = new Date(mapping.opening_balance_date);
        const openingBalanceYear = openingBalanceDate.getMonth() >= 3 
          ? openingBalanceDate.getFullYear() 
          : openingBalanceDate.getFullYear() - 1;
        
        // Only add opening balance if it matches the selected financial year
        if (openingBalanceYear === selectedFinancialYear) {
          amount += mapping.opening_balance;
        }
      }
    }
    return amount;
  };

  const getInflowTotal = (month: string) => {
    return inflowHeads.reduce((sum, head) => sum + getAmountForMonth(head, month), 0);
  };

  const getOutflowTotal = (month: string) => {
    return outflowHeads.reduce((sum, head) => sum + Math.abs(getAmountForMonth(head, month)), 0);
  };

  // Financial year Cash Flow calculations
  const totalYearInflow = fyMonths.reduce((sum, month) => sum + getInflowTotal(month), 0);
  const totalYearOutflow = fyMonths.reduce((sum, month) => sum + getOutflowTotal(month), 0);
  const netCashFlow = totalYearInflow - totalYearOutflow;

  // Calculate total funding as on date (cumulative up to current date, across all time)
  const today = new Date();
  const fundingMapping = expenseMappings.find(m => normalizeHead(m.expense_head) === "Funding");
  
  console.log("Today:", today);
  console.log("Funding Mapping:", fundingMapping);
  if (fundingMapping) {
    console.log("Opening Balance:", fundingMapping.opening_balance);
    console.log("Opening Balance Date:", fundingMapping.opening_balance_date);
    console.log("Opening Balance Date as Date:", new Date(fundingMapping.opening_balance_date));
    console.log("Is opening balance date <= today?", fundingMapping.opening_balance_date ? new Date(fundingMapping.opening_balance_date) <= today : "no date");
  }
  
  const fundingOpeningBalance = fundingMapping && fundingMapping.opening_balance && 
    fundingMapping.opening_balance_date && 
    new Date(fundingMapping.opening_balance_date) <= today 
    ? fundingMapping.opening_balance 
    : 0;
  
  const fundingTransactionsSum = bankTransactions
    .filter(txn => normalizeHead(txn.expense_head) === "Funding" && new Date(txn.date) <= today)
    .reduce((sum, txn) => sum + txn.amount, 0);
    
  const totalFunding = fundingTransactionsSum + fundingOpeningBalance;
  
  console.log("Funding Opening Balance:", fundingOpeningBalance);
  console.log("Funding Transactions Sum:", fundingTransactionsSum);
  console.log("Total Funding:", totalFunding);

  const availableYears = Array.from(new Set([...bankTransactions.map(t => {
    const date = new Date(t.date);
    const month = date.getMonth();
    const year = date.getFullYear();
    return month >= 3 ? year : year - 1;
  }), getCurrentFinancialYear()])).sort((a, b) => b - a);
  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };
  const renderAmountCell = (key: string, month: string, idx: number) => {
    const amount = getAmountForMonth(key, month);
    return <TableCell key={idx} className="text-center py-1 text-xs">
        {amount !== 0 ? `₹${Number(Math.abs(amount)).toLocaleString('en-IN', {
        maximumFractionDigits: 0
      })}` : "-"}
      </TableCell>;
  };
  return <div className="min-h-screen bg-gradient-mesh">
      <NavHeader />
      
      <main className="px-3 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Cash Flow Statement</h1>
            <p className="text-sm text-muted-foreground mt-1">
              4 metrics · FY {selectedFinancialYear}-{String(selectedFinancialYear + 1).slice(2)}
            </p>
          </div>
          <select className="border rounded px-3 py-2 text-sm bg-background" value={selectedFinancialYear} onChange={e => setSelectedFinancialYear(Number(e.target.value))}>
            {availableYears.map(year => <option key={year} value={year}>
                FY {year}-{String(year + 1).slice(2)}
              </option>)}
          </select>
        </div>

        {/* Summary Tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card className="overflow-hidden hover:shadow-lg transition-all animate-fade-in">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-xs text-muted-foreground mb-1 truncate">
                    Net Cash Flow
                  </h3>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-2xl font-bold leading-none ${netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₹{Math.abs(netCashFlow).toLocaleString('en-IN', {
                      maximumFractionDigits: 0
                    })}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden hover:shadow-lg transition-all animate-fade-in">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-xs text-muted-foreground mb-1 truncate">
                    Total Inflow
                  </h3>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-primary leading-none">
                      ₹{totalYearInflow.toLocaleString('en-IN', {
                      maximumFractionDigits: 0
                    })}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden hover:shadow-lg transition-all animate-fade-in">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-xs text-muted-foreground mb-1 truncate">
                    Total Outflow
                  </h3>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-destructive leading-none">
                      ₹{totalYearOutflow.toLocaleString('en-IN', {
                      maximumFractionDigits: 0
                    })}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden hover:shadow-lg transition-all animate-fade-in">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-xs text-muted-foreground mb-1 truncate">
                    Total Funding
                  </h3>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-accent leading-none">
                      ₹{totalFunding.toLocaleString('en-IN', {
                      maximumFractionDigits: 0
                    })}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-6" />

        {/* Cash Flow Statement Table */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-foreground mb-4">
            Cash Flow Statement (Apr - Mar)
          </h2>
          <div className="overflow-x-auto border rounded-md bg-white/60 backdrop-blur-md shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b">
                      <TableHead className="sticky left-0 z-20 bg-background w-48 min-w-48 text-xs font-semibold">Category</TableHead>
                      {fyMonths.map((month, idx) => <TableHead key={idx} className="text-center text-xs whitespace-nowrap">
                          {format(new Date(month), "MMM yy")}
                        </TableHead>)}
                      <TableHead className="text-center text-xs font-semibold">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* INFLOW Section */}
                    <TableRow className="border-b">
                      <TableCell className="sticky left-0 z-10 bg-background">
                        <Collapsible open={expandedGroups["Inflow"]} onOpenChange={() => toggleGroup("Inflow")}>
                          <CollapsibleTrigger className="flex items-center gap-2 font-semibold text-foreground text-sm py-2">
                            {expandedGroups["Inflow"] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            INFLOW
                          </CollapsibleTrigger>
                        </Collapsible>
                      </TableCell>
                      {fyMonths.map((month, idx) => <TableCell key={idx} className="text-center py-2 text-xs font-medium">
                          ₹{getInflowTotal(month).toLocaleString('en-IN', {
                    maximumFractionDigits: 0
                  })}
                        </TableCell>)}
                      <TableCell className="text-center py-2 text-xs font-semibold">
                        ₹{totalYearInflow.toLocaleString('en-IN', {
                    maximumFractionDigits: 0
                  })}
                      </TableCell>
                    </TableRow>

                    {expandedGroups["Inflow"] && inflowHeads.map(head => <TableRow key={head} className="hover:bg-muted/20 border-b border-border/50">
                        <TableCell className="sticky left-0 z-10 bg-background pl-8 text-xs">
                          {head}
                        </TableCell>
                        {fyMonths.map((month, idx) => renderAmountCell(head, month, idx))}
                        <TableCell className="text-center py-1 text-xs">
                          ₹{Math.abs(fyMonths.reduce((sum, m) => sum + getAmountForMonth(head, m), 0)).toLocaleString('en-IN', {
                    maximumFractionDigits: 0
                  })}
                        </TableCell>
                      </TableRow>)}

                    {/* OUTFLOW Section */}
                    <TableRow className="border-b">
                      <TableCell className="sticky left-0 z-10 bg-background">
                        <Collapsible open={expandedGroups["Outflow"]} onOpenChange={() => toggleGroup("Outflow")}>
                          <CollapsibleTrigger className="flex items-center gap-2 font-semibold text-foreground text-sm py-2">
                            {expandedGroups["Outflow"] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            OUTFLOW
                          </CollapsibleTrigger>
                        </Collapsible>
                      </TableCell>
                      {fyMonths.map((month, idx) => <TableCell key={idx} className="text-center py-2 text-xs font-medium">
                          ₹{getOutflowTotal(month).toLocaleString('en-IN', {
                    maximumFractionDigits: 0
                  })}
                        </TableCell>)}
                      <TableCell className="text-center py-2 text-xs font-semibold">
                        ₹{totalYearOutflow.toLocaleString('en-IN', {
                    maximumFractionDigits: 0
                  })}
                      </TableCell>
                    </TableRow>

                    {expandedGroups["Outflow"] && outflowHeads.map(head => <TableRow key={head} className="hover:bg-muted/20 border-b border-border/50">
                        <TableCell className="sticky left-0 z-10 bg-background pl-8 text-xs">
                          {head}
                        </TableCell>
                        {fyMonths.map((month, idx) => renderAmountCell(head, month, idx))}
                        <TableCell className="text-center py-1 text-xs">
                          ₹{Math.abs(fyMonths.reduce((sum, m) => sum + getAmountForMonth(head, m), 0)).toLocaleString('en-IN', {
                    maximumFractionDigits: 0
                  })}
                        </TableCell>
                      </TableRow>)}

                    {/* Net Cash Flow Row */}
                    <TableRow className="font-semibold border-t-2 border-primary/30">
                      <TableCell className="sticky left-0 z-10 bg-background text-sm py-3">NET CASH FLOW</TableCell>
                      {fyMonths.map((month, idx) => {
                        const netFlow = getInflowTotal(month) - getOutflowTotal(month);
                        return <TableCell key={idx} className={`text-center py-3 text-xs ${netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ₹{Math.abs(netFlow).toLocaleString('en-IN', {
                            maximumFractionDigits: 0
                          })}
                        </TableCell>;
                      })}
                      <TableCell className={`text-center py-3 text-xs font-semibold ${netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ₹{Math.abs(netCashFlow).toLocaleString('en-IN', {
                          maximumFractionDigits: 0
                        })}
                      </TableCell>
                    </TableRow>

                    {/* Unclassified items */}
                    {unmappedExpenses.length > 0 && <>
                        <TableRow className="border-t">
                          <TableCell colSpan={14} className="text-center py-2 text-xs text-muted-foreground italic">
                            Unclassified Expenses
                          </TableCell>
                        </TableRow>
                        {unmappedExpenses.map(head => <TableRow key={head} className="hover:bg-muted/20 border-b border-border/50">
                            <TableCell className="sticky left-0 z-10 bg-background pl-8 text-xs text-muted-foreground">
                              {head}
                            </TableCell>
                            {fyMonths.map((month, idx) => <TableCell key={idx} className="text-center py-1 text-xs text-muted-foreground">
                                {getAmountForMonth(head, month) !== 0 ? `₹${Number(Math.abs(getAmountForMonth(head, month))).toLocaleString('en-IN', {
                        maximumFractionDigits: 0
                      })}` : "-"}
                              </TableCell>)}
                            <TableCell className="text-center py-1 text-xs text-muted-foreground">
                              ₹{Math.abs(fyMonths.reduce((sum, m) => sum + getAmountForMonth(head, m), 0)).toLocaleString('en-IN', {
                        maximumFractionDigits: 0
                      })}
                            </TableCell>
                          </TableRow>)}
                      </>}
                  </TableBody>
                </Table>
              </div>
        </div>
      </main>
    </div>;
}