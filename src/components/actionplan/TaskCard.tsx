import { Card } from "@/components/ui/card";
import { CircularProgress } from "@/components/ui/circular-progress";
import { Calendar, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { format, formatDistanceToNow, isPast, differenceInDays } from "date-fns";

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
  not_started: { 
    label: 'Not Started', 
    icon: Clock, 
    color: 'text-muted-foreground' 
  },
  in_progress: { 
    label: 'In Progress', 
    icon: AlertCircle, 
    color: 'text-primary' 
  },
  completed: { 
    label: 'Completed', 
    icon: CheckCircle, 
    color: 'text-[hsl(var(--priority-low))]' 
  }
};

const priorityConfig = {
  high: { 
    label: 'High', 
    borderColor: 'border-l-[hsl(var(--priority-high))]',
    glowColor: 'shadow-[0_0_12px_hsl(var(--priority-high)/0.4)]'
  },
  medium: { 
    label: 'Medium', 
    borderColor: 'border-l-[hsl(var(--priority-medium))]',
    glowColor: 'shadow-[0_0_12px_hsl(var(--priority-medium)/0.3)]'
  },
  low: { 
    label: 'Low', 
    borderColor: 'border-l-[hsl(var(--priority-low))]',
    glowColor: 'shadow-[0_0_8px_hsl(var(--priority-low)/0.2)]'
  }
};

export function TaskCard({ task, progress, totalSteps, completedSteps, onClick }: TaskCardProps) {
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'completed';
  const StatusIcon = statusConfig[task.status].icon;
  
  const getRelativeDate = () => {
    if (!task.due_date) return null;
    const dueDate = new Date(task.due_date);
    const daysUntil = differenceInDays(dueDate, new Date());
    
    if (isOverdue) {
      return `${Math.abs(daysUntil)} days overdue`;
    } else if (daysUntil === 0) {
      return 'Due today';
    } else if (daysUntil === 1) {
      return 'Due tomorrow';
    } else if (daysUntil <= 7) {
      return `${daysUntil} days left`;
    } else {
      return format(dueDate, 'MMM dd, yyyy');
    }
  };

  return (
    <Card 
      className={`group relative cursor-pointer overflow-hidden border-l-[3px] transition-all duration-300 
        glass neu-card animate-fade-in
        ${priorityConfig[task.priority].borderColor}
        hover:${priorityConfig[task.priority].glowColor}
        hover:scale-[1.02] hover:-translate-y-0.5`}
      onClick={onClick}
    >
      <div className="p-3 flex gap-3 items-start">
        {/* Left Content Area */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Task Title */}
          <h3 className="font-semibold text-foreground line-clamp-2 text-sm leading-tight">
            {task.name}
          </h3>

          {/* Status */}
          <div className="flex items-center gap-1.5">
            <StatusIcon className={`w-3.5 h-3.5 ${statusConfig[task.status].color}`} />
            <span className={`text-xs ${statusConfig[task.status].color}`}>
              {statusConfig[task.status].label}
            </span>
          </div>

          {/* Due Date */}
          {task.due_date && (
            <div className={`flex items-center gap-1.5 text-xs ${isOverdue ? 'text-[hsl(var(--priority-high))] font-medium' : 'text-muted-foreground'}`}>
              <Calendar className="w-3 h-3" />
              <span>{getRelativeDate()}</span>
            </div>
          )}

          {/* Description - Hidden, reveals on hover */}
          {task.description && (
            <div className="max-h-0 opacity-0 group-hover:max-h-24 group-hover:opacity-100 transition-all duration-300 overflow-hidden">
              <p className="text-xs text-muted-foreground line-clamp-3 pt-1 leading-relaxed">
                {task.description}
              </p>
            </div>
          )}
        </div>

        {/* Right Progress Area */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <CircularProgress
            value={progress}
            size={56}
            strokeWidth={4}
            priority={task.priority}
          />
          <span className="text-[10px] text-muted-foreground font-medium">
            {completedSteps}/{totalSteps}
          </span>
        </div>
      </div>
    </Card>
  );
}
