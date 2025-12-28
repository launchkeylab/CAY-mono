import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { db } from '@/lib/db'

export async function getAuthenticatedUser(request: NextRequest) {
  console.log('[AUTH] Starting authentication process')
  console.log('[AUTH] Request URL:', request.url)
  console.log('[AUTH] Checking Supabase configuration...')
  
  // Check if Supabase is properly configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn('[AUTH] Supabase not configured, falling back to demo user')
    console.log('[AUTH] SUPABASE_URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('[AUTH] SUPABASE_ANON_KEY exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    
    try {
      // Create or get demo user for development
      console.log('[AUTH] Looking for demo user...')
      let demoUser = await db.user.findFirst({
        where: { email: 'demo@cay.com' }
      })
      
      if (!demoUser) {
        console.log('[AUTH] Demo user not found, creating...')
        demoUser = await db.user.create({
          data: {
            id: 'demo-user-id',
            email: 'demo@cay.com',
            name: 'Demo User',
            password: 'demo-password' // In production, this would be properly hashed
          }
        })
        console.log('[AUTH] Demo user created:', demoUser.id)
      } else {
        console.log('[AUTH] Demo user found:', demoUser.id)
      }
      
      return { id: demoUser.id, email: demoUser.email }
    } catch (dbError) {
      console.error('[AUTH] Database error when handling demo user:', dbError)
      throw dbError
    }
  }

  console.log('[AUTH] Supabase is configured, creating client...')
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => {
          const cookieStore = request.headers.get('cookie') || ''
          console.log('[AUTH] Raw cookie header:', cookieStore)
          const cookies = cookieStore.split(';').map(cookie => {
            const [name, value] = cookie.trim().split('=')
            return { name, value: value || '' }
          })
          console.log('[AUTH] Parsed cookies:', cookies.length, 'cookies')
          return cookies
        },
        setAll: () => {
          // No-op for server-side
          console.log('[AUTH] setAll called (no-op)')
        },
      },
    }
  )

  console.log('[AUTH] Getting user from Supabase...')
  const { data: { user }, error } = await supabase.auth.getUser()
  console.log('[AUTH] Supabase auth result - error:', error)
  console.log('[AUTH] Supabase auth result - user exists:', !!user)
  console.log('[AUTH] Supabase user ID:', user?.id)
  
  if (error || !user) {
    console.log('[AUTH] Authentication failed, returning null')
    return null
  }

  console.log('[AUTH] User authenticated, checking local database...')
  try {
    // Ensure user exists in our local database
    let localUser = await db.user.findUnique({
      where: { id: user.id }
    })
    console.log('[AUTH] Local user lookup result:', localUser ? 'FOUND' : 'NOT_FOUND')

    if (!localUser) {
      console.log('[AUTH] Creating local user record...')
      // Create local user record for Supabase user
      localUser = await db.user.create({
        data: {
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.name || user.email || '',
          password: '' // Supabase handles auth, we don't store password
        }
      })
      console.log('[AUTH] Local user created:', localUser.id)
    }

    console.log('[AUTH] Authentication successful for user:', localUser.id)
    return { id: localUser.id, email: localUser.email }
  } catch (dbError) {
    console.error('[AUTH] Database error during user lookup/creation:', dbError)
    throw dbError
  }
}

export function validateWebhookUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsedUrl = new URL(url)
    
    // Check protocol - must be http or https
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return { valid: false, error: 'Invalid protocol. Only HTTP and HTTPS are allowed.' }
    }
    
    // For non-localhost URLs, require HTTPS in production
    if (process.env.NODE_ENV === 'production' && 
        parsedUrl.protocol !== 'https:' && 
        !parsedUrl.hostname.includes('localhost') &&
        !parsedUrl.hostname.includes('127.0.0.1')) {
      return { valid: false, error: 'HTTPS required for external URLs in production.' }
    }
    
    // Check for valid hostname
    if (!parsedUrl.hostname || parsedUrl.hostname.length === 0) {
      return { valid: false, error: 'Invalid hostname.' }
    }
    
    // Prevent private/internal networks in production (optional security measure)
    const isPrivateNetwork = parsedUrl.hostname.match(/^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/)
    if (process.env.NODE_ENV === 'production' && 
        isPrivateNetwork && 
        !parsedUrl.hostname.includes('localhost')) {
      return { valid: false, error: 'Private network URLs not allowed in production.' }
    }
    
    return { valid: true }
  } catch (error) {
    return { valid: false, error: 'Invalid URL format.' }
  }
}