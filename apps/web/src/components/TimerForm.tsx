'use client'

import { useState } from 'react'

interface TimerFormProps {
  onTimerStart: (duration: number, emails: string[], names: string[]) => void
}

export default function TimerForm({ onTimerStart }: TimerFormProps) {
  const [duration, setDuration] = useState(30)
  const [customDuration, setCustomDuration] = useState('')
  const [contacts, setContacts] = useState([{ name: '', email: '' }])
  
  const quickOptions = [15, 30, 60, 120]
  
  const addContact = () => {
    setContacts([...contacts, { name: '', email: '' }])
  }
  
  const updateContact = (index: number, field: 'name' | 'email', value: string) => {
    const updated = [...contacts]
    updated[index][field] = value
    setContacts(updated)
  }
  
  const removeContact = (index: number) => {
    if (contacts.length > 1) {
      setContacts(contacts.filter((_, i) => i !== index))
    }
  }
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const finalDuration = duration === 0 ? parseInt(customDuration) : duration
    const validContacts = contacts.filter(c => c.name.trim() && c.email.trim())
    
    if (finalDuration > 0 && validContacts.length > 0) {
      onTimerStart(
        finalDuration,
        validContacts.map(c => c.email),
        validContacts.map(c => c.name)
      )
    }
  }
  
  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Set Safety Timer</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Duration (minutes)</label>
          
          <div className="grid grid-cols-4 gap-2 mb-2">
            {quickOptions.map(minutes => (
              <button
                key={minutes}
                type="button"
                onClick={() => setDuration(minutes)}
                className={`px-3 py-2 rounded border text-sm ${
                  duration === minutes 
                    ? 'bg-blue-500 text-white border-blue-500' 
                    : 'bg-white border-gray-300'
                }`}
              >
                {minutes}m
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDuration(0)}
              className={`px-3 py-2 rounded border text-sm ${
                duration === 0 
                  ? 'bg-blue-500 text-white border-blue-500' 
                  : 'bg-white border-gray-300'
              }`}
            >
              Custom
            </button>
            {duration === 0 && (
              <input
                type="number"
                min="1"
                value={customDuration}
                onChange={(e) => setCustomDuration(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded"
                placeholder="Minutes"
                required
              />
            )}
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Emergency Contacts</label>
          
          {contacts.map((contact, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Name"
                value={contact.name}
                onChange={(e) => updateContact(index, 'name', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded"
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={contact.email}
                onChange={(e) => updateContact(index, 'email', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded"
                required
              />
              {contacts.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeContact(index)}
                  className="px-3 py-2 bg-red-500 text-white rounded"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          
          <button
            type="button"
            onClick={addContact}
            className="text-sm text-blue-500 hover:text-blue-700"
          >
            + Add another contact
          </button>
        </div>
        
        <button
          type="submit"
          className="w-full bg-green-500 text-white py-3 rounded-lg font-medium hover:bg-green-600"
        >
          Start Timer
        </button>
      </form>
    </div>
  )
}