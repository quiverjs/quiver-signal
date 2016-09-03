import { subscribeGenerator } from './generator'

class CompositeError extends Error {
  constructor(errorMap) {
    const errorMapStr = errorMap
      .map(err => err.stack)

    super(`error in signal combine: ${errorMapStr}`)
    this.errorMap = errorMap
  }
}

export const uniqueErrorSink = subscription => {
  let sentErrorMap = null

  const sendErrorMap = errorMap => {
    if(errorMap.equals(sentErrorMap)) return

    sentErrorMap = errorMap
    subscription.sendError(new CompositeError(errorMap))
  }

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

  return {
    hasObservers: subscription.hasObservers,
    sendValue,
    sendError,
    sendErrorMap
  }
}

// csaToCv :: Container Signal a -> Container a
export const csaToCv = csa => {
  // errors :: Container error
  let errors = csa.clear()

  // values :: Container value
  let values = csa.clear()

  for(const [key, signal] of csa.entries()) {
    try {
      const value = signal.currentValue()
      values = values.set(key, value)
    } catch(err) {
      errors = errors.set(key, err)
    }
  }

  if(errors.size > 0) {
    throw new CompositeError(errors)
  }

  return values
}

// subscribeCsa :: SubscriptionSink -> Container Signal a -> ()
export const subscribeCsa = (subscriptionSink, csa) => {
  let unsubscribed = false
  const unsubscribe = () => {
    unsubscribed = true
  }

  let valueMap = csa.clear()
  let errorMap = csa.clear()

  for(let [key, signal] of csa.entries()) {
    try {
      const value = signal.currentValue()
      valueMap = valueMap.set(key, value)
      errorMap = errorMap.delete(key)

    } catch(err) {
      valueMap = valueMap.delete(key)
      errorMap = errorMap.set(key, err)
    }
  }

  const sendUpdate = () => {
    if(unsubscribed) return

    if(errorMap.size == 0) {
      subscriptionSink.sendValue(valueMap)
    } else {
      subscriptionSink.sendErrorMap(errorMap)
    }
  }

  const updateValue = (key, value) => {
    valueMap = valueMap.set(key, value)
    errorMap = errorMap.delete(key)
    sendUpdate()
  }

  const updateError = (key, error) => {
    valueMap = valueMap.delete(key)
    errorMap = errorMap.set(key, error)
    sendUpdate()
  }

  const pipeSignal = (key, signal) => {
    signal::subscribeGenerator(function*() {
      while(subscriptionSink.hasObservers() && !unsubscribed) {
        try {
          const value = yield
          if(unsubscribed) return

          updateValue(key, value)

        } catch(err) {
          updateError(key, err)
        }
      }
    })
  }

  for(let [key, signal] of csa.entries()) {
    pipeSignal(key, signal)
  }

  return unsubscribe
}

// waitCsa :: Container Signal a -> Promise ()
export const waitCsa = csa =>
  new Promise((resolve, reject) => {
    for(let signal of csa.values()) {
      signal.waitNext().then(resolve, reject)
    }
  })
