import './value'
import './channel'
import './map'
import './combine'

process.on('unhandledRejection',
  err => console.error('unhandled rejection:', err.stack))
