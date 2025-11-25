import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NavHeader } from "@/components/NavHeader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { TaskCard } from "@/components/actionplan/TaskCard";
import { TaskFormDialog } from "@/components/actionplan/TaskFormDialog";
import { TaskDetailDialog } from "@/components/actionplan/TaskDetailDialog";

interface Task {
  id: string;
  name: string;
  description: string | null;
  status: 'not_started' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  created_by: string;
  created_at: string;
}

interface StepCount {
  task_id: string;
  total_steps: number;
  completed_steps: number;
}

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stepCounts, setStepCounts] = useState<Record<string, StepCount>>({});
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
    subscribeToChanges();
  }, []);

  const subscribeToChanges = () => {
    const tasksChannel = supabase
      .channel('action-tasks-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'action_tasks'
      }, fetchTasks)
      .subscribe();

    const stepsChannel = supabase
      .channel('task-steps-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'task_steps'
      }, fetchTasks)
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(stepsChannel);
    };
  };

  const fetchTasks = async () => {
    const { data: tasksData } = await supabase
      .from('action_tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (tasksData) {
      setTasks(tasksData);
      
      // Fetch step counts for each task
      const counts: Record<string, StepCount> = {};
      for (const task of tasksData) {
        const { data: steps } = await supabase
          .from('task_steps')
          .select('id, is_completed')
          .eq('task_id', task.id);

        if (steps) {
          counts[task.id] = {
            task_id: task.id,
            total_steps: steps.length,
            completed_steps: steps.filter(s => s.is_completed).length
          };
        }
      }
      setStepCounts(counts);
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filterStatus !== 'all' && task.status !== filterStatus) return false;
    if (filterPriority !== 'all' && task.priority !== filterPriority) return false;
    return true;
  });

  const getProgress = (taskId: string): number => {
    const count = stepCounts[taskId];
    if (!count || count.total_steps === 0) return 0;
    return Math.round((count.completed_steps / count.total_steps) * 100);
  };

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      
      <main className="max-w-screen-2xl mx-auto px-3 py-2">
        <div className="mb-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-foreground text-xl font-medium">Action Plan</h1>
            <Button onClick={() => setTaskFormOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Task
            </Button>
          </div>

          <div className="flex gap-3">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((task) => {
            const count = stepCounts[task.id] || { total_steps: 0, completed_steps: 0 };
            return (
              <TaskCard
                key={task.id}
                task={task}
                progress={getProgress(task.id)}
                totalSteps={count.total_steps}
                completedSteps={count.completed_steps}
                onClick={() => {
                  setSelectedTaskId(task.id);
                  setTaskDetailOpen(true);
                }}
              />
            );
          })}
        </div>

        {filteredTasks.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {filterStatus !== 'all' || filterPriority !== 'all'
                ? 'No tasks match the current filters'
                : 'No tasks yet. Create your first task to get started!'}
            </p>
            {filterStatus === 'all' && filterPriority === 'all' && (
              <Button onClick={() => setTaskFormOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Task
              </Button>
            )}
          </div>
        )}
      </main>

      <TaskFormDialog
        open={taskFormOpen}
        onOpenChange={setTaskFormOpen}
        onSuccess={fetchTasks}
      />

      <TaskDetailDialog
        open={taskDetailOpen}
        onOpenChange={setTaskDetailOpen}
        taskId={selectedTaskId}
        onSuccess={fetchTasks}
      />
    </div>
  );
}
