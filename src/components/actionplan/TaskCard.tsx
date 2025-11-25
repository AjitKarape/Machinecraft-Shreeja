import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar, Flag } from "lucide-react";
import { format } from "date-fns";

interface TaskCardProps {
  task: {
    id: string;
    name: string;
    description: string | null;
    status: 'not_started' | 'in_progress' | 'completed';
    priority: 'low' | 'medium' | 'high';
    due_date: string | null;
  };
  progress: number;
  totalSteps: number;
  completedSteps: number;
  onClick: () => void;
}

const statusConfig = {
  not_started: { label: 'Not Started', variant: 'secondary' as const },
  in_progress: { label: 'In Progress', variant: 'default' as const },
  completed: { label: 'Completed', variant: 'default' as const }
};

const priorityConfig = {
  low: { label: 'Low', className: 'bg-muted text-muted-foreground' },
  medium: { label: 'Medium', className: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
  high: { label: 'High', className: 'bg-destructive/10 text-destructive' }
};

export function TaskCard({ task, progress, totalSteps, completedSteps, onClick }: TaskCardProps) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

  return (
    <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-foreground line-clamp-2 flex-1">{task.name}</h3>
          <div className="flex gap-1.5 flex-shrink-0">
            <Badge variant={statusConfig[task.status].variant} className="text-xs">
              {statusConfig[task.status].label}
            </Badge>
            <Badge className={priorityConfig[task.priority].className}>
              <Flag className="w-3 h-3 mr-1" />
              {priorityConfig[task.priority].label}
            </Badge>
          </div>
        </div>

        {task.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
        )}

        {task.due_date && (
          <div className={`flex items-center gap-1.5 text-xs ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
            <Calendar className="w-3.5 h-3.5" />
            <span>{format(new Date(task.due_date), 'MMM dd, yyyy')}</span>
            {isOverdue && <span className="font-medium">(Overdue)</span>}
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{completedSteps} / {totalSteps} steps</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>
    </Card>
  );
}
