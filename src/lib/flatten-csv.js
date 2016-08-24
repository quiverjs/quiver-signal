import {
  isImmutableMap, isImmutableList
} from 'quiver-util/immutable'

import { assertSignal } from './util'
import { createSubscription } from './subscribe'

import {
  csvToCv, waitCsv,
  subscribeCsv, uniqueErrorSink
} from './flatten-common'

// type S v = Signal v
// type C v = Container v
// type CS v = Container Signal v
// type SC v = Signal Container v
// combineSignals :: Container Signal v -> Signal Container v
export const flattenCsv = (csv) => {
  if(!isImmutableMap(csv) && !isImmutableList(csv))
    throw new TypeError('entries must be immutable map/list')

  for(let signal of csv.values()) {
    assertSignal(signal)
  }

  const getCurrentValue = () =>
    csvToCv(csv)

  const waitNext = () =>
    waitCsv(csv)

  const subscribe = observer => {
    const subscription = createSubscription()
    const unsubscribe = subscription.subscribe(observer)

    subscribeCsv(uniqueErrorSink(subscription), csv)
    return unsubscribe
  }

  const flattenedSignal = {
    isQuiverSignal: true,
    currentValue: getCurrentValue,
    waitNext,
    subscribe
  }

  return flattenedSignal
}
