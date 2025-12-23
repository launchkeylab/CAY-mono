#!/usr/bin/env node

// Simple webhook test server to verify our implementation
const http = require('http')

const server = http.createServer((req, res) => {
  if (req.method === 'POST') {
    let body = ''
    req.on('data', chunk => {
      body += chunk.toString()
    })
    
    req.on('end', () => {
      console.log('Webhook received!')
      console.log('Headers:', req.headers)
      console.log('Body:', body)
      
      try {
        const data = JSON.parse(body)
        console.log('Parsed data:', {
          timerId: data.timerId,
          userId: data.userId,
          status: data.status,
          duration: data.duration,
          hasLocation: !!data.location,
          contactCount: data.contacts?.length || 0
        })
        
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ 
          success: true, 
          message: 'Webhook received successfully',
          timestamp: new Date().toISOString()
        }))
      } catch (error) {
        console.error('Error parsing webhook data:', error)
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid JSON' }))
      }
    })
  } else {
    res.writeHead(404)
    res.end('Not found')
  }
})

const port = process.env.WEBHOOK_PORT || 3001
server.listen(port, () => {
  console.log(`🪝 Webhook test server running on port ${port}`)
  console.log(`📝 Use this URL for testing: http://localhost:${port}`)
  console.log('✅ Ready to receive webhook notifications from CAY timer system')
})

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down webhook test server...')
  server.close(() => {
    process.exit(0)
  })
})