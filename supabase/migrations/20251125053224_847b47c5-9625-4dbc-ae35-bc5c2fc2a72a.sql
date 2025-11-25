-- Create enums for action plan module
CREATE TYPE public.task_status AS ENUM ('not_started', 'in_progress', 'completed');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE public.field_type AS ENUM ('text', 'image', 'checkbox');

-- Create action_tasks table
CREATE TABLE public.action_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'not_started',
  priority task_priority NOT NULL DEFAULT 'medium',
  due_date DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create task_steps table
CREATE TABLE public.task_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.action_tasks(id) ON DELETE CASCADE NOT NULL,
  step_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create step_fields table
CREATE TABLE public.step_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID REFERENCES public.task_steps(id) ON DELETE CASCADE NOT NULL,
  field_type field_type NOT NULL,
  label TEXT NOT NULL,
  text_value TEXT,
  image_url TEXT,
  checkbox_value BOOLEAN,
  field_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_action_tasks_created_by ON public.action_tasks(created_by);
CREATE INDEX idx_action_tasks_status ON public.action_tasks(status);
CREATE INDEX idx_action_tasks_due_date ON public.action_tasks(due_date);
CREATE INDEX idx_task_steps_task_id ON public.task_steps(task_id);
CREATE INDEX idx_step_fields_step_id ON public.step_fields(step_id);

-- Enable RLS
ALTER TABLE public.action_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.step_fields ENABLE ROW LEVEL SECURITY;

-- RLS Policies for action_tasks
CREATE POLICY "Authenticated users can view all tasks"
  ON public.action_tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create tasks"
  ON public.action_tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own tasks"
  ON public.action_tasks FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own tasks"
  ON public.action_tasks FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- RLS Policies for task_steps
CREATE POLICY "Authenticated users can view all steps"
  ON public.task_steps FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage steps for their tasks"
  ON public.task_steps FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.action_tasks
      WHERE id = task_steps.task_id
      AND created_by = auth.uid()
    )
  );

-- RLS Policies for step_fields
CREATE POLICY "Authenticated users can view all fields"
  ON public.step_fields FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage fields for their task steps"
  ON public.step_fields FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.task_steps ts
      JOIN public.action_tasks at ON at.id = ts.task_id
      WHERE ts.id = step_fields.step_id
      AND at.created_by = auth.uid()
    )
  );

-- Create updated_at triggers
CREATE TRIGGER update_action_tasks_updated_at
  BEFORE UPDATE ON public.action_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_task_steps_updated_at
  BEFORE UPDATE ON public.task_steps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_step_fields_updated_at
  BEFORE UPDATE ON public.step_fields
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for task images
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-images', 'task-images', true);

-- Storage policies for task-images bucket
CREATE POLICY "Authenticated users can view task images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'task-images');

CREATE POLICY "Authenticated users can upload task images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'task-images');

CREATE POLICY "Users can update their task images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'task-images');

CREATE POLICY "Users can delete their task images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'task-images');