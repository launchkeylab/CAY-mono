import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Queue } from 'bullmq'
import { getAuthenticatedUser } from '@/lib/auth'
import { redisConnection } from '@/lib/redis'

const timerQueue = new Queue('timers', { connection: redisConnection })

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('[CHECKIN API] Starting checkin request')
  console.log('[CHECKIN API] Request URL:', request.url)
  console.log('[CHECKIN API] Request method:', request.method)
  console.log('[CHECKIN API] Params:', params)
  console.log('[CHECKIN API] Environment check - NODE_ENV:', process.env.NODE_ENV)
  console.log('[CHECKIN API] Environment check - VERCEL:', process.env.VERCEL)
  console.log('[CHECKIN API] Environment check - REDIS_URL:', process.env.REDIS_URL ? 'SET' : 'NOT_SET')
  console.log('[CHECKIN API] Environment check - SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT_SET')
  console.log('[CHECKIN API] Environment check - SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT_SET')
  console.log('[CHECKIN API] Environment check - DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT_SET')

  try {
    // Authenticate user
    console.log('[CHECKIN API] Attempting authentication...')
    const user = await getAuthenticatedUser(request)
    console.log('[CHECKIN API] Authentication result:', user ? 'SUCCESS' : 'FAILED')
    console.log('[CHECKIN API] User ID:', user?.id)
    
    if (!user) {
      console.log('[CHECKIN API] Authentication failed - returning 401')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const timerId = params.id
    console.log('[CHECKIN API] Timer ID from params:', timerId)
    
    // Verify timer belongs to authenticated user
    console.log('[CHECKIN API] Querying database for timer...')
    try {
      const existingTimer = await db.timer.findUnique({
        where: { id: timerId }
      })
      console.log('[CHECKIN API] Database query result:', existingTimer ? 'FOUND' : 'NOT_FOUND')
      console.log('[CHECKIN API] Timer details:', existingTimer)
      
      if (!existingTimer) {
        console.log('[CHECKIN API] Timer not found - returning 404')
        return NextResponse.json(
          { error: 'Timer not found' },
          { status: 404 }
        )
      }
      
      if (existingTimer.userId !== user.id) {
        console.log('[CHECKIN API] Timer ownership mismatch - user:', user.id, 'timer owner:', existingTimer.userId)
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }
    } catch (dbError) {
      console.error('[CHECKIN API] Database query error:', dbError)
      throw dbError
    }
    
    // Update timer with check-in time
    console.log('[CHECKIN API] Updating timer with check-in...')
    try {
      const timer = await db.timer.update({
        where: { id: timerId },
        data: {
          checkedInAt: new Date(),
          status: 'CHECKED_IN'
        }
      })
      console.log('[CHECKIN API] Timer update successful:', timer)
    } catch (updateError) {
      console.error('[CHECKIN API] Timer update error:', updateError)
      throw updateError
    }
    
    // Cancel the scheduled job since user checked in
    console.log('[CHECKIN API] Attempting to cancel scheduled job...')
    try {
      await timerQueue.remove(timerId)
      console.log('[CHECKIN API] Job removal successful')
    } catch (jobError) {
      // Job might have already been processed or not exist
      console.log('[CHECKIN API] Could not remove job (this is often expected):', jobError)
    }
    
    const finalTimer = await db.timer.findUnique({
      where: { id: timerId }
    })
    console.log('[CHECKIN API] Final timer state:', finalTimer)
    console.log('[CHECKIN API] Returning success response')
    
    return NextResponse.json(finalTimer)
    
  } catch (error) {
    console.error('[CHECKIN API] Fatal error:', error)
    console.error('[CHECKIN API] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: 'Failed to check in', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}