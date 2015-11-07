import './value'

process.on('unhandledRejection',
  err => console.error('unhandled rejection:', err.stack))
