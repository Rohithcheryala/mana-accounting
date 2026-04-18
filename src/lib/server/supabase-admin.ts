import { env } from '$env/dynamic/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';

const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set. Required for admin operations (invites).');
}

export const supabaseAdmin = createClient(PUBLIC_SUPABASE_URL, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
