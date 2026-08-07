import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  const path = url.pathname;

  const isPublicRoute =
    path === '/welcome' ||
    path.startsWith('/auth/callback') ||
    path.startsWith('/auth/confirm');

  // Basic unauthenticated route protection
  if (!user && !isPublicRoute) {
    url.pathname = '/welcome';
    return NextResponse.redirect(url);
  }

  // If user is logged in and tries to access /welcome, we let the server page handle it
  // (Server page will use getAuthDestination to redirect them appropriately)

  return supabaseResponse;
}
