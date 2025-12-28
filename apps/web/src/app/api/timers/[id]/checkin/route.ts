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

  try {
    // Authenticate user
    const user = await getAuthenticatedUser(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const timerId = params.id
    
    // Verify timer belongs to authenticated user
    try {
      const existingTimer = await db.timer.findUnique({
        where: { id: timerId }
      })
      
      if (!existingTimer) {
        return NextResponse.json(
          { error: 'Timer not found' },
          { status: 404 }
        )
      }
      
      if (existingTimer.userId !== user.id) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }
    } catch (dbError) {
      console.error('Database query error:', dbError)
      throw dbError
    }
    
    // Update timer with check-in time
    try {
      const timer = await db.timer.update({
        where: { id: timerId },
        data: {
          checkedInAt: new Date(),
          status: 'CHECKED_IN'
        }
      })
    } catch (updateError) {
      console.error('Timer update error:', updateError)
      throw updateError
    }
    
    // Cancel the scheduled job since user checked in
    try {
      await timerQueue.remove(timerId)
    } catch (jobError) {
      // Job might have already been processed or not exist
    }
    
    const finalTimer = await db.timer.findUnique({
      where: { id: timerId }
    })
    
    return NextResponse.json(finalTimer)
    
  } catch (error) {
    console.error('Fatal error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: 'Failed to check in', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}