CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_hash TEXT UNIQUE NOT NULL,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own api keys" ON api_keys
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own api keys" ON api_keys
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own api keys" ON api_keys
    FOR DELETE USING (auth.uid() = user_id);

-- Function to extract API key from headers, hash it, and lookup user_id
-- We use SECURITY DEFINER so the anon role can query the api_keys table internally
CREATE OR REPLACE FUNCTION public.api_key_user_id() RETURNS UUID AS $$
DECLARE
    header_key TEXT;
    hashed_key TEXT;
    mapped_user_id UUID;
BEGIN
    header_key := current_setting('request.headers', true)::json->>'x-pyla-api-key';
    
    IF header_key IS NULL THEN
        RETURN NULL;
    END IF;

    -- The incoming header key is already SHA-256 hashed by the MCP client JS
    hashed_key := header_key;

    -- Lookup the owner ID
    SELECT user_id INTO mapped_user_id
    FROM api_keys
    WHERE key_hash = hashed_key
    LIMIT 1;

    RETURN mapped_user_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Additional policies for capsules to allow API Key access
CREATE POLICY "API Key can select own capsules" ON capsules
    FOR SELECT USING (public.api_key_user_id() = user_id);

CREATE POLICY "API Key can insert own capsules" ON capsules
    FOR INSERT WITH CHECK (public.api_key_user_id() = user_id);

CREATE POLICY "API Key can update own capsules" ON capsules
    FOR UPDATE USING (public.api_key_user_id() = user_id);

-- Additional policies for capsule_versions to allow API Key access
CREATE POLICY "API Key can select own capsule versions" ON capsule_versions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM capsules
            WHERE capsules.id = capsule_versions.capsule_id
            AND capsules.user_id = public.api_key_user_id()
        )
    );

CREATE POLICY "API Key can insert own capsule versions" ON capsule_versions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM capsules
            WHERE capsules.id = capsule_versions.capsule_id
            AND capsules.user_id = public.api_key_user_id()
        )
    );
