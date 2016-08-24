import { resolveAny } from 'quiver-util/promise'

import { safeValue } from './util'
import { subscribeGenerator } from './generator'
import { createSubscription } from './subscribe'
import {
  csvToCv, waitCsv,
  subscribeCsv, uniqueErrorSink
} from './flatten-common'

// subscribeScsv :: SubscriptionSink -> Signal Container Signal v -> ()
const subscribeScsv = (subscriptionSink, scsv) => {
  let unsubscribe = null

  const unsubscribePrevious = (newUnsubscribe) => {
    if(unsubscribe) {
      unsubscribe()
    }

    unsubscribe = newUnsubscribe
  }

  try {
    // csv :: Container Signal v
    const csv = scsv.currentValue()

    unsubscribe = subscribeCsv(subscriptionSink, csv)
  } catch(err) {
    // ignore because the initial state is error state,
    // which don't need to be updated in the subscription
  }

  scsv::subscribeGenerator(function*() {
    while(subscriptionSink.hasObservers()) {
      try {
        const csv = yield

        try {
          const cv = csvToCv(csv)
          subscriptionSink.sendValue(cv)
        } catch(err) {
          subscriptionSink.sendError(err)
        }

        const newUnsubscribe = subscribeCsv(subscriptionSink, csv)
        unsubscribePrevious(newUnsubscribe)
      } catch(err) {
        unsubscribePrevious()
        subscriptionSink.sendError(err)
      }
    }
  })
}

// type C v = Container v
// type CS v = Container Signal v
// type SC v = Signal Container v
// type SCS v = Signal Container Signal v
// flattenScsv :: Signal Container Signal v -> Signal Container v
export const flattenScsv = scsv => {
  const currentValue = () => {
    const csv = scsv.currentValue()
    return csvToCv(csv)
  }

  const waitNext = async () => {
    // nextPcsv :: Promise CS v
    const nextPcsv = scsv.waitNext()

    const [err, csv] = scsv::safeValue()
    if(err) return nextPcsv

    return resolveAny([nextPcsv, waitCsv(csv)])
  }

  const subscribe = observer => {
    const subscription = createSubscription()
    const unsubscribe =  subscription.subscribe(observer)
    subscribeScsv(uniqueErrorSink(subscription), scsv)
    return unsubscribe
  }

  return {
    isQuiverSignal: true,
    currentValue,
    waitNext,
    subscribe
  }
}
