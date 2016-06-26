import { subscribeGenerator } from './generator'
import { managedSubscription } from './subscribe'

export const handleSignalError = (targetSignal, errorHandler) => {
  const getCurrentValue = () => {
    try {
      const value = targetSignal.currentValue()
      return value
    } catch(err) {
      return errorHandler(err)
    }
  }

  const subscribe = managedSubscription(subscription => {
    targetSignal::subscribeGenerator(function*() {
      while(subscription.hasObservers()) {
        try {
          const value = yield
          subscription.sendValue(value)
        } catch(err) {
          try {
            const recovered = errorHandler(err)
            subscription.sendValue(recovered)
          } catch(err) {
            subscription.sendError(err)
          }
        }
      }
    })
  })

  const mappedSignal = {
    isQuiverSignal: true,
    currentValue: getCurrentValue,
    waitNext: targetSignal.waitNext,
    subscribe
  }

  return mappedSignal
}

export const handleError = function(errorHandler) {
  return handleSignalError(this, errorHandler)
}
