import type { SupabaseClient, Session, User } from '@supabase/supabase-js';

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient;
      safeGetSession: () => Promise<{ session: Session | null; user: User | null }>;
      session: Session | null;
      user: User | null;
      isAdmin: boolean;
    }
    interface PageData {
      session: Session | null;
      user: User | null;
      isAdmin: boolean;
    }
    // interface Error {}
    // interface Platform {}
  }
}

export {};
