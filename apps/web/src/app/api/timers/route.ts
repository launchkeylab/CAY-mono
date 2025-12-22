import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Queue } from 'bullmq'
import Redis from 'ioredis'
import { getAuthenticatedUser, validateWebhookUrl } from '@/lib/auth'

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { 
  maxRetriesPerRequest: null 
})

const timerQueue = new Queue('timers', { connection })

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { duration, notifyEmails, notifyNames, webhookUrl, latitude, longitude, accuracy } = await request.json()
    
    if (!duration || !notifyEmails?.length || !notifyNames?.length) {
      return NextResponse.json(
        { error: 'Duration, emails, and names are required' },
        { status: 400 }
      )
    }

    // Validate webhook URL if provided
    if (webhookUrl && !validateWebhookUrl(webhookUrl)) {
      return NextResponse.json(
        { error: 'Invalid webhook URL. Must use HTTPS (except localhost)' },
        { status: 400 }
      )
    }
    
    const expiresAt = new Date(Date.now() + duration * 60 * 1000)
    
    // Create timer in database
    const timer = await db.timer.create({
      data: {
        userId: user.id,
        duration,
        expiresAt,
        notifyEmails,
        notifyNames,
        webhookUrl,
        latitude,
        longitude,
        accuracy,
        status: 'ACTIVE'
      }
    })
    
    // Schedule job for when timer expires
    await timerQueue.add(
      'timer-expired',
      { timerId: timer.id },
      { 
        delay: duration * 60 * 1000, // Convert minutes to milliseconds
        jobId: timer.id // Use timer ID as job ID for easy cancellation
      }
    )
    
    return NextResponse.json(timer)
    
  } catch (error) {
    console.error('Timer creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create timer' },
      { status: 500 }
    )
  }
}