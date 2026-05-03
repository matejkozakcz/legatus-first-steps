CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Try insert; on email conflict, re-link the orphan row to the new auth id
  INSERT INTO public.users (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;

  -- If row with same email but different id exists (orphan), update its id
  UPDATE public.users
  SET id = NEW.id,
      full_name = COALESCE(full_name, NEW.raw_user_meta_data->>'full_name', NEW.email)
  WHERE email = NEW.email AND id <> NEW.id
    AND NOT EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id);

  RETURN NEW;
EXCEPTION WHEN unique_violation THEN
  -- Defensive: never block auth signup
  RETURN NEW;
END;
$function$;
