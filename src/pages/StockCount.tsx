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
import { Card, CardContent } from "@/components/ui/card";

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
  const { toys, isLoading, refetchToys } = useData();
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
    refetchToys(); // Refresh toy stock values
  };

  const handleTransactionEdit = (transaction: Transaction) => {
    // Open dialog with transaction data
    setSelectedToyId(transaction.toy_id);
    setTransactionType(transaction.transaction_type as TransactionType);
    setDialogOpen(true);
  };

  const renderSkeletonTiles = () => (
    <>
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 flex-shrink-0 rounded-md bg-muted animate-pulse" />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse w-24" />
                <div className="h-8 bg-muted rounded animate-pulse w-16" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );

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
        {isLoading ? (
          renderSkeletonTiles()
        ) : toys.length > 0 ? (
          toys.map((toy) => (
            <StockTile
              key={toy.id}
              toy={toy}
              onClick={() => handleOpenDialog(toy.id)}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <p>No toys found. Add some toys to start managing stock.</p>
          </div>
        )}
      </div>

      <Separator className="my-4" />

      {/* Transaction List */}
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-foreground">Recent Transactions</h2>
        
        <TransactionList
          transactions={transactions}
          toys={toys}
          onTransactionDeleted={() => {
            fetchTransactions();
            refetchToys(); // Refresh toy stock after deletion
          }}
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
