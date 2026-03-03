import { createClient } from "@supabase/supabase-js"

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,   // ton URL Supabase
  process.env.SUPABASE_SERVICE_ROLE_KEY!   // clé SERVICE_ROLE (server only!)
)
