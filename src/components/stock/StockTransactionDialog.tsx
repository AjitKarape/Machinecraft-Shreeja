import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type TransactionType = "production" | "sale" | "sample";

interface StockTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toys: Array<{ id: string; name: string; current_stock: number }>;
  selectedToyId?: string;
  initialType?: TransactionType;
  onSuccess: () => void;
}

export function StockTransactionDialog({ 
  open, 
  onOpenChange, 
  toys, 
  selectedToyId,
  initialType = "production",
  onSuccess 
}: StockTransactionDialogProps) {
  const [transactionType, setTransactionType] = useState<TransactionType>(initialType);
  const [toyId, setToyId] = useState(selectedToyId || "");
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [customerName, setCustomerName] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (initialType) {
      setTransactionType(initialType);
    }
  }, [initialType]);

  useEffect(() => {
    if (selectedToyId) {
      setToyId(selectedToyId);
    }
  }, [selectedToyId]);

  const getDialogTitle = () => {
    switch (transactionType) {
      case "production":
        return "Add Finished Stock";
      case "sale":
        return "Record Sale";
      case "sample":
        return "Mark as Sample";
    }
  };

  const requiresCustomer = transactionType === "sale" || transactionType === "sample";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!toyId || !quantity || parseInt(quantity) <= 0) {
      toast({
        title: "Invalid input",
        description: "Please select a toy and enter a valid quantity",
        variant: "destructive",
      });
      return;
    }

    if (requiresCustomer && !customerName.trim()) {
      toast({
        title: "Customer required",
        description: `Please enter customer/recipient name for ${transactionType}`,
        variant: "destructive",
      });
      return;
    }

    const selectedToy = toys.find(t => t.id === toyId);
    if (!selectedToy) return;

    const qty = parseInt(quantity);
    
    // Check stock for sale/sample
    if ((transactionType === "sale" || transactionType === "sample") && qty > selectedToy.current_stock) {
      toast({
        title: "Insufficient stock",
        description: `Only ${selectedToy.current_stock} units available`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const isDeduction = transactionType === "sale" || transactionType === "sample";
      const actualQuantity = isDeduction ? -qty : qty;
      const stockAfter = selectedToy.current_stock + actualQuantity;

      const { error } = await supabase
        .from("stock_transactions")
        .insert({
          toy_id: toyId,
          transaction_type: transactionType,
          quantity: actualQuantity,
          stock_after: stockAfter,
          customer_name: requiresCustomer ? customerName : null,
          price: price ? parseFloat(price) : null,
          notes: notes || null,
          created_at: date.toISOString(),
        });

      if (error) throw error;

      const actionText = {
        production: "added",
        sale: "sold",
        sample: "marked as sample"
      }[transactionType];

      toast({
        title: "Transaction recorded",
        description: `Successfully ${actionText} ${qty} units of ${selectedToy.name}`,
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("Error recording transaction:", error);
      toast({
        title: "Error",
        description: "Failed to record transaction. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setQuantity("");
    setDate(new Date());
    setCustomerName("");
    setPrice("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[calc(85vh-180px)] pr-4">
          <form onSubmit={handleSubmit} className="space-y-3 pb-2">
            <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="transaction-type">Transaction Type</Label>
              <Select value={transactionType} onValueChange={(value) => setTransactionType(value as TransactionType)}>
                <SelectTrigger id="transaction-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="production">Production (Add Stock)</SelectItem>
                  <SelectItem value="sale">Sale</SelectItem>
                  <SelectItem value="sample">Sample</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="toy">Toy</Label>
              <Select value={toyId} onValueChange={setToyId}>
                <SelectTrigger id="toy">
                  <SelectValue placeholder="Select a toy" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {toys.map((toy) => (
                    <SelectItem key={toy.id} value={toy.id}>
                      {toy.name} (Stock: {toy.current_stock})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Enter quantity"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover z-50" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(newDate) => newDate && setDate(newDate)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            </div>

            {requiresCustomer && (
              <div className="space-y-1.5">
                <Label htmlFor="customer">
                  {transactionType === "sale" ? "Customer Name" : "Recipient Name"} *
                </Label>
                <Input
                  id="customer"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={transactionType === "sale" ? "Enter customer name" : "Enter recipient name"}
                  required
                />
              </div>
            )}

            {transactionType === "sale" && (
              <div className="space-y-1.5">
                <Label htmlFor="price">Price per Unit (Optional)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Enter price"
                />
              </div>
            )}
            
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes..."
                rows={2}
              />
            </div>
          </form>
        </ScrollArea>
          
        <DialogFooter className="pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? "Recording..." : "Record Transaction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
