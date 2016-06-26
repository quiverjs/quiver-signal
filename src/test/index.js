import './channel'
import './combine'
import './error'
import './flatten'
import './foldp'
import './map'
import './value'

process.on('unhandledRejection', err => {
  console.error('unhandled rejection:', err.stack)
})
