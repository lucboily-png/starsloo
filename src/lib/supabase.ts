import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.SUPABASE_URL!,       // <-- côté serveur
  process.env.SUPABASE_ANON_KEY!
);