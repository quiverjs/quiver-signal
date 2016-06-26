import { subscribeGenerator } from './generator'
import { managedSubscription } from './subscribe'

export const mapSignal = (targetSignal, mapper) => {
  const getCurrentValue = () => {
    const targetValue = targetSignal.currentValue()
    return mapper(targetValue)
  }

  const subscribe = managedSubscription(subscription => {
    targetSignal::subscribeGenerator(function*() {
      while(subscription.hasObservers()) {
        try {
          const value = yield

          const mapped = mapper(value)
          subscription.sendValue(mapped)
        } catch(err) {
          subscription.sendError(err)
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

const maybeMapper = mapper =>
  (value=null) => {
    if(value === null) {
      return null
    } else {
      return mapper(value)
    }
  }

export const map = function(mapper) {
  return mapSignal(this, mapper)
}

export const maybeMap = function(mapper) {
  return mapSignal(this, maybeMapper(mapper))
}
