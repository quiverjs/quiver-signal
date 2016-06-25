import { resolveAny } from 'quiver-core/util/promise'
import { immutableMap } from 'quiver-core/util/immutable'

import { valueSignal } from './value'
import { safeValue, equals } from './util'
import { subscribeGenerator } from './generator'
import {
  signalMapToValues, waitSignalMap,
  subscribeSignalMap
} from './combine'

const subscribeSignalSignalMap = (subscription, signalSignalMap) => {
  signalSignalMap::subscribeGenerator(function*() {
    let unsubscribe = null
    const unsubscribePreviousMap = (newUnsubscribe = null) => {
      if(!unsubscribe) return
      unsubscribe()
      unsubscribe = null
    }

    while(subscription.hasObservers()) {
      try {
        const signalMap = yield
        const newUnsubscribe = subscribeSignalMap(signalMap, signalMap)
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
  const getCurrentValue = () => {
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
      subscribeSignalMap(subscription, signalMap)
      return unsubscribe
  }
}
