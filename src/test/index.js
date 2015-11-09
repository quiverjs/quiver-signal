import './value'
import './channel'
import './map'

process.on('unhandledRejection',
  err => console.error('unhandled rejection:', err.stack))
