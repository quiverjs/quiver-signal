import { resolveAny } from 'quiver-core/util/promise'
import { immutableMap } from 'quiver-core/util/immutable'

import { safeValue, equals } from './util'
import { valueSignal } from './value'
import {
  signalMapToValues, waitSignalMap,
  subscribeSignalMap
} from './combine'

const subscribeSignalSignalMap = (subscription, signalSignalMap) => {
  signalSignalMap.subscribeGenerator(function*() {
    let unsubscribe = null
    const unsubscribePreviousMap = (newUnsubscribe = null) => {
      if(!unsubscribe) return
      unsubscribe()
      unsubscribe = null
    }

    while(subscription.hasObservers()) {
      try {
        const signalMap = yield
        const newUnsubscribe = subscribeSignalMap(subscribeSignalMap, signalMap)
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
    const nextSignalMap = signalSignalMap.waitNext()
    const [err, signalMap] = signalSignalMap::safeValue()
    if(err) return nextSignalMap

    return resolveAny(nextSignalMap, waitSignalMap(signalMap))
  }

  const subscribe = observer => {
      const subscription = createSubscription()
      const unsubscribe =  subscription.subscribe(observer)
      subscribeSignalMap(subscription, signalMap)
      return unsubscribe
  }
}
