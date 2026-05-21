-- Run this in your Supabase SQL Editor to generate a test API Key for your user.

-- 1. Get your user ID (you can find this in Authentication -> Users)
-- Replace this with your actual user UUID
DO $$ 
DECLARE
    test_user_id UUID := 'YOUR_USER_ID_HERE'; -- Replace me!
    test_api_key TEXT := 'pyla_live_test123';
    test_key_hash TEXT;
BEGIN
    test_key_hash := encode(digest(test_api_key, 'sha256'), 'hex');

    INSERT INTO api_keys (key_hash, user_id, name)
    VALUES (test_key_hash, test_user_id, 'MCP Test Key')
    ON CONFLICT DO NOTHING;
END $$;

-- After running this, use 'pyla_live_test123' as your PYLA_API_KEY in mcp.json
