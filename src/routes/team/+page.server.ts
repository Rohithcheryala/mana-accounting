import { supabaseAdmin } from '$lib/server/supabase-admin';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

type TeamUser = {
  id: string;
  email: string;
  confirmed: boolean;
  createdAt: string;
  lastSignInAt: string | null;
};

export const load: PageServerLoad = async ({ locals }) => {
  const { data, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 100 });
  if (listErr) {
    return { users: [] as TeamUser[], isAdmin: locals.isAdmin };
  }
  const users: TeamUser[] = data.users.map((u) => ({
    id: u.id,
    email: u.email ?? '',
    confirmed: Boolean(u.email_confirmed_at),
    createdAt: u.created_at,
    lastSignInAt: u.last_sign_in_at ?? null
  }));
  return { users, isAdmin: locals.isAdmin };
};

function requireAdmin(locals: App.Locals) {
  if (!locals.isAdmin) throw error(403, 'Admin only');
}

export const actions: Actions = {
  invite: async ({ request, url }) => {
    const data = await request.formData();
    const email = String(data.get('email') ?? '').trim().toLowerCase();
    if (!email) return fail(400, { email, message: 'Email required' });

    const { error: err } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { needs_password: true },
      redirectTo: `${url.origin}/auth/callback?next=/set-password`
    });
    if (err) return fail(400, { email, message: err.message });
    return { sent: true, email };
  },

  resend: async ({ request, locals, url }) => {
    requireAdmin(locals);
    const data = await request.formData();
    const userId = String(data.get('user_id') ?? '');
    const email = String(data.get('email') ?? '').trim().toLowerCase();
    if (!userId || !email) return fail(400, { message: 'Missing user id or email' });

    // Delete the pending user and re-invite to trigger a fresh email.
    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (delErr) return fail(500, { message: `Delete failed: ${delErr.message}` });

    const { error: invErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { needs_password: true },
      redirectTo: `${url.origin}/auth/callback?next=/set-password`
    });
    if (invErr) return fail(500, { message: `Re-invite failed: ${invErr.message}` });

    return { resent: true, email };
  },

  remove: async ({ request, locals }) => {
    requireAdmin(locals);
    const data = await request.formData();
    const userId = String(data.get('user_id') ?? '');
    const email = String(data.get('email') ?? '').trim().toLowerCase();
    if (!userId) return fail(400, { message: 'Missing user id' });

    if (locals.user?.id === userId) {
      return fail(400, { message: "You can't delete your own account." });
    }

    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (delErr) return fail(500, { message: delErr.message });
    return { removed: true, email };
  }
};
