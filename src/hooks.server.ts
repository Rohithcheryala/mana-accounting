import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createServerClient, type CookieMethodsServer } from '@supabase/ssr';
import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

const supabase: Handle = async ({ event, resolve }) => {
  const cookies: CookieMethodsServer = {
    getAll: () => event.cookies.getAll(),
    setAll: (cookiesToSet) => {
      cookiesToSet.forEach(({ name, value, options }) => {
        event.cookies.set(name, value, { ...options, path: '/' });
      });
    }
  };

  event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    cookies
  });

  event.locals.safeGetSession = async () => {
    const {
      data: { session }
    } = await event.locals.supabase.auth.getSession();
    if (!session) return { session: null, user: null };

    const {
      data: { user },
      error
    } = await event.locals.supabase.auth.getUser();
    if (error) return { session: null, user: null };

    return { session, user };
  };

  return resolve(event, {
    filterSerializedResponseHeaders: (name) => name === 'content-range' || name === 'x-supabase-api-version'
  });
};

const authGuard: Handle = async ({ event, resolve }) => {
  const { session, user } = await event.locals.safeGetSession();
  event.locals.session = session;
  event.locals.user = user;

  const path = event.url.pathname;
  const isPublic = path === '/login' || path.startsWith('/auth/');

  if (!session && !isPublic) {
    throw redirect(303, '/login');
  }
  if (session && path === '/login' && event.request.method === 'GET') {
    throw redirect(303, '/');
  }

  if (session && user && !isPublic) {
    const needsPassword = user.user_metadata?.needs_password === true;
    if (needsPassword && path !== '/set-password') {
      throw redirect(303, '/set-password');
    }
  }

  return resolve(event);
};

export const handle: Handle = sequence(supabase, authGuard);
