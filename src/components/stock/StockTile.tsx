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
  return (
    <Card 
      className="overflow-hidden hover:shadow-md transition-all cursor-pointer hover:scale-[1.02]" 
      onClick={onClick}
    >
      <CardContent className="p-4">
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
                {toy.current_stock}
              </span>
              <span className="text-xs text-muted-foreground">units</span>
            </div>
            {toy.last_transaction_at && (
              <p className="text-[10px] text-muted-foreground mt-1 truncate">
                Updated {format(new Date(toy.last_transaction_at), "MMM d, h:mm a")}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
