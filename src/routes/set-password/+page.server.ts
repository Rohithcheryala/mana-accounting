import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, '/login');
  return { email: locals.user.email };
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    if (!locals.user) throw redirect(303, '/login');

    const data = await request.formData();
    const password = String(data.get('password') ?? '');
    const confirm = String(data.get('confirm') ?? '');

    if (password.length < 8) return fail(400, { message: 'Password must be at least 8 characters' });
    if (password !== confirm) return fail(400, { message: 'Passwords do not match' });

    const { error } = await locals.supabase.auth.updateUser({
      password,
      data: { needs_password: false }
    });
    if (error) return fail(400, { message: error.message });

    throw redirect(303, '/');
  }
};
