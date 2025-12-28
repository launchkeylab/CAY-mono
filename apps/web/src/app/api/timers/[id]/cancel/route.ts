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
    
    // Update timer status to cancelled
    const timer = await db.timer.update({
      where: { id: timerId },
      data: {
        status: 'CANCELLED'
      }
    })
    
    // Cancel the scheduled job
    try {
      await timerQueue.remove(timerId)
    } catch (jobError) {
      console.log('Could not remove job:', jobError)
    }
    
    return NextResponse.json(timer)
    
  } catch (error) {
    console.error('Cancel timer error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel timer' },
      { status: 500 }
    )
  }
}