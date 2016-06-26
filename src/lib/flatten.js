import { resolveAny } from 'quiver-util/promise'

import { safeValue } from './util'
import { subscribeGenerator } from './generator'
import { createSubscription } from './subscribe'
import {
  signalMapToValues, waitSignalMap,
  subscribeSignalMap, uniqueErrorSink
} from './combine'

const subscribeSignalSignalMap = (subscriptionSink, signalSignalMap) => {
  let unsubscribe = null
  const unsubscribePreviousMap = (newUnsubscribe = null) => {
    if(!unsubscribe) return

    unsubscribe()
    unsubscribe = newUnsubscribe
  }

  try {
    const signalMap = signalSignalMap.currentValue()
    unsubscribe = subscribeSignalMap(subscriptionSink, signalMap)
  } catch(err) {
    // ignore because the initial state is error state,
    // which don't need to be updated in the subscription
  }

  signalSignalMap::subscribeGenerator(function*() {
    while(subscriptionSink.hasObservers()) {
      try {
        const signalMap = yield

        try {
          const valueMap = signalMapToValues(signalMap)
          subscriptionSink.sendValue(valueMap)
        } catch(err) {
          subscriptionSink.sendError(err)
        }

        const newUnsubscribe = subscribeSignalMap(subscriptionSink, signalMap)
        unsubscribePreviousMap(newUnsubscribe)
      } catch(err) {
        unsubscribePreviousMap()
        subscriptionSink.sendError(err)
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
      subscribeSignalSignalMap(uniqueErrorSink(subscription), signalSignalMap)
      return unsubscribe
  }

  return {
    isQuiverSignal: true,
    currentValue,
    waitNext,
    subscribe
  }
}
