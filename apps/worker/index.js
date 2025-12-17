import { Worker } from 'bullmq'
import Redis from 'ioredis'
import { db } from '@cay/database'
import dotenv from 'dotenv'

dotenv.config()

const connection = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null })

const worker = new Worker('timers', async (job) => {
  const { timerId } = job.data
  const timer = await db.timer.findUnique({ where: { id: timerId }, include: { user: true } })
  if (!timer || timer.status !== 'ACTIVE') return { skipped: true }
  console.log(`Timer ${timerId} expired, sending to:`, timer.notifyEmails)
  return { success: true }
}, { connection })

console.log('Worker running')