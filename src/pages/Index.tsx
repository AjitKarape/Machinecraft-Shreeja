import { useState } from "react";
import { TableSelector } from "@/components/TableSelector";
import { QuizGame } from "@/components/QuizGame";
import { Button } from "@/components/ui/button";
import { GraduationCap, Trophy } from "lucide-react";

const Index = () => {
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [gameMode, setGameMode] = useState<"select" | "quiz">("select");

  const handleTableSelect = (table: number) => {
    setSelectedTable(table);
    setGameMode("quiz");
  };

  const handleBackToMenu = () => {
    setGameMode("select");
    setSelectedTable(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12 animate-bounce-in">
          <div className="flex items-center justify-center gap-3 mb-4">
            <GraduationCap className="w-12 h-12 text-primary" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Times Tables Game
            </h1>
            <Trophy className="w-12 h-12 text-accent" />
          </div>
          <p className="text-xl text-muted-foreground">
            Master multiplication tables from 2 to 20!
          </p>
        </header>

        {gameMode === "select" ? (
          <TableSelector onSelectTable={handleTableSelect} />
        ) : (
          <div className="space-y-4">
            <Button
              variant="outline"
              onClick={handleBackToMenu}
              className="mb-4"
            >
              ← Back to Menu
            </Button>
            {selectedTable && <QuizGame tableNumber={selectedTable} />}
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
