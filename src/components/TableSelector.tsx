import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface TableSelectorProps {
  onSelectTable: (table: number) => void;
}

export const TableSelector = ({ onSelectTable }: TableSelectorProps) => {
  const tables = Array.from({ length: 19 }, (_, i) => i + 2);

  return (
    <div className="max-w-6xl mx-auto">
      <Card className="p-8 backdrop-blur-sm bg-card/50 border-2 shadow-xl">
        <h2 className="text-3xl font-bold text-center mb-8 text-foreground">
          Choose a Times Table
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {tables.map((table) => (
            <Button
              key={table}
              onClick={() => onSelectTable(table)}
              className="h-20 text-2xl font-bold bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              {table}x
            </Button>
          ))}
        </div>
      </Card>
    </div>
  );
};
