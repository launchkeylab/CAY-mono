import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Queue } from 'bullmq'
import Redis from 'ioredis'

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { 
  maxRetriesPerRequest: null 
})

const timerQueue = new Queue('timers', { connection })

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const timerId = params.id
    
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