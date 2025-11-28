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
    "Revenue": true,
    "Direct Expenses": true,
    "Operating Cost": true,
    "Assets": false,
    "Investment": false,
    "Unclassified": false
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

  // Define P&L groups in order
  const plGroups = ["Direct Expenses", "Operating Cost"];

  // Categorize expense_heads into revenue and expense groups
  const revenueHeads = expenseMappings.filter(m => m.is_revenue).map(m => normalizeHead(m.expense_head));
  const expenseToGroup: Record<string, string> = {};
  const groupedExpenses: Record<string, string[]> = {};
  expenseMappings.forEach(mapping => {
    if (!mapping.is_revenue) {
      const normalizedHead = normalizeHead(mapping.expense_head);
      if (!normalizedHead) return;

      // Normalize group name to handle case inconsistencies
      const normalizedGroup = mapping.group_name === "Operating cost" ? "Operating Cost" : mapping.group_name;
      expenseToGroup[normalizedHead] = normalizedGroup;
      if (!groupedExpenses[normalizedGroup]) {
        groupedExpenses[normalizedGroup] = [];
      }
      groupedExpenses[normalizedGroup].push(normalizedHead);
    }
  });

  // Find unmapped expense heads
  const allExpenseHeads = Array.from(new Set(bankTransactions.map(t => normalizeHead(t.expense_head)).filter(Boolean))) as string[];
  const unmappedExpenses = allExpenseHeads.filter(head => !expenseToGroup[head] && !revenueHeads.includes(head));
  if (unmappedExpenses.length > 0) {
    groupedExpenses["Unclassified"] = unmappedExpenses;
  }

  // Separate P&L groups from other categories
  const plGroupedExpenses: Record<string, string[]> = {};
  const otherGroupedExpenses: Record<string, string[]> = {};
  Object.entries(groupedExpenses).forEach(([groupName, heads]) => {
    if (plGroups.includes(groupName)) {
      plGroupedExpenses[groupName] = heads;
    } else {
      otherGroupedExpenses[groupName] = heads;
    }
  });
  const getAmountForMonth = (expenseHead: string, month: string) => {
    const item = aggregatedData.find(a => a.expense_head === expenseHead && a.month === month);
    let amount = item ? item.amount : 0;

    // Add opening balance for the first month of the financial year (April)
    const firstMonth = fyMonths[0];
    if (month === firstMonth) {
      const mapping = expenseMappings.find(m => normalizeHead(m.expense_head) === expenseHead);
      if (mapping && mapping.opening_balance) {
        amount += mapping.opening_balance;
      }
    }
    return amount;
  };
  const getGroupTotal = (groupName: string, month: string) => {
    const headsInGroup = groupedExpenses[groupName] || [];
    return headsInGroup.reduce((sum, head) => sum + getAmountForMonth(head, month), 0);
  };
  const getRevenueTotal = (month: string) => {
    return revenueHeads.reduce((sum, head) => sum + getAmountForMonth(head, month), 0);
  };

  // Financial year P&L calculations (only for P&L groups)
  const totalYearRevenue = fyMonths.reduce((sum, month) => sum + getRevenueTotal(month), 0);
  const totalYearDirectExpenses = fyMonths.reduce((sum, month) => {
    return sum + getGroupTotal("Direct Expenses", month);
  }, 0);
  const totalYearOperatingExpenses = fyMonths.reduce((sum, month) => {
    return sum + getGroupTotal("Operating Cost", month);
  }, 0);
  const grossProfit = totalYearRevenue + totalYearDirectExpenses;
  const netProfit = grossProfit + totalYearOperatingExpenses;

  // Calculate total funding as on date (cumulative)
  const fundingMapping = expenseMappings.find(m => normalizeHead(m.expense_head) === "Funding");
  const fundingOpeningBalance = fundingMapping?.opening_balance || 0;
  const totalFunding = bankTransactions.filter(txn => txn.expense_head === "Funding").reduce((sum, txn) => sum + txn.amount, 0) + fundingOpeningBalance;
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
            <h1 className="text-2xl font-bold text-foreground">Cost Summary</h1>
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-6">
          <Card className="overflow-hidden hover:shadow-lg transition-all animate-fade-in">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-xs text-muted-foreground mb-1 truncate">
                    Gross Profit
                  </h3>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-2xl font-bold leading-none ${grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₹{Math.abs(grossProfit).toLocaleString('en-IN', {
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
                    Net Profit
                  </h3>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-2xl font-bold leading-none ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₹{Math.abs(netProfit).toLocaleString('en-IN', {
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
                    Total Revenue
                  </h3>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-primary leading-none">
                      ₹{totalYearRevenue.toLocaleString('en-IN', {
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
                    <span className="text-2xl font-bold text-primary leading-none">
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

        {/* P&L Statement Table */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-foreground mb-4">
            Profit & Loss Statement (Apr - Mar)
          </h2>
          <div className="overflow-x-auto border rounded-md glass neu-card">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted hover:bg-muted">
                      <TableHead className="sticky left-0 z-20 bg-muted w-48 min-w-48 text-xs">Category</TableHead>
                      {fyMonths.map((month, idx) => <TableHead key={idx} className="text-center text-xs whitespace-nowrap">
                          {format(new Date(month), "MMM yy")}
                        </TableHead>)}
                      <TableHead className="text-center text-xs font-bold">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Revenue Section */}
                    <TableRow className="bg-muted/50 hover:bg-muted/60">
                      <TableCell className="sticky left-0 z-10 bg-muted/50 hover:bg-muted/60">
                        <Collapsible open={expandedGroups["Revenue"]} onOpenChange={() => toggleGroup("Revenue")}>
                          <CollapsibleTrigger className="flex items-center gap-2 font-semibold text-foreground text-sm">
                            {expandedGroups["Revenue"] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            Revenue
                          </CollapsibleTrigger>
                        </Collapsible>
                      </TableCell>
                      {fyMonths.map((month, idx) => <TableCell key={idx} className="text-center py-1 text-xs font-medium">
                          ₹{getRevenueTotal(month).toLocaleString('en-IN', {
                    maximumFractionDigits: 0
                  })}
                        </TableCell>)}
                      <TableCell className="text-center py-1 text-xs font-bold">
                        ₹{totalYearRevenue.toLocaleString('en-IN', {
                    maximumFractionDigits: 0
                  })}
                      </TableCell>
                    </TableRow>

                    {expandedGroups["Revenue"] && revenueHeads.map(head => <TableRow key={head} className="hover:bg-muted/30">
                        <TableCell className="sticky left-0 z-10 bg-background pl-8 text-xs text-muted-foreground">
                          {head}
                        </TableCell>
                        {fyMonths.map((month, idx) => renderAmountCell(head, month, idx))}
                        <TableCell className="text-center py-1 text-xs">
                          ₹{Math.abs(fyMonths.reduce((sum, m) => sum + getAmountForMonth(head, m), 0)).toLocaleString('en-IN', {
                    maximumFractionDigits: 0
                  })}
                        </TableCell>
                      </TableRow>)}

                    {/* Direct Expenses Section */}
                    {(() => {
                const groupName = "Direct Expenses";
                const heads = plGroupedExpenses[groupName];
                if (!heads || heads.length === 0) return null;
                return <React.Fragment key={groupName}>
                          <TableRow className="bg-muted/50 hover:bg-muted/60">
                            <TableCell className="sticky left-0 z-10 bg-muted/50 hover:bg-muted/60">
                              <Collapsible open={expandedGroups[groupName]} onOpenChange={() => toggleGroup(groupName)}>
                                <CollapsibleTrigger className="flex items-center gap-2 font-semibold text-foreground text-sm">
                                  {expandedGroups[groupName] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                  {groupName}
                                </CollapsibleTrigger>
                              </Collapsible>
                            </TableCell>
                            {fyMonths.map((month, idx) => <TableCell key={idx} className="text-center py-1 text-xs font-medium">
                                ₹{Math.abs(getGroupTotal(groupName, month)).toLocaleString('en-IN', {
                        maximumFractionDigits: 0
                      })}
                              </TableCell>)}
                            <TableCell className="text-center py-1 text-xs font-bold">
                              ₹{Math.abs(fyMonths.reduce((sum, m) => sum + getGroupTotal(groupName, m), 0)).toLocaleString('en-IN', {
                        maximumFractionDigits: 0
                      })}
                            </TableCell>
                          </TableRow>

                          {expandedGroups[groupName] && heads.map(head => <TableRow key={head} className="hover:bg-muted/30">
                              <TableCell className="sticky left-0 z-10 bg-background pl-8 text-xs text-muted-foreground">
                                {head}
                              </TableCell>
                              {fyMonths.map((month, idx) => renderAmountCell(head, month, idx))}
                              <TableCell className="text-center py-1 text-xs">
                                ₹{Math.abs(fyMonths.reduce((sum, m) => sum + getAmountForMonth(head, m), 0)).toLocaleString('en-IN', {
                        maximumFractionDigits: 0
                      })}
                              </TableCell>
                            </TableRow>)}
                        </React.Fragment>;
              })()}

                    {/* Gross Profit Row - Right after Direct Expenses */}
                    {plGroupedExpenses["Direct Expenses"] && <TableRow className="bg-primary/10 font-bold">
                        <TableCell className="sticky left-0 z-10 bg-primary/10 text-sm">Gross Profit</TableCell>
                        {fyMonths.map((month, idx) => {
                  const gross = getRevenueTotal(month) + getGroupTotal("Direct Expenses", month);
                  return <TableCell key={idx} className={`text-center py-1 text-xs ${gross >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ₹{Math.abs(gross).toLocaleString('en-IN', {
                      maximumFractionDigits: 0
                    })}
                            </TableCell>;
                })}
                        <TableCell className={`text-center py-1 text-xs font-bold ${grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ₹{Math.abs(grossProfit).toLocaleString('en-IN', {
                    maximumFractionDigits: 0
                  })}
                        </TableCell>
                      </TableRow>}

                    {/* Operating Cost Section */}
                    {(() => {
                const groupName = "Operating Cost";
                const heads = plGroupedExpenses[groupName];
                if (!heads || heads.length === 0) return null;
                return <React.Fragment key={groupName}>
                          <TableRow className="bg-muted/50 hover:bg-muted/60">
                            <TableCell className="sticky left-0 z-10 bg-muted/50 hover:bg-muted/60">
                              <Collapsible open={expandedGroups[groupName]} onOpenChange={() => toggleGroup(groupName)}>
                                <CollapsibleTrigger className="flex items-center gap-2 font-semibold text-foreground text-sm">
                                  {expandedGroups[groupName] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                  {groupName}
                                </CollapsibleTrigger>
                              </Collapsible>
                            </TableCell>
                            {fyMonths.map((month, idx) => <TableCell key={idx} className="text-center py-1 text-xs font-medium">
                                ₹{Math.abs(getGroupTotal(groupName, month)).toLocaleString('en-IN', {
                        maximumFractionDigits: 0
                      })}
                              </TableCell>)}
                            <TableCell className="text-center py-1 text-xs font-bold">
                              ₹{Math.abs(fyMonths.reduce((sum, m) => sum + getGroupTotal(groupName, m), 0)).toLocaleString('en-IN', {
                        maximumFractionDigits: 0
                      })}
                            </TableCell>
                          </TableRow>

                          {expandedGroups[groupName] && heads.map(head => <TableRow key={head} className="hover:bg-muted/30">
                              <TableCell className="sticky left-0 z-10 bg-background pl-8 text-xs text-muted-foreground">
                                {head}
                              </TableCell>
                              {fyMonths.map((month, idx) => renderAmountCell(head, month, idx))}
                              <TableCell className="text-center py-1 text-xs">
                                ₹{Math.abs(fyMonths.reduce((sum, m) => sum + getAmountForMonth(head, m), 0)).toLocaleString('en-IN', {
                        maximumFractionDigits: 0
                      })}
                              </TableCell>
                            </TableRow>)}
                        </React.Fragment>;
              })()}

                    {/* Net Profit Row - After Operating Cost */}
                    {plGroupedExpenses["Operating Cost"] && <TableRow className="bg-primary/10 font-bold">
                        <TableCell className="sticky left-0 z-10 bg-primary/10 text-sm">Net Profit</TableCell>
                        {fyMonths.map((month, idx) => {
                  const net = getRevenueTotal(month) + getGroupTotal("Direct Expenses", month) + getGroupTotal("Operating Cost", month);
                  return <TableCell key={idx} className={`text-center py-1 text-xs ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ₹{Math.abs(net).toLocaleString('en-IN', {
                      maximumFractionDigits: 0
                    })}
                            </TableCell>;
                })}
                        <TableCell className={`text-center py-1 text-xs font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ₹{Math.abs(netProfit).toLocaleString('en-IN', {
                    maximumFractionDigits: 0
                  })}
                        </TableCell>
                      </TableRow>}

                    {/* Other Categories - Non P&L Items */}
                    {Object.keys(otherGroupedExpenses).length > 0 && <>
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={14} className="text-center py-2 text-xs text-muted-foreground italic">
                            ─── Other Categories (Not included in P&L) ───
                          </TableCell>
                        </TableRow>

                        {Object.entries(otherGroupedExpenses).map(([groupName, heads]) => <React.Fragment key={groupName}>
                            <TableRow className="bg-muted/30 hover:bg-muted/40">
                              <TableCell className="sticky left-0 z-10 bg-muted/30 hover:bg-muted/40">
                                <Collapsible open={expandedGroups[groupName] ?? false} onOpenChange={() => toggleGroup(groupName)}>
                                  <CollapsibleTrigger className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
                                    {expandedGroups[groupName] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                    {groupName}
                                  </CollapsibleTrigger>
                                </Collapsible>
                              </TableCell>
                              {fyMonths.map((month, idx) => <TableCell key={idx} className="text-center py-1 text-xs text-muted-foreground">
                                  ₹{Math.abs(getGroupTotal(groupName, month)).toLocaleString('en-IN', {
                        maximumFractionDigits: 0
                      })}
                                </TableCell>)}
                              <TableCell className="text-center py-1 text-xs text-muted-foreground">
                                ₹{Math.abs(fyMonths.reduce((sum, m) => sum + getGroupTotal(groupName, m), 0)).toLocaleString('en-IN', {
                        maximumFractionDigits: 0
                      })}
                              </TableCell>
                            </TableRow>

                            {expandedGroups[groupName] && heads.map(head => <TableRow key={head} className="hover:bg-muted/20">
                                <TableCell className="sticky left-0 z-10 bg-background pl-8 text-xs text-muted-foreground/70">
                                  {head}
                                </TableCell>
                                {fyMonths.map((month, idx) => <TableCell key={idx} className="text-center py-1 text-xs text-muted-foreground/70">
                                    {getAmountForMonth(head, month) !== 0 ? `₹${Number(Math.abs(getAmountForMonth(head, month))).toLocaleString('en-IN', {
                        maximumFractionDigits: 0
                      })}` : "-"}
                                  </TableCell>)}
                                <TableCell className="text-center py-1 text-xs text-muted-foreground/70">
                                  ₹{Math.abs(fyMonths.reduce((sum, m) => sum + getAmountForMonth(head, m), 0)).toLocaleString('en-IN', {
                        maximumFractionDigits: 0
                      })}
                                </TableCell>
                              </TableRow>)}
                          </React.Fragment>)}
                      </>}
                  </TableBody>
                </Table>
              </div>
        </div>
      </main>
    </div>;
}