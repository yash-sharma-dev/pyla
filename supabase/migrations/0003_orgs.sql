-- =============================================================================
-- Pyla — Phase 5 Migration: Team Workspaces
-- Run this in Supabase Dashboard → SQL Editor, or via supabase db push
-- =============================================================================

-- ─── Helper for User ID Resolution ───────────────────────────────────────────
-- Safely resolves the current user ID whether authenticating via JWT or API Key
CREATE OR REPLACE FUNCTION public.current_user_id() RETURNS UUID AS $$
BEGIN
  RETURN COALESCE(auth.uid(), public.api_key_user_id());
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;


-- ─── org_members ─────────────────────────────────────────────────────────────
CREATE TYPE public.org_role AS ENUM ('owner', 'editor', 'viewer');

CREATE TABLE IF NOT EXISTS public.org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.org_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

CREATE INDEX IF NOT EXISTS org_members_org_id_idx ON public.org_members(org_id);
CREATE INDEX IF NOT EXISTS org_members_user_id_idx ON public.org_members(user_id);

ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

-- ─── Security Definer Functions ──────────────────────────────────────────────
-- Using SECURITY DEFINER avoids infinite recursion in RLS policies

CREATE OR REPLACE FUNCTION public.get_user_orgs()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM org_members WHERE user_id = public.current_user_id();
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(check_org_id UUID, check_roles public.org_role[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = check_org_id
      AND user_id = public.current_user_id()
      AND role = ANY(check_roles)
  );
$$;

-- ─── Org Trigger ─────────────────────────────────────────────────────────────
-- Automatically assign the creator as 'owner' when they create an org
CREATE OR REPLACE FUNCTION public.auto_insert_org_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- We use current_user_id() to support both JWT and API Keys
  INSERT INTO org_members (org_id, user_id, role)
  VALUES (NEW.id, public.current_user_id(), 'owner');
  RETURN NEW;
END;
$$;

CREATE TRIGGER orgs_after_insert
  AFTER INSERT ON orgs
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_insert_org_owner();


-- ─── Update Org Policies ─────────────────────────────────────────────────────
-- Drop basic policies from 0001
DROP POLICY IF EXISTS "Orgs are readable by authenticated users" ON orgs;

CREATE POLICY "Users can view orgs they belong to"
  ON orgs FOR SELECT
  USING (id IN (SELECT public.get_user_orgs()));

CREATE POLICY "Users can create orgs"
  ON orgs FOR INSERT
  WITH CHECK (public.current_user_id() IS NOT NULL);

CREATE POLICY "Owners can update orgs"
  ON orgs FOR UPDATE
  USING (public.has_org_role(id, ARRAY['owner']::public.org_role[]));

CREATE POLICY "Owners can delete orgs"
  ON orgs FOR DELETE
  USING (public.has_org_role(id, ARRAY['owner']::public.org_role[]));

-- ─── Org Members Policies ────────────────────────────────────────────────────
CREATE POLICY "Users can view members of their orgs"
  ON org_members FOR SELECT
  USING (org_id IN (SELECT public.get_user_orgs()));

CREATE POLICY "Owners can manage members"
  ON org_members FOR ALL
  USING (public.has_org_role(org_id, ARRAY['owner']::public.org_role[]));


-- ─── Consolidated Capsule Policies ───────────────────────────────────────────
-- Drop all old policies from 0001 and 0002
DROP POLICY IF EXISTS "Users can select own capsules" ON capsules;
DROP POLICY IF EXISTS "Users can insert own capsules" ON capsules;
DROP POLICY IF EXISTS "Users can update own capsules" ON capsules;
DROP POLICY IF EXISTS "Users can delete own capsules" ON capsules;
DROP POLICY IF EXISTS "API Key can select own capsules" ON capsules;
DROP POLICY IF EXISTS "API Key can insert own capsules" ON capsules;
DROP POLICY IF EXISTS "API Key can update own capsules" ON capsules;

CREATE POLICY "Users can select personal or team capsules"
  ON capsules FOR SELECT
  USING (
    owner_id = public.current_user_id() OR
    (org_id IS NOT NULL AND org_id IN (SELECT public.get_user_orgs()))
  );

CREATE POLICY "Users can insert personal or team capsules"
  ON capsules FOR INSERT
  WITH CHECK (
    owner_id = public.current_user_id() AND
    (org_id IS NULL OR public.has_org_role(org_id, ARRAY['owner', 'editor']::public.org_role[]))
  );

CREATE POLICY "Users can update personal or team capsules"
  ON capsules FOR UPDATE
  USING (
    owner_id = public.current_user_id() OR
    (org_id IS NOT NULL AND public.has_org_role(org_id, ARRAY['owner', 'editor']::public.org_role[]))
  );

CREATE POLICY "Users can delete personal or team capsules"
  ON capsules FOR DELETE
  USING (
    owner_id = public.current_user_id() OR
    (org_id IS NOT NULL AND public.has_org_role(org_id, ARRAY['owner']::public.org_role[]))
  );

-- ─── Consolidated Capsule Versions Policies ──────────────────────────────────
DROP POLICY IF EXISTS "Users can select own capsule versions" ON capsule_versions;
DROP POLICY IF EXISTS "Users can insert own capsule versions" ON capsule_versions;
DROP POLICY IF EXISTS "API Key can select own capsule versions" ON capsule_versions;
DROP POLICY IF EXISTS "API Key can insert own capsule versions" ON capsule_versions;

CREATE POLICY "Users can select capsule versions"
  ON capsule_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM capsules
      WHERE capsules.id = capsule_versions.capsule_id
      AND (
        capsules.owner_id = public.current_user_id() OR
        (capsules.org_id IS NOT NULL AND capsules.org_id IN (SELECT public.get_user_orgs()))
      )
    )
  );

CREATE POLICY "Users can insert capsule versions"
  ON capsule_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM capsules
      WHERE capsules.id = capsule_versions.capsule_id
      AND (
        capsules.owner_id = public.current_user_id() OR
        (capsules.org_id IS NOT NULL AND public.has_org_role(capsules.org_id, ARRAY['owner', 'editor']::public.org_role[]))
      )
    )
  );

-- ─── Email Resolution RPCs ────────────────────────────────────────────────────
-- Both functions are SECURITY DEFINER so they can read auth.users (which is
-- otherwise inaccessible to the anon/authenticated roles under RLS).
-- They are intentionally narrow — no full user-table scans are possible.

-- Returns the UUID of a registered user given their email address.
-- Used by inviteMemberAction to resolve an email before inserting into org_members.
-- Returns NULL (not an error) when the email is not found — the app layer handles
-- the "no account found" message gracefully.
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(p_email TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM auth.users
  WHERE LOWER(email) = LOWER(p_email)
  LIMIT 1;
$$;

-- Returns (user_id, email) pairs for every member of a given org.
-- Used by the /settings/team server component to display email addresses in the
-- members table without exposing auth.users to the client directly.
-- RLS on org_members already ensures the caller must belong to p_org_id.
CREATE OR REPLACE FUNCTION public.get_member_emails(p_org_id UUID)
RETURNS TABLE (user_id UUID, email TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT om.user_id, u.email
  FROM org_members om
  JOIN auth.users u ON u.id = om.user_id
  WHERE om.org_id = p_org_id
    AND om.org_id IN (SELECT public.get_user_orgs());
$$;
