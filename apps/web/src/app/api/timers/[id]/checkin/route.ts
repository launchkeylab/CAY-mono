import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Queue } from 'bullmq'
import Redis from 'ioredis'
import { getAuthenticatedUser } from '@/lib/auth'

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { 
  maxRetriesPerRequest: null 
})

const timerQueue = new Queue('timers', { connection })

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
    
    // Update timer with check-in time
    const timer = await db.timer.update({
      where: { id: timerId },
      data: {
        checkedInAt: new Date(),
        status: 'CHECKED_IN'
      }
    })
    
    // Cancel the scheduled job since user checked in
    try {
      await timerQueue.remove(timerId)
    } catch (jobError) {
      // Job might have already been processed or not exist
      console.log('Could not remove job:', jobError)
    }
    
    return NextResponse.json(timer)
    
  } catch (error) {
    console.error('Check-in error:', error)
    return NextResponse.json(
      { error: 'Failed to check in' },
      { status: 500 }
    )
  }
}