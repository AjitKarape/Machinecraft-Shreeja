import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check, X, Star, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QuizGameProps {
  tableNumber: number;
}

export const QuizGame = ({ tableNumber }: QuizGameProps) => {
  const [currentMultiplier, setCurrentMultiplier] = useState(1);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [questionsAsked, setQuestionsAsked] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const { toast } = useToast();

  const correctAnswer = tableNumber * currentMultiplier;
  
  const generateOptions = () => {
    const options = [correctAnswer];
    while (options.length < 4) {
      const randomOffset = Math.floor(Math.random() * 20) - 10;
      const option = correctAnswer + randomOffset;
      if (option > 0 && !options.includes(option)) {
        options.push(option);
      }
    }
    return options.sort(() => Math.random() - 0.5);
  };

  const [options, setOptions] = useState(generateOptions());

  const handleAnswerSelect = (answer: number) => {
    if (selectedAnswer !== null) return;

    setSelectedAnswer(answer);
    const correct = answer === correctAnswer;
    setIsCorrect(correct);
    
    if (correct) {
      setScore(score + 1);
      setShowConfetti(true);
      toast({
        title: "🎉 Correct!",
        description: `${tableNumber} × ${currentMultiplier} = ${correctAnswer}`,
        className: "bg-success text-success-foreground",
      });
      setTimeout(() => setShowConfetti(false), 1000);
    } else {
      toast({
        title: "Try Again!",
        description: `The correct answer is ${correctAnswer}`,
        variant: "destructive",
      });
    }

    setQuestionsAsked(questionsAsked + 1);

    setTimeout(() => {
      const nextMultiplier = Math.floor(Math.random() * 10) + 1;
      setCurrentMultiplier(nextMultiplier);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setOptions(generateOptions());
    }, 1500);
  };

  const progress = questionsAsked > 0 ? (score / questionsAsked) * 100 : 0;

  return (
    <div className="max-w-2xl mx-auto">
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {Array.from({ length: 20 }).map((_, i) => (
            <Sparkles
              key={i}
              className="absolute text-accent animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-10%`,
                animationDelay: `${Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>
      )}

      <Card className="p-8 backdrop-blur-sm bg-card/50 border-2 shadow-xl">
        <div className="mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="w-6 h-6 text-accent" />
              <span className="text-2xl font-bold text-foreground">
                Score: {score}/{questionsAsked}
              </span>
            </div>
            <div className="text-lg font-semibold text-muted-foreground">
              Table: {tableNumber}x
            </div>
          </div>
          <Progress value={progress} className="h-3" />
        </div>

        <div className="text-center mb-12">
          <div className="inline-block p-8 rounded-3xl bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-primary/20">
            <p className="text-6xl font-bold text-foreground mb-4">
              {tableNumber} × {currentMultiplier} = ?
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {options.map((option) => {
            const isSelected = selectedAnswer === option;
            const showResult = isSelected && isCorrect !== null;
            
            return (
              <Button
                key={option}
                onClick={() => handleAnswerSelect(option)}
                disabled={selectedAnswer !== null}
                className={`h-24 text-3xl font-bold transition-all duration-300 ${
                  showResult
                    ? isCorrect
                      ? "bg-success hover:bg-success text-success-foreground animate-bounce-in"
                      : "bg-destructive hover:bg-destructive text-destructive-foreground animate-shake"
                    : "bg-gradient-to-br from-secondary to-secondary/80 hover:from-secondary/90 hover:to-secondary/70 text-secondary-foreground hover:scale-105"
                }`}
              >
                <span className="flex items-center gap-3">
                  {option}
                  {showResult && (
                    isCorrect ? (
                      <Check className="w-8 h-8" />
                    ) : (
                      <X className="w-8 h-8" />
                    )
                  )}
                </span>
              </Button>
            );
          })}
        </div>

        {questionsAsked >= 10 && (
          <div className="mt-8 p-6 rounded-xl bg-gradient-to-r from-accent/20 to-secondary/20 border-2 border-accent/50 text-center">
            <p className="text-2xl font-bold text-foreground mb-2">
              Great job! 🎉
            </p>
            <p className="text-lg text-muted-foreground">
              You've answered {questionsAsked} questions with {Math.round(progress)}% accuracy!
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};
