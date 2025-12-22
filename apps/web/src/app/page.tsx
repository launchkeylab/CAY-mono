'use client'

import { useState } from 'react'
import TimerForm from '@/components/TimerForm'
import ActiveTimer from '@/components/ActiveTimer'

export default function HomePage() {
  const [activeTimer, setActiveTimer] = useState<{
    id: string
    expiresAt: string
  } | null>(null)

  const handleTimerStart = async (duration: number, emails: string[], names: string[]) => {
    try {
      const response = await fetch('/api/timers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration,
          notifyEmails: emails,
          notifyNames: names
        })
      })
      
      if (response.ok) {
        const timer = await response.json()
        setActiveTimer({
          id: timer.id,
          expiresAt: timer.expiresAt
        })
      }
    } catch (error) {
      console.error('Failed to start timer:', error)
    }
  }

  const handleCheckIn = async () => {
    if (!activeTimer) return
    
    try {
      const response = await fetch(`/api/timers/${activeTimer.id}/checkin`, {
        method: 'POST'
      })
      
      if (response.ok) {
        setActiveTimer(null)
      }
    } catch (error) {
      console.error('Failed to check in:', error)
    }
  }

  const handleCancel = async () => {
    if (!activeTimer) return
    
    try {
      const response = await fetch(`/api/timers/${activeTimer.id}/cancel`, {
        method: 'POST'
      })
      
      if (response.ok) {
        setActiveTimer(null)
      }
    } catch (error) {
      console.error('Failed to cancel timer:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <h1 className="text-3xl font-bold text-center mb-8">CAY Safety Timer</h1>
        
        {activeTimer ? (
          <ActiveTimer
            timerId={activeTimer.id}
            expiresAt={activeTimer.expiresAt}
            onCheckIn={handleCheckIn}
            onCancel={handleCancel}
          />
        ) : (
          <TimerForm onTimerStart={handleTimerStart} />
        )}
      </div>
    </div>
  )
}