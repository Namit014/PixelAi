CREATE INDEX IF NOT EXISTS idx_projects_dashboard_recent_partial
ON public.projects (user_id, last_accessed_at DESC)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_projects_dashboard_created_partial
ON public.projects (user_id, created_at DESC)
WHERE deleted_at IS NULL;