import { supabaseAdmin } from '$lib/server/supabase-admin';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 100 });
  if (error) return { users: [] as { email: string; confirmed: boolean; createdAt: string }[] };
  const users = data.users.map((u) => ({
    email: u.email ?? '',
    confirmed: Boolean(u.email_confirmed_at),
    createdAt: u.created_at
  }));
  return { users };
};

export const actions: Actions = {
  invite: async ({ request, url }) => {
    const data = await request.formData();
    const email = String(data.get('email') ?? '').trim().toLowerCase();
    if (!email) return fail(400, { email, message: 'Email required' });

    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { needs_password: true },
      redirectTo: `${url.origin}/auth/callback?next=/set-password`
    });
    if (error) return fail(400, { email, message: error.message });
    return { sent: true, email };
  }
};
