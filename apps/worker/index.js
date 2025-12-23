import { Worker } from 'bullmq'
import Redis from 'ioredis'
import { db } from '@cay/database'
import dotenv from 'dotenv'
import nodemailer from 'nodemailer'

dotenv.config()

const connection = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null })

// Create email transporter (using Gmail SMTP for demo)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
})

// Webhook notification function with retry logic
async function sendWebhookNotification(timer, attempt = 1, maxAttempts = 3) {
  if (!timer.webhookUrl) return null

  const payload = {
    timerId: timer.id,
    userId: timer.userId,
    status: 'ESCALATED',
    duration: timer.duration,
    expiresAt: timer.expiresAt,
    escalatedAt: new Date(),
    location: timer.latitude && timer.longitude ? {
      latitude: timer.latitude,
      longitude: timer.longitude,
      accuracy: timer.accuracy
    } : null,
    contacts: timer.notifyEmails.map((email, index) => ({
      email,
      name: timer.notifyNames[index] || 'Contact'
    }))
  }

  try {
    const response = await fetch(timer.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CAY-Safety-Timer/1.0'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000) // 30 second timeout
    })

    const responseText = await response.text()
    
    // Log webhook attempt
    await db.webhookLog.create({
      data: {
        timerId: timer.id,
        url: timer.webhookUrl,
        status: response.status,
        response: responseText.substring(0, 1000), // Limit response size
        attempt
      }
    })

    if (!response.ok) {
      throw new Error(`Webhook returned status ${response.status}: ${responseText}`)
    }

    console.log(`Webhook sent successfully to ${timer.webhookUrl}`)
    return { success: true, status: response.status, attempt }

  } catch (error) {
    console.error(`Webhook attempt ${attempt} failed for ${timer.webhookUrl}:`, error.message)
    
    // Log failed webhook attempt
    await db.webhookLog.create({
      data: {
        timerId: timer.id,
        url: timer.webhookUrl,
        status: 0,
        error: error.message.substring(0, 1000),
        attempt
      }
    })

    // Retry logic
    if (attempt < maxAttempts) {
      const delay = Math.pow(2, attempt) * 1000 // Exponential backoff: 2s, 4s, 8s
      console.log(`Retrying webhook in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
      return sendWebhookNotification(timer, attempt + 1, maxAttempts)
    }

    return { success: false, error: error.message, attempt }
  }
}

const worker = new Worker('timers', async (job) => {
  const { timerId } = job.data
  
  console.log(`Processing timer expiration for: ${timerId}`)
  
  // Check if timer is still active (user might have checked in)
  const timer = await db.timer.findUnique({ 
    where: { id: timerId }
  })
  
  if (!timer || timer.status !== 'ACTIVE') {
    console.log(`Timer ${timerId} no longer active, skipping notification`)
    return { skipped: true, reason: `Timer status: ${timer?.status}` }
  }
  
  // Mark timer as escalated
  await db.timer.update({
    where: { id: timerId },
    data: { 
      status: 'ESCALATED',
      escalatedAt: new Date()
    }
  })
  
  // Send webhook notification (if configured)
  const webhookResult = await sendWebhookNotification(timer)
  
  // Send notification emails
  const emailPromises = timer.notifyEmails.map(async (email, index) => {
    const name = timer.notifyNames[index] || 'Contact'
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Safety Timer Alert - Check-in Missed',
      html: `
        <h2>Safety Timer Alert</h2>
        <p>Hello ${name},</p>
        <p>A safety timer has expired without confirmation.</p>
        <ul>
          <li><strong>Timer Duration:</strong> ${timer.duration} minutes</li>
          <li><strong>Expected Check-in:</strong> ${timer.expiresAt.toLocaleString()}</li>
          <li><strong>Started:</strong> ${timer.createdAt.toLocaleString()}</li>
          ${timer.latitude && timer.longitude ? `<li><strong>Last Known Location:</strong> ${timer.latitude}, ${timer.longitude}</li>` : ''}
        </ul>
        <p>Please verify their safety and well-being.</p>
        <p><em>This is an automated message from CAY Safety Timer</em></p>
      `
    }
    
    try {
      await transporter.sendMail(mailOptions)
      console.log(`Notification sent to: ${email}`)
      return { email, sent: true }
    } catch (error) {
      console.error(`Failed to send email to ${email}:`, error)
      return { email, sent: false, error: error.message }
    }
  })
  
  const emailResults = await Promise.all(emailPromises)
  
  console.log(`Timer ${timerId} escalated, notifications sent:`, emailResults)
  if (webhookResult) {
    console.log(`Webhook result:`, webhookResult)
  }
  
  return { 
    success: true, 
    timerId,
    emailResults,
    webhookResult,
    escalatedAt: new Date()
  }
}, { connection })

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully`)
})

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err)
})

console.log('Timer worker running and ready to process expired timers...')