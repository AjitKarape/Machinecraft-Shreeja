-- Enable real-time updates for action_tasks table
ALTER TABLE public.action_tasks REPLICA IDENTITY FULL;

-- Add action_tasks to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.action_tasks;

-- Enable real-time updates for task_steps table
ALTER TABLE public.task_steps REPLICA IDENTITY FULL;

-- Add task_steps to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_steps;