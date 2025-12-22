import { Worker } from 'bullmq'
import Redis from 'ioredis'
import { db } from '@cay/database'
import dotenv from 'dotenv'
import nodemailer from 'nodemailer'

dotenv.config()

const connection = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null })

// Create email transporter (using Gmail SMTP for demo)
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
})

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
  
  const results = await Promise.all(emailPromises)
  
  console.log(`Timer ${timerId} escalated, notifications sent:`, results)
  
  return { 
    success: true, 
    timerId,
    notificationResults: results,
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