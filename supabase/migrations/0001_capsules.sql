-- =============================================================================
-- Pyla — Phase 2 Migration: Capsule Schema
-- Run this in Supabase Dashboard → SQL Editor, or via supabase db push
-- =============================================================================

-- ─── orgs ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orgs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;

-- Org members can read their org (stub — full org membership in a later phase)
CREATE POLICY "Orgs are readable by authenticated users"
  ON orgs FOR SELECT
  TO authenticated
  USING (true);


-- ─── capsules ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS capsules (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT        NOT NULL,
  goals       TEXT[]      NOT NULL DEFAULT '{}',
  decisions   TEXT[]      NOT NULL DEFAULT '{}',
  messages    JSONB       NOT NULL,
  attachments TEXT[]      NOT NULL DEFAULT '{}',
  tags        TEXT[]      NOT NULL DEFAULT '{}',
  version     INTEGER     NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id    UUID        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  org_id      UUID        REFERENCES orgs (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS capsules_user_id_idx  ON capsules (user_id);
CREATE INDEX IF NOT EXISTS capsules_org_id_idx    ON capsules (org_id);
CREATE INDEX IF NOT EXISTS capsules_updated_at_idx ON capsules (updated_at DESC);

ALTER TABLE capsules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own capsules"
  ON capsules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own capsules"
  ON capsules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own capsules"
  ON capsules FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own capsules"
  ON capsules FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-bump updated_at on every update
CREATE OR REPLACE FUNCTION capsules_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER capsules_updated_at_trigger
  BEFORE UPDATE ON capsules
  FOR EACH ROW EXECUTE FUNCTION capsules_set_updated_at();


-- ─── capsule_versions ────────────────────────────────────────────────────────
-- Immutable snapshot of a capsule at a specific version number.
CREATE TABLE IF NOT EXISTS capsule_versions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  capsule_id  UUID        NOT NULL REFERENCES capsules (id) ON DELETE CASCADE,
  version     INTEGER     NOT NULL,
  title       TEXT        NOT NULL,
  goals       TEXT[]      NOT NULL DEFAULT '{}',
  decisions   TEXT[]      NOT NULL DEFAULT '{}',
  messages    JSONB       NOT NULL,
  attachments TEXT[]      NOT NULL DEFAULT '{}',
  tags        TEXT[]      NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID        REFERENCES auth.users (id) ON DELETE SET NULL,

  -- Each capsule can only have one snapshot per version number
  UNIQUE (capsule_id, version)
);

CREATE INDEX IF NOT EXISTS capsule_versions_capsule_id_idx ON capsule_versions (capsule_id);

ALTER TABLE capsule_versions ENABLE ROW LEVEL SECURITY;

-- Version access is gated on owning the parent capsule
CREATE POLICY "Users can select own capsule versions"
  ON capsule_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM capsules
      WHERE capsules.id = capsule_versions.capsule_id
        AND capsules.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own capsule versions"
  ON capsule_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM capsules
      WHERE capsules.id = capsule_versions.capsule_id
        AND capsules.user_id = auth.uid()
    )
  );
