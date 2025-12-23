'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import TimerForm from '@/components/TimerForm'
import ActiveTimer from '@/components/ActiveTimer'

export default function TimerPage() {
  const [activeTimer, setActiveTimer] = useState<{
    id: string
    expiresAt: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkForActiveTimer = async () => {
      try {
        const response = await fetch('/api/timers')
        if (response.ok) {
          const timer = await response.json()
          if (timer) {
            setActiveTimer({
              id: timer.id,
              expiresAt: timer.expiresAt
            })
          }
        }
      } catch (error) {
        console.error('Failed to check for active timer:', error)
      } finally {
        setLoading(false)
      }
    }

    checkForActiveTimer()
  }, [])

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
      } else {
        const errorData = await response.json()
        console.error('Failed to start timer:', errorData.error)
        alert(errorData.error || 'Failed to start timer')
      }
    } catch (error) {
      console.error('Failed to start timer:', error)
      alert('Failed to start timer')
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
        // Replicate auth navigation pattern for consistent routing
        router.refresh()
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
        // Replicate auth navigation pattern for consistent routing
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to cancel timer:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg text-center">
          <h1 className="text-3xl font-bold mb-8">CAY Safety Timer</h1>
          <div className="bg-white rounded-lg shadow-md p-8">
            <p className="text-gray-600">Checking for active timer...</p>
          </div>
        </div>
      </div>
    )
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