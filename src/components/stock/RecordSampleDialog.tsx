import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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

interface RecordSampleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toys: Array<{ id: string; name: string; current_stock: number }>;
  selectedToyId?: string;
  onSuccess: () => void;
}

export function RecordSampleDialog({ 
  open, 
  onOpenChange, 
  toys, 
  selectedToyId,
  onSuccess 
}: RecordSampleDialogProps) {
  const [toyId, setToyId] = useState(selectedToyId || "");
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

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

    const selectedToy = toys.find(t => t.id === toyId);
    if (!selectedToy) return;

    const qty = parseInt(quantity);
    
    if (qty > selectedToy.current_stock) {
      toast({
        title: "Insufficient stock",
        description: `Only ${selectedToy.current_stock} units available`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const stockAfter = selectedToy.current_stock - qty;

      const { error } = await supabase
        .from("stock_transactions")
        .insert({
          toy_id: toyId,
          transaction_type: "sample",
          quantity: -qty,
          stock_after: stockAfter,
          notes: notes || null,
          created_at: date.toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Sample recorded successfully",
        description: `Marked ${qty} units of ${selectedToy.name} as sample`,
      });

      onSuccess();
      onOpenChange(false);
      setQuantity("");
      setDate(new Date());
      setNotes("");
    } catch (error) {
      console.error("Error recording sample:", error);
      toast({
        title: "Error",
        description: "Failed to record sample. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark as Sample</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="toy-sample">Toy</Label>
              <Select value={toyId} onValueChange={setToyId}>
                <SelectTrigger id="toy-sample">
                  <SelectValue placeholder="Select a toy" />
                </SelectTrigger>
                <SelectContent>
                  {toys.map((toy) => (
                    <SelectItem key={toy.id} value={toy.id}>
                      {toy.name} (Stock: {toy.current_stock})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="quantity-sample">Quantity</Label>
              <Input
                id="quantity-sample"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Enter quantity"
              />
            </div>

            <div className="space-y-2">
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
                <PopoverContent className="w-auto p-0" align="start">
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
            
            <div className="space-y-2">
              <Label htmlFor="notes-sample">Recipient/Purpose</Label>
              <Textarea
                id="notes-sample"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Who received the sample and for what purpose..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Recording..." : "Record Sample"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
