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

export function validateWebhookUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url)
    // Only allow HTTPS URLs (except localhost for development)
    if (parsedUrl.protocol !== 'https:' && !parsedUrl.hostname.includes('localhost')) {
      return false
    }
    return true
  } catch {
    return false
  }
}