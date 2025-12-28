import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { db } from '@/lib/db'

export async function getAuthenticatedUser(request: NextRequest) {
  // Check if Supabase is properly configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn('Supabase not configured, falling back to demo user')
    
    // Create or get demo user for development
    let demoUser = await db.user.findFirst({
      where: { email: 'demo@cay.com' }
    })
    
    if (!demoUser) {
      demoUser = await db.user.create({
        data: {
          id: 'demo-user-id',
          email: 'demo@cay.com',
          name: 'Demo User',
          password: 'demo-password' // In production, this would be properly hashed
        }
      })
    }
    
    return { id: demoUser.id, email: demoUser.email }
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => {
          const cookieStore = request.headers.get('cookie') || ''
          return cookieStore.split(';').map(cookie => {
            const [name, value] = cookie.trim().split('=')
            return { name, value: value || '' }
          })
        },
        setAll: () => {
          // No-op for server-side
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return null
  }

  // Ensure user exists in our local database
  let localUser = await db.user.findUnique({
    where: { id: user.id }
  })

  if (!localUser) {
    // Create local user record for Supabase user
    localUser = await db.user.create({
      data: {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.name || user.email || '',
        password: '' // Supabase handles auth, we don't store password
      }
    })
  }

  return { id: localUser.id, email: localUser.email }
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