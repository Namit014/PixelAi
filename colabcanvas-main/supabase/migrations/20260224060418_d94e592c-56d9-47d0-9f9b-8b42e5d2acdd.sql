CREATE INDEX IF NOT EXISTS idx_projects_user_deleted_last_accessed
ON public.projects (user_id, deleted_at, last_accessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_projects_user_deleted_created
ON public.projects (user_id, deleted_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_project_collaborators_project_id
ON public.project_collaborators (project_id);