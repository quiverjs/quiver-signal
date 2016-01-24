import './value'
import './channel'
import './map'
import './combine'
import './foldp'

process.on('unhandledRejection',
  err => console.error('unhandled rejection:', err.stack))
