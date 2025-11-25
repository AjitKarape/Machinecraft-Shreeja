import { Badge } from "@/components/ui/badge";
import { StockLevel, getStockLevelLabel } from "@/lib/stockUtils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StockLevelBadgeProps {
  level: StockLevel;
  showIcon?: boolean;
}

export function StockLevelBadge({ level, showIcon = true }: StockLevelBadgeProps) {
  const getVariant = () => {
    switch (level) {
      case "low":
        return "destructive";
      case "high":
        return "default";
      case "medium":
        return "secondary";
    }
  };

  const getIcon = () => {
    switch (level) {
      case "low":
        return <TrendingDown className="w-3 h-3" />;
      case "high":
        return <TrendingUp className="w-3 h-3" />;
      case "medium":
        return <Minus className="w-3 h-3" />;
    }
  };

  return (
    <Badge variant={getVariant()} className="gap-1 font-medium">
      {showIcon && getIcon()}
      {getStockLevelLabel(level)}
    </Badge>
  );
}
