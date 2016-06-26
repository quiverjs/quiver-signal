import { resolveAny } from 'quiver-util/promise'

import { safeValue } from './util'
import { subscribeGenerator } from './generator'
import { createSubscription } from './subscribe'
import {
  signalMapToValues, waitSignalMap,
  subscribeSignalMap
} from './combine'

const subscribeSignalSignalMap = (subscription, signalSignalMap) => {
  let unsubscribe = null
  const unsubscribePreviousMap = (newUnsubscribe = null) => {
    if(!unsubscribe) return

    unsubscribe()
    unsubscribe = newUnsubscribe
  }

  try {
    const signalMap = signalSignalMap.currentValue()
    unsubscribe = subscribeSignalMap(subscription, signalMap)
  } catch(err) {
    // ignore
  }

  signalSignalMap::subscribeGenerator(function*() {
    while(subscription.hasObservers()) {
      try {
        const signalMap = yield

        try {
          const valueMap = signalMapToValues(signalMap)
          subscription.sendValue(valueMap)
        } catch(err) {
          subscription.sendError(err)
        }

        const newUnsubscribe = subscribeSignalMap(subscription, signalMap)
        unsubscribePreviousMap(newUnsubscribe)
      } catch(err) {
        unsubscribePreviousMap()
        subscription.sendError(err)
      }
    }
  })
}

// flattenSignal :: Signal (Map Signal a) -> Signal Map a
export const flattenSignal = signalSignalMap => {
  const currentValue = () => {
    const signalMap = signalSignalMap.currentValue()
    return signalMapToValues(signalMap)
  }

  const waitNext = async () => {
    const nextSignalMapPromise = signalSignalMap.waitNext()

    const [err, signalMap] = signalSignalMap::safeValue()
    if(err) return nextSignalMapPromise

    return resolveAny(nextSignalMapPromise, waitSignalMap(signalMap))
  }

  const subscribe = observer => {
      const subscription = createSubscription()
      const unsubscribe =  subscription.subscribe(observer)
      subscribeSignalSignalMap(subscription, signalSignalMap)
      return unsubscribe
  }

  return {
    isQuiverSignal: true,
    currentValue,
    waitNext,
    subscribe
  }
}
