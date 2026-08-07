import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getAuthDestination } from '@/features/auth/server/getAuthDestination';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/';

  if (!code) {
    return NextResponse.redirect(`${origin}/welcome?error=missing_code`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  
  if (error) {
    return NextResponse.redirect(`${origin}/welcome?error=exchange_failed`);
  }

  const destination = await getAuthDestination();

  // Make sure next is safe against open redirect if used, but here we prioritize getAuthDestination
  // If next is specifically requested and valid, we could use it, but for now just use destination
  return NextResponse.redirect(`${origin}${destination}`);
}
