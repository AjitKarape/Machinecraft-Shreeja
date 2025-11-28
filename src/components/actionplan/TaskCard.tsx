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
    <Card className="group relative p-3 cursor-pointer hover:shadow-lg transition-all duration-300 overflow-hidden" onClick={onClick}>
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-foreground line-clamp-1 flex-1 text-sm">{task.name}</h3>
          <div className="flex gap-1 flex-shrink-0">
            <Badge variant={statusConfig[task.status].variant} className="text-[10px] px-1.5 py-0">
              {statusConfig[task.status].label}
            </Badge>
            <Badge className={`${priorityConfig[task.priority].className} text-[10px] px-1.5 py-0`}>
              <Flag className="w-2.5 h-2.5 mr-0.5" />
              {priorityConfig[task.priority].label}
            </Badge>
          </div>
        </div>

        {task.description && (
          <div className="max-h-0 opacity-0 group-hover:max-h-20 group-hover:opacity-100 transition-all duration-300 overflow-hidden">
            <p className="text-xs text-muted-foreground line-clamp-3 pt-1">{task.description}</p>
          </div>
        )}

        {task.due_date && (
          <div className={`flex items-center gap-1 text-[10px] ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
            <Calendar className="w-3 h-3" />
            <span>{format(new Date(task.due_date), 'MMM dd, yyyy')}</span>
            {isOverdue && <span className="font-medium">(Overdue)</span>}
          </div>
        )}

        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Progress</span>
            <span className="font-medium">{completedSteps} / {totalSteps}</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      </div>
    </Card>
  );
}
