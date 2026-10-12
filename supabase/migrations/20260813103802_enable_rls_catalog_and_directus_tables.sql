-- Catalog tables: public data, meant to be readable by anyone, but writes
-- should only happen via the edge function (service_role, bypasses RLS) or
-- Directus (connects directly to Postgres as the table-owning role, also
-- bypasses RLS) -- never directly via the public anon/authenticated API.
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weapon_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weapons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specializations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON public.games FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.weapon_categories FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.weapons FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.attachment_types FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.attachments FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.perks FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.equipment FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.classes FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.specializations FOR SELECT USING (true);

-- Directus system tables (directus_users has password hashes, directus_sessions
-- has session tokens, directus_permissions/roles control admin access, etc.).
-- No policies added -- this fully denies anon/authenticated access via the
-- public REST API. Directus itself connects directly to Postgres as the
-- table-owning role, so RLS does not apply to it and it keeps working as-is.
ALTER TABLE public.directus_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directus_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directus_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directus_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directus_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directus_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directus_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directus_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directus_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directus_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directus_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directus_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directus_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directus_dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directus_panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directus_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directus_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directus_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directus_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directus_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directus_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directus_extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directus_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directus_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directus_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directus_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directus_deployment_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directus_deployment_runs ENABLE ROW LEVEL SECURITY;
;
