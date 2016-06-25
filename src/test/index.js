import './value'
import './channel'
import './map'
import './combine'
import './foldp'
import './flatten'

process.on('unhandledRejection', err => {
  if(err.isTestError) return

  console.error('unhandled rejection:', err.stack)
})
