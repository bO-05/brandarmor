-- Preview applied the earlier 0002 trigger body before it was corrected from now() to clock_timestamp().
-- Keep this forward migration so already-migrated branches receive the monotonic timestamp fix.
CREATE OR REPLACE FUNCTION "public"."brandarmor_set_updated_at"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = clock_timestamp();
  RETURN NEW;
END;
$$;