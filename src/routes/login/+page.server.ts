import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
  login: async ({ request, locals }) => {
    const data = await request.formData();
    const email = String(data.get('email') ?? '').trim();
    const password = String(data.get('password') ?? '');
    if (!email || !password) return fail(400, { email, message: 'Email and password required' });

    const { error } = await locals.supabase.auth.signInWithPassword({ email, password });
    if (error) return fail(400, { email, message: error.message });
    throw redirect(303, '/');
  },

  forgot: async ({ request, locals, url }) => {
    const data = await request.formData();
    const email = String(data.get('email') ?? '').trim();
    if (!email) return fail(400, { email, mode: 'forgot', message: 'Email required' });

    const { error } = await locals.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${url.origin}/auth/callback?next=/set-password`
    });
    if (error) return fail(400, { email, mode: 'forgot', message: error.message });
    return { sent: true, email };
  },

  logout: async ({ locals }) => {
    await locals.supabase.auth.signOut();
    throw redirect(303, '/login');
  }
};
