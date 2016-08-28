import { resolveAny } from 'quiver-util/promise'

import { safeValue, assertSignal } from './util'
import { subscribeGenerator } from './generator'
import { createSubscription } from './subscribe'

const subscribeSignal = (subscriptionSink, signal) => {
  let unsubscribed = false
  const unsubscribe = () => {
    unsubscribed = true
  }

  signal::subscribeGenerator(function*() {
    while(subscriptionSink.hasObservers() && !unsubscribed) {
      try {
        const value = yield
        if(unsubscribed) return
        subscriptionSink.sendValue(value)

      } catch(err) {
        subscriptionSink.sendError(err)
      }
    }
  })

  return unsubscribe
}

const subscribeSsa = (subscriptionSink, ssa) => {
  let unsubscribe = null

  const unsubscribePrevious = (newUnsubscribe) => {
    if(unsubscribe) {
      unsubscribe()
    }

    unsubscribe = newUnsubscribe
  }

  try {
    const signal = ssa.currentValue()
    if(signal) {
      unsubscribe = subscribeSignal(subscriptionSink, signal)
    }
  } catch(err) {
    // ignore because the initial state is error state,
    // which don't need to be updated in the subscription
  }

  ssa::subscribeGenerator(function*() {
    while(subscriptionSink.hasObservers()) {
      try {
        const signal = yield

        if(!signal) {
          subscriptionSink.sendValue(null)
          unsubscribePrevious()

        } else {
          try {
            assertSignal(signal)
            const value = signal.currentValue()
            subscriptionSink.sendValue(value)
          } catch(err) {
            subscriptionSink.sendError(err)
          }

          const newUnsubscribe = subscribeSignal(subscriptionSink, signal)
          unsubscribePrevious(newUnsubscribe)
        }
      } catch(err) {
        unsubscribePrevious()
        subscriptionSink.sendError(err)
      }
    }
  })
}

// flattenSsa :: Signal Signal a -> Signal a
export const flattenSsa = ssa => {
  assertSignal(ssa)

  const currentValue = () => {
    const signal = ssa.currentValue()
    if(!signal) return null

    assertSignal(signal)
    return signal.currentValue()
  }

  const waitNext = () => {
    const nextSignalPromise = ssa.waitNext()

    const [err, signal] = ssa::safeValue()
    if(err || !signal) return nextSignalPromise

    assertSignal(signal)
    return resolveAny([nextSignalPromise, signal.waitNext()])
  }

  const subscribe = observer => {
    const subscription = createSubscription()
    const unsubscribe =  subscription.subscribe(observer)
    subscribeSsa(subscription, ssa)
    return unsubscribe
  }

  return {
    currentValue,
    waitNext,
    subscribe
  }
}
