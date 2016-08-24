import './channel'
import './error'
import './event'
import './flatten-csa'
import './flatten-scsa'
import './foldp'
import './map'
import './value'

process.on('unhandledRejection', err => {
  console.error('unhandled rejection:', err.stack)
})
