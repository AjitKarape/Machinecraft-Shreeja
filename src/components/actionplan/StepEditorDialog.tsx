import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Field {
  id?: string;
  field_type: 'text' | 'image' | 'checkbox';
  label: string;
  field_order: number;
}

interface StepEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  step?: {
    id: string;
    name: string;
  };
  onSuccess: () => void;
}

export function StepEditorDialog({ open, onOpenChange, taskId, step, onSuccess }: StepEditorDialogProps) {
  const [stepName, setStepName] = useState("");
  const [fields, setFields] = useState<Field[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (step) {
      setStepName(step.name);
      loadFields();
    } else {
      setStepName("");
      setFields([]);
    }
  }, [step, open]);

  const loadFields = async () => {
    if (!step) return;
    
    const { data } = await supabase
      .from('step_fields')
      .select('*')
      .eq('step_id', step.id)
      .order('field_order');

    if (data) {
      setFields(data);
    }
  };

  const addField = () => {
    setFields([...fields, {
      field_type: 'text',
      label: '',
      field_order: fields.length
    }]);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, updates: Partial<Field>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFields(newFields);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stepName.trim()) {
      toast.error("Step name is required");
      return;
    }

    setSaving(true);
    try {
      if (step) {
        // Update existing step
        await supabase
          .from('task_steps')
          .update({ name: stepName.trim() })
          .eq('id', step.id);

        // Delete existing fields
        await supabase
          .from('step_fields')
          .delete()
          .eq('step_id', step.id);
      } else {
        // Create new step - get max step number
        const { data: existingSteps } = await supabase
          .from('task_steps')
          .select('step_number')
          .eq('task_id', taskId)
          .order('step_number', { ascending: false })
          .limit(1);

        const nextStepNumber = existingSteps?.[0]?.step_number ? existingSteps[0].step_number + 1 : 1;

        const { data: newStep, error: stepError } = await supabase
          .from('task_steps')
          .insert({
            task_id: taskId,
            name: stepName.trim(),
            step_number: nextStepNumber
          })
          .select()
          .single();

        if (stepError) throw stepError;
        
        // Insert fields for new step
        if (fields.length > 0) {
          const { error: fieldsError } = await supabase
            .from('step_fields')
            .insert(
              fields.map((field, index) => ({
                step_id: newStep.id,
                field_type: field.field_type,
                label: field.label,
                field_order: index,
                text_value: null,
                image_url: null,
                checkbox_value: field.field_type === 'checkbox' ? false : null
              }))
            );

          if (fieldsError) throw fieldsError;
        }
      }

      // Insert/update fields for existing step
      if (step && fields.length > 0) {
        const { error: fieldsError } = await supabase
          .from('step_fields')
          .insert(
            fields.map((field, index) => ({
              step_id: step.id,
              field_type: field.field_type,
              label: field.label,
              field_order: index,
              text_value: field.id ? undefined : null,
              image_url: field.id ? undefined : null,
              checkbox_value: field.id ? undefined : (field.field_type === 'checkbox' ? false : null)
            }))
          );

        if (fieldsError) throw fieldsError;
      }

      toast.success(step ? "Step updated" : "Step created");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving step:', error);
      toast.error("Failed to save step");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{step ? 'Edit Step' : 'Add New Step'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stepName">Step Name *</Label>
            <Input
              id="stepName"
              value={stepName}
              onChange={(e) => setStepName(e.target.value)}
              placeholder="e.g., Prepare text"
              required
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Fields</Label>
              <Button type="button" variant="outline" size="sm" onClick={addField}>
                <Plus className="w-4 h-4 mr-1" />
                Add Field
              </Button>
            </div>

            {fields.map((field, index) => (
              <div key={index} className="flex items-end gap-2 p-3 border rounded-lg">
                <GripVertical className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-6" />
                
                <div className="flex-1 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Select
                        value={field.field_type}
                        onValueChange={(v: any) => updateField(index, { field_type: v })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="image">Image</SelectItem>
                          <SelectItem value="checkbox">Checkbox</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Label</Label>
                      <Input
                        value={field.label}
                        onChange={(e) => updateField(index, { label: e.target.value })}
                        placeholder="Field label"
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeField(index)}
                  className="flex-shrink-0 mb-0.5"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}

            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No fields added yet. Click "Add Field" to get started.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : step ? "Update Step" : "Create Step"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
