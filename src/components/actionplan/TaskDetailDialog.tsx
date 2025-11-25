import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Calendar as CalendarIcon, Plus, ChevronDown, ChevronRight, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { StepEditorDialog } from "./StepEditorDialog";
import { FieldRenderer } from "./FieldRenderer";

interface TaskDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string | null;
  onSuccess: () => void;
}

export function TaskDetailDialog({ open, onOpenChange, taskId, onSuccess }: TaskDetailDialogProps) {
  const [task, setTask] = useState<any>(null);
  const [steps, setSteps] = useState<any[]>([]);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [editingTask, setEditingTask] = useState(false);
  const [stepEditorOpen, setStepEditorOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingStepId, setDeletingStepId] = useState<string | null>(null);

  useEffect(() => {
    if (taskId && open) {
      loadTaskData();
    }
  }, [taskId, open]);

  const loadTaskData = async () => {
    if (!taskId) return;

    const { data: taskData } = await supabase
      .from('action_tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (taskData) setTask(taskData);

    const { data: stepsData } = await supabase
      .from('task_steps')
      .select(`
        *,
        step_fields (*)
      `)
      .eq('task_id', taskId)
      .order('step_number');

    if (stepsData) {
      const stepsWithSortedFields = stepsData.map(step => ({
        ...step,
        step_fields: step.step_fields?.sort((a: any, b: any) => a.field_order - b.field_order) || []
      }));
      setSteps(stepsWithSortedFields);
    }
  };

  const toggleStep = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const handleTaskUpdate = async (updates: any) => {
    if (!taskId) return;

    try {
      const { error } = await supabase
        .from('action_tasks')
        .update(updates)
        .eq('id', taskId);

      if (error) throw error;
      loadTaskData();
      toast.success("Task updated");
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error("Failed to update task");
    }
  };

  const handleStepComplete = async (stepId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('task_steps')
        .update({ is_completed: completed })
        .eq('id', stepId);

      if (error) throw error;
      loadTaskData();
    } catch (error) {
      console.error('Error updating step:', error);
      toast.error("Failed to update step");
    }
  };

  const handleFieldUpdate = async (fieldId: string, updates: any) => {
    try {
      const { error } = await supabase
        .from('step_fields')
        .update(updates)
        .eq('id', fieldId);

      if (error) throw error;
      loadTaskData();
    } catch (error) {
      console.error('Error updating field:', error);
      toast.error("Failed to update field");
    }
  };

  const handleDeleteTask = async () => {
    if (!taskId) return;

    try {
      const { error } = await supabase
        .from('action_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      toast.success("Task deleted");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error("Failed to delete task");
    }
  };

  const handleDeleteStep = async () => {
    if (!deletingStepId) return;

    try {
      const { error } = await supabase
        .from('task_steps')
        .delete()
        .eq('id', deletingStepId);

      if (error) throw error;
      toast.success("Step deleted");
      loadTaskData();
      setDeleteDialogOpen(false);
      setDeletingStepId(null);
    } catch (error) {
      console.error('Error deleting step:', error);
      toast.error("Failed to delete step");
    }
  };

  if (!task) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>Task Details</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto px-6 pb-6">
            {/* Task Basic Details */}
            <div className="space-y-4 mb-6">
              <div className="space-y-2">
                <Label>Task Name</Label>
                <Input
                  value={task.name}
                  onChange={(e) => setTask({ ...task, name: e.target.value })}
                  onBlur={() => handleTaskUpdate({ name: task.name })}
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={task.description || ''}
                  onChange={(e) => setTask({ ...task, description: e.target.value })}
                  onBlur={() => handleTaskUpdate({ description: task.description })}
                  className="min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={task.status}
                    onValueChange={(v) => handleTaskUpdate({ status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_started">Not Started</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={task.priority}
                    onValueChange={(v) => handleTaskUpdate({ priority: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !task.due_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {task.due_date ? format(new Date(task.due_date), "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={task.due_date ? new Date(task.due_date) : undefined}
                        onSelect={(date) => handleTaskUpdate({ due_date: date ? format(date, 'yyyy-MM-dd') : null })}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            <Separator className="mb-6" />

            {/* Steps Section - Full Width */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base">Steps</Label>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingStep(null);
                    setStepEditorOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Step
                </Button>
              </div>

              <div className="space-y-2">
                {steps.map((step, index) => (
                  <div key={step.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={step.is_completed}
                        onCheckedChange={(checked) => handleStepComplete(step.id, !!checked)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 justify-start font-medium"
                        onClick={() => toggleStep(step.id)}
                      >
                        {expandedSteps.has(step.id) ? (
                          <ChevronDown className="w-4 h-4 mr-2" />
                        ) : (
                          <ChevronRight className="w-4 h-4 mr-2" />
                        )}
                        <span className={step.is_completed ? 'line-through text-muted-foreground' : ''}>
                          Step {index + 1}: {step.name}
                        </span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingStep(step);
                          setStepEditorOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDeletingStepId(step.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>

                    {expandedSteps.has(step.id) && step.step_fields.length > 0 && (
                      <div className="pl-6 space-y-3 mt-3">
                        {step.step_fields.map((field: any) => (
                          <FieldRenderer
                            key={field.id}
                            field={field}
                            onUpdate={handleFieldUpdate}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {steps.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No steps added yet. Click "Add Step" to get started.
                  </p>
                )}
              </div>
            </div>

            <Separator className="my-6" />

            {/* Delete Task Button */}
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteTask}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Task
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <StepEditorDialog
        open={stepEditorOpen}
        onOpenChange={setStepEditorOpen}
        taskId={taskId!}
        step={editingStep}
        onSuccess={loadTaskData}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Step</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this step? This will also delete all fields within this step. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStep} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
