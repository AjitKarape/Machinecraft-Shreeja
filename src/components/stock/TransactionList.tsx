import { useState } from "react";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, ArrowUpCircle, ArrowDownCircle, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

interface TransactionListProps {
  transactions: Transaction[];
  toys: Array<{ id: string; name: string }>;
  onTransactionDeleted: () => void;
  onTransactionEdit: (transaction: Transaction) => void;
}

export function TransactionList({ transactions, toys, onTransactionDeleted, onTransactionEdit }: TransactionListProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const getToyName = (toyId: string) => {
    return toys.find(t => t.id === toyId)?.name || "Unknown";
  };

  const getTransactionTypeVariant = (type: string) => {
    switch (type) {
      case "production":
        return "default";
      case "sale":
        return "secondary";
      case "sample":
        return "outline";
      default:
        return "outline";
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case "production":
        return "Production";
      case "sale":
        return "Sale";
      case "sample":
        return "Sample";
      default:
        return type;
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("stock_transactions")
        .update({ is_deleted: true })
        .eq("id", deleteId);

      if (error) throw error;

      toast({
        title: "Transaction deleted",
        description: "The transaction has been marked as deleted",
      });

      onTransactionDeleted();
      setDeleteId(null);
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast({
        title: "Error",
        description: "Failed to delete transaction",
        variant: "destructive",
      });
    }
  };

  const activeTransactions = transactions.filter(t => !t.is_deleted);

  if (activeTransactions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No transactions recorded yet.</p>
        <p className="text-sm mt-2">Start by adding stock, recording sales, or marking samples.</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Toy</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Stock After</TableHead>
              <TableHead>Customer/Notes</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeTransactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell className="font-medium">
                  {format(new Date(transaction.created_at), "MMM d, yyyy")}
                </TableCell>
                <TableCell>{getToyName(transaction.toy_id)}</TableCell>
                <TableCell>
                  <Badge variant={getTransactionTypeVariant(transaction.transaction_type)}>
                    {getTransactionTypeLabel(transaction.transaction_type)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {transaction.quantity > 0 ? (
                      <ArrowUpCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <ArrowDownCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span className={transaction.quantity > 0 ? "text-green-600" : "text-red-600"}>
                      {transaction.quantity > 0 ? "+" : ""}{transaction.quantity}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {transaction.stock_after}
                </TableCell>
                <TableCell className="max-w-xs truncate">
                  {transaction.customer_name && (
                    <span className="font-medium">{transaction.customer_name}</span>
                  )}
                  {transaction.customer_name && transaction.notes && " - "}
                  {transaction.notes && (
                    <span className="text-muted-foreground">{transaction.notes}</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {transaction.price ? `₹${transaction.price.toFixed(2)}` : "-"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onTransactionEdit(transaction)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(transaction.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
