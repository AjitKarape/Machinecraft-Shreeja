-- Add parent_step_id column to task_steps table to support sub-steps
ALTER TABLE public.task_steps 
ADD COLUMN parent_step_id UUID NULL 
REFERENCES public.task_steps(id) ON DELETE CASCADE;

-- Add index for better query performance on parent-child relationships
CREATE INDEX idx_task_steps_parent_step_id ON public.task_steps(parent_step_id);

-- Add comment to document the self-referencing relationship
COMMENT ON COLUMN public.task_steps.parent_step_id IS 'References parent step ID for sub-steps. NULL means it is a main step.';