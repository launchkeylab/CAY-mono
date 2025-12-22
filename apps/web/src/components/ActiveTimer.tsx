'use client'

import { useState, useEffect } from 'react'

interface ActiveTimerProps {
  timerId: string
  expiresAt: string
  onCheckIn: () => void
  onCancel: () => void
}

export default function ActiveTimer({ timerId, expiresAt, onCheckIn, onCancel }: ActiveTimerProps) {
  const [timeLeft, setTimeLeft] = useState(0)
  
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime()
      const end = new Date(expiresAt).getTime()
      const diff = end - now
      return Math.max(0, Math.floor(diff / 1000))
    }
    
    setTimeLeft(calculateTimeLeft())
    
    const interval = setInterval(() => {
      const left = calculateTimeLeft()
      setTimeLeft(left)
      
      if (left === 0) {
        clearInterval(interval)
      }
    }, 1000)
    
    return () => clearInterval(interval)
  }, [expiresAt])
  
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }
  
  const isExpired = timeLeft === 0
  const isUrgent = timeLeft <= 300 // 5 minutes
  
  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6 text-center">
      <h2 className="text-xl font-semibold mb-4">
        {isExpired ? 'Timer Expired' : 'Safety Timer Active'}
      </h2>
      
      <div className={`text-6xl font-mono font-bold mb-6 ${
        isExpired ? 'text-red-500' : isUrgent ? 'text-orange-500' : 'text-green-500'
      }`}>
        {formatTime(timeLeft)}
      </div>
      
      {isExpired ? (
        <div className="space-y-4">
          <p className="text-red-600">
            Your emergency contacts have been notified.
          </p>
          <button
            onClick={onCheckIn}
            className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600"
          >
            I'm OK Now
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <button
            onClick={onCheckIn}
            className={`w-full py-4 rounded-lg font-medium text-lg ${
              isUrgent 
                ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            I'm OK
          </button>
          
          <button
            onClick={onCancel}
            className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
          >
            Cancel Timer
          </button>
          
          {isUrgent && (
            <p className="text-orange-600 text-sm">
              Less than 5 minutes remaining
            </p>
          )}
        </div>
      )}
    </div>
  )
}