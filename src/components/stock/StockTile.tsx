import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";

interface StockTileProps {
  toy: {
    id: string;
    name: string;
    current_stock: number;
    image_url: string | null;
    last_transaction_at: string | null;
  };
  onClick?: () => void;
}

export function StockTile({ toy, onClick }: StockTileProps) {
  // Determine stock level based on current stock
  const stockLevel = toy.current_stock <= 5 ? 'critical' : 
                     toy.current_stock <= 10 ? 'low' : 'good';
  
  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02] relative group animate-fade-in" 
      onClick={onClick}
    >
      {/* Left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 transition-all duration-300 ${
        stockLevel === 'critical' ? 'bg-priority-high shadow-[0_0_8px_hsl(var(--priority-high)/0.4)]' :
        stockLevel === 'low' ? 'bg-priority-medium shadow-[0_0_8px_hsl(var(--priority-medium)/0.4)]' :
        'bg-priority-low shadow-[0_0_8px_hsl(var(--priority-low)/0.4)]'
      }`} />
      
      <CardContent className="p-3 pl-4">
        <div className="flex items-center gap-3">
          {toy.image_url && (
            <div className="w-12 h-12 flex-shrink-0 rounded-md overflow-hidden bg-muted">
              <img 
                src={toy.image_url} 
                alt={toy.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-foreground mb-1 truncate">
              {toy.name}
            </h3>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold text-primary leading-none">
                {Math.max(0, toy.current_stock)}
              </span>
              <span className="text-xs text-muted-foreground">units</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
