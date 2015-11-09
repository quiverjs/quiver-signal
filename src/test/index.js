import './value'
import './channel'

process.on('unhandledRejection',
  err => console.error('unhandled rejection:', err.stack))
