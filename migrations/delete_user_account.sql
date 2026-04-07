-- Script to completely delete a user account and all associated data
--
-- Usage: 
-- 1. Open this script in your Supabase SQL Editor.
-- 2. Modify the `target_email` variable below with the email of the account to delete.
-- 3. Run the script.

DO $$
DECLARE
    target_email TEXT := 'chiragc1307@gmail.com'; -- <=== REPLACE THIS WITH THE ACTUAL EMAIL
    target_user_id UUID;
    complaint_ids UUID[];
BEGIN
    -- 1. Get the user ID from auth.users
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = target_email;

    IF target_user_id IS NULL THEN
        RAISE NOTICE 'User with email % not found in auth.users.', target_email;
        RETURN;
    END IF;

    RAISE NOTICE 'Found user with ID: %', target_user_id;

    -- 2. Get all raw_complaint IDs for this user
    SELECT array_agg(id) INTO complaint_ids
    FROM raw_complaints
    WHERE user_id = target_user_id;

    IF complaint_ids IS NOT NULL AND array_length(complaint_ids, 1) > 0 THEN
        RAISE NOTICE 'Found % complaints to delete.', array_length(complaint_ids, 1);
        
        -- 3. Unassign any staff currently working on these complaints
        -- This prevents foreign key constraint errors when deleting complaints
        UPDATE staff
        SET current_assignment_id = NULL,
            status = 'available'
        WHERE current_assignment_id = ANY(complaint_ids);
    ELSE
        RAISE NOTICE 'No complaints found for this user.';
    END IF;

    -- Note on Storage: 
    -- Supabase typically doesn't auto-delete files in storage when database rows are removed.
    -- Ideally, you'd clean up the `complaints` bucket files matching path "{target_user_id}/..."
    -- before doing this SQL delete, or accept that they become orphaned. 
    -- NOTE: Deleting files directly from 'storage.objects' via SQL is blocked by Supabase to prevent orphaned S3 objects.
    -- If you want to delete their uploaded complaint images, please navigate to the Storage section
    -- in the Supabase Dashboard and manually delete the folder named after the user's UUID.

    -- 4. Delete from processed_complaints
    -- Note: processed_complaints references both raw_complaints(id) AND citizens(id)
    DELETE FROM processed_complaints
    WHERE user_id = target_user_id;

    -- 5. Delete from raw_complaints
    DELETE FROM raw_complaints
    WHERE user_id = target_user_id;

    -- 6. Delete from citizens
    DELETE FROM citizens
    WHERE id = target_user_id;

    -- 7. Delete from admins (if the user was an admin)
    DELETE FROM admins
    WHERE id = target_user_id;

    -- 8. Delete from profiles
    DELETE FROM profiles
    WHERE id = target_user_id;

    -- 9. Delete from OTP codes (cleanup any lingering auth verification records)
    DELETE FROM otp_codes
    WHERE email = target_email;

    -- 10. Delete from auth.users
    -- Depending on your Supabase config, this might auto-cascade to profiles/etc.
    -- But explicitly deleting the above tables ensures safe order.
    DELETE FROM auth.users
    WHERE id = target_user_id;

    RAISE NOTICE 'Successfully deleted user % and all associated data/complaints.', target_email;
END $$;
