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

  let sentErrorMap = null
  const sendError = err => {
    const { errorMap } = err
    if(errorMap && errorMap.equals(sentErrorMap)) return

    sentErrorMap = errorMap
    subscription.sendError(err)
  }

  const sendValue = valueMap => {
    sentErrorMap = null
    subscription.sendValue(valueMap)
  }

  const innerSink = {
    hasObservers: subscription.hasObservers,
    sendError,
    sendValue
  }

  try {
    const signalMap = signalSignalMap.currentValue()
    unsubscribe = subscribeSignalMap(innerSink, signalMap)
  } catch(err) {
    // ignore because the initial state is error state,
    // which don't need to be updated in the subscription
  }

  signalSignalMap::subscribeGenerator(function*() {
    while(subscription.hasObservers()) {
      try {
        const signalMap = yield

        try {
          const valueMap = signalMapToValues(signalMap)
          sendValue(valueMap)
        } catch(err) {
          sendError(err)
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
