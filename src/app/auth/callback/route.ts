import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')
  const redirectTo = searchParams.get('redirectTo')
  const error = searchParams.get('error')
  const error_description = searchParams.get('error_description')

  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocalEnv = process.env.NODE_ENV === 'development'

  const createRedirect = (path: string) => {
    if (isLocalEnv || !forwardedHost) {
      return NextResponse.redirect(new URL(path, origin))
    } else {
      return NextResponse.redirect(new URL(path, `https://${forwardedHost}`))
    }
  }

  // If error is present or code is missing, redirect to login
  if (error || !code) {
    if (error) {
      console.error('[auth/callback] OAuth callback error:', error, error_description)
    }
    return createRedirect('/login?error=auth_callback_failed')
  }

  const supabase = createClient()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    console.error('[auth/callback] Session exchange error:', exchangeError.message)
    return createRedirect('/login?error=auth_callback_failed')
  }

  // Fetch the authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const adminClient = createAdminClient()
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', user.id)
      .maybeSingle()

    const metadataFullName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      'User'
    const metadataAvatarUrl =
      user.user_metadata?.avatar_url ||
      user.user_metadata?.picture ||
      null

    if (!existingProfile) {
      await adminClient.from('profiles').insert({
        id: user.id,
        email: user.email!,
        full_name: metadataFullName,
        avatar_url: metadataAvatarUrl,
        role: 'customer',
      })
    } else {
      const updates: { full_name?: string; avatar_url?: string } = {}
      const rawMetadataName =
        user.user_metadata?.full_name || user.user_metadata?.name
      const rawMetadataAvatar =
        user.user_metadata?.avatar_url || user.user_metadata?.picture

      if (!existingProfile.full_name && rawMetadataName) {
        updates.full_name = rawMetadataName
      }
      if (!existingProfile.avatar_url && rawMetadataAvatar) {
        updates.avatar_url = rawMetadataAvatar
      }

      if (Object.keys(updates).length > 0) {
        await adminClient.from('profiles').update(updates).eq('id', user.id)
      }
    }
  }

  // Determine redirect destination: check next or redirectTo. Ensure it's a safe relative path starting with / and not // (to prevent open redirects); default to /profile.
  const candidate = next || redirectTo
  let destination = '/profile'
  if (candidate && candidate.startsWith('/') && !candidate.startsWith('//')) {
    destination = candidate
  }

  if (isLocalEnv || !forwardedHost) {
    return NextResponse.redirect(new URL(destination, origin))
  } else {
    return NextResponse.redirect(new URL(destination, `https://${forwardedHost}`))
  }
}

