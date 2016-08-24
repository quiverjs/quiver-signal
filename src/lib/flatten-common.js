import { subscribeGenerator } from './generator'

class CompositeError extends Error {
  constructor(errorMap) {
    super('error in signal combine')
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

// csvToCv :: Container Signal v -> Container v
export const csvToCv = csv => {
  // errors :: Container error
  let errors = csv.clear()

  // values :: Container value
  let values = csv.clear()

  for(const [key, signal] of csv.entries()) {
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

// subscribeCsv :: SubscriptionSink -> Container Signal v -> ()
export const subscribeCsv = (subscriptionSink, csv) => {
  let unsubscribed = false
  const unsubscribe = () => {
    unsubscribed = true
  }

  let valueMap = csv.clear()
  let errorMap = csv.clear()

  for(let [key, signal] of csv.entries()) {
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
          updateValue(key, value)

        } catch(err) {
          updateError(key, err)
        }
      }
    })
  }

  for(let [key, signal] of csv.entries()) {
    pipeSignal(key, signal)
  }

  return unsubscribe
}

// waitCsv :: Container Signal v -> Promise ()
export const waitCsv = csv =>
  new Promise((resolve, reject) => {
    for(let signal of csv.values()) {
      signal.waitNext().then(resolve, reject)
    }
  })
