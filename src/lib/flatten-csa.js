import {
  isImmutableMap, isImmutableList
} from 'quiver-util/immutable'

import { assertSignal } from './util'
import { createSubscription } from './subscribe'

import {
  csaToCv, waitCsa,
  subscribeCsa, uniqueErrorSink
} from './flatten-common'

// type S a = Signal a
// type C a = Container a
// type CS a = Container Signal a
// type SC a = Signal Container a
// flattenCsa :: Container Signal a -> Signal Container a
export const flattenCsa = (csa) => {
  if(!isImmutableMap(csa) && !isImmutableList(csa))
    throw new TypeError('entries must be immutable map/list')

  for(let signal of csa.values()) {
    assertSignal(signal)
  }

  const getCurrentValue = () =>
    csaToCv(csa)

  const waitNext = () =>
    waitCsa(csa)

  const subscribe = observer => {
    const subscription = createSubscription()
    const unsubscribe = subscription.subscribe(observer)

    subscribeCsa(uniqueErrorSink(subscription), csa)
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
