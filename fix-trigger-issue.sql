-- EMERGENCY FIX: Remove problematic database triggers
-- Run this SQL script to fix the "stack depth limit exceeded" error

-- Step 1: Drop any existing problematic triggers
DROP TRIGGER IF EXISTS trigger_wp_compliance_update ON datawp;
DROP FUNCTION IF EXISTS trigger_update_compliance();

-- Step 2: Check for any other triggers that might cause issues
SELECT
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'datawp';

-- Step 3: If you see any problematic triggers, drop them:
-- DROP TRIGGER IF EXISTS [trigger_name] ON datawp;

-- Step 4: Verify the fix
SELECT 'Triggers removed successfully' as status;

-- Alternative: If you want to disable all triggers temporarily
-- ALTER TABLE datawp DISABLE TRIGGER ALL;
-- (Remember to re-enable with: ALTER TABLE datawp ENABLE TRIGGER ALL;)