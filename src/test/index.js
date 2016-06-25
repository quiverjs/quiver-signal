import './value'
import './channel'
import './map'
import './combine'
import './foldp'

process.on('unhandledRejection', err => {
  if(err.isTestError) return

  console.error('unhandled rejection:', err.stack)
})
