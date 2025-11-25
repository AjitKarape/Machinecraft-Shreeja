import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useData } from "@/contexts/DataContext";
import { NavHeader } from "@/components/NavHeader";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { StockTile } from "@/components/stock/StockTile";
import { StockTransactionDialog } from "@/components/stock/StockTransactionDialog";
import { TransactionList } from "@/components/stock/TransactionList";
import { Separator } from "@/components/ui/separator";

interface Transaction {
  id: string;
  created_at: string;
  toy_id: string;
  transaction_type: string;
  quantity: number;
  stock_after: number;
  price: number | null;
  customer_name: string | null;
  notes: string | null;
  is_deleted: boolean;
}

type TransactionType = "production" | "sale" | "sample";

export default function StockCount() {
  const { toys, isLoading } = useData();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedToyId, setSelectedToyId] = useState<string | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<TransactionType>("production");

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from("stock_transactions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching transactions:", error);
      return;
    }

    setTransactions(data || []);
  };

  useEffect(() => {
    fetchTransactions();

    const channel = supabase
      .channel("stock_transactions_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "stock_transactions",
        },
        () => {
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleOpenDialog = (toyId?: string) => {
    setSelectedToyId(toyId);
    setTransactionType("production"); // Default to production
    setDialogOpen(true);
  };

  const handleSuccess = () => {
    fetchTransactions();
  };

  const handleTransactionEdit = (transaction: Transaction) => {
    // Open dialog with transaction data
    setSelectedToyId(transaction.toy_id);
    setTransactionType(transaction.transaction_type as TransactionType);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading stock data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      <div className="py-4 px-3">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Stock Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {toys.length} products · {transactions.filter(t => !t.is_deleted).length} transactions
          </p>
        </div>
        <Button size="sm" className="h-8" onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-1.5" />
          New Transaction
        </Button>
      </div>

      {/* Stock Tiles Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 mb-4">
        {toys.map((toy) => (
          <StockTile
            key={toy.id}
            toy={toy}
            onClick={() => handleOpenDialog(toy.id)}
          />
        ))}
      </div>

      {toys.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No toys found. Add some toys to start managing stock.</p>
        </div>
      )}

      <Separator className="my-4" />

      {/* Transaction List */}
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-foreground">Recent Transactions</h2>
        
        <TransactionList
          transactions={transactions}
          toys={toys}
          onTransactionDeleted={fetchTransactions}
          onTransactionEdit={handleTransactionEdit}
        />
      </div>

      {/* Dialogs */}
      <StockTransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        toys={toys}
        selectedToyId={selectedToyId}
        initialType={transactionType}
        onSuccess={handleSuccess}
      />
    </div>
    </div>
  );
}
