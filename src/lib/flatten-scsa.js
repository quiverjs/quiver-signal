import { resolveAny } from 'quiver-util/promise'

import { safeValue } from './util'
import { subscribeGenerator } from './generator'
import { createSubscription } from './subscribe'
import {
  csaToCv, waitCsa,
  subscribeCsa, uniqueErrorSink
} from './flatten-common'

// subscribeScsa :: SubscriptionSink -> Signal Container Signal a -> ()
const subscribeScsa = (subscriptionSink, scsa) => {
  let unsubscribe = null

  const unsubscribePrevious = (newUnsubscribe) => {
    if(unsubscribe) {
      unsubscribe()
    }

    unsubscribe = newUnsubscribe
  }

  try {
    // csa :: Container Signal v
    const csa = scsa.currentValue()

    unsubscribe = subscribeCsa(subscriptionSink, csa)
  } catch(err) {
    // ignore because the initial state is error state,
    // which don't need to be updated in the subscription
  }

  scsa::subscribeGenerator(function*() {
    while(subscriptionSink.hasObservers()) {
      try {
        const csa = yield

        try {
          const cv = csaToCv(csa)
          subscriptionSink.sendValue(cv)
        } catch(err) {
          subscriptionSink.sendError(err)
        }

        const newUnsubscribe = subscribeCsa(subscriptionSink, csa)
        unsubscribePrevious(newUnsubscribe)
      } catch(err) {
        unsubscribePrevious()
        subscriptionSink.sendError(err)
      }
    }
  })
}

// type C a = Container a
// type CS a = Container Signal a
// type SC a = Signal Container a
// type SCS a = Signal Container Signal a
// flattenScsa :: Signal Container Signal a -> Signal Container a
export const flattenScsa = scsa => {
  const currentValue = () => {
    const csa = scsa.currentValue()
    return csaToCv(csa)
  }

  const waitNext = async () => {
    // nextPcsa :: Promise Container Signal a
    const nextPcsa = scsa.waitNext()

    const [err, csa] = scsa::safeValue()
    if(err) return nextPcsa

    return resolveAny([nextPcsa, waitCsa(csa)])
  }

  const subscribe = observer => {
    const subscription = createSubscription()
    const unsubscribe =  subscription.subscribe(observer)
    subscribeScsa(uniqueErrorSink(subscription), scsa)
    return unsubscribe
  }

  return {
    isQuiverSignal: true,
    currentValue,
    waitNext,
    subscribe
  }
}
