import {
  isImmutableMap, isImmutableList
} from 'quiver-util/immutable'

import { assertSignal } from './util'
import { subscribeGenerator } from './generator'
import { createSubscription } from './subscribe'

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

export const signalMapToValues = signalMap => {
  let errors = signalMap.clear()
  let values = signalMap.clear()

  for(const [key, signal] of signalMap.entries()) {
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

export const subscribeSignalMap = (subscriptionSink, signalMap) => {
  let unsubscribed = false
  const unsubscribe = () => {
    unsubscribed = true
  }

  let valueMap = signalMap.clear()
  let errorMap = signalMap.clear()

  for(let [key, signal] of signalMap.entries()) {
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

  for(let [key, signal] of signalMap.entries()) {
    pipeSignal(key, signal)
  }

  return unsubscribe
}

export const waitSignalMap = signalMap =>
  new Promise(resolve => {
    for(let signal of signalMap.values()) {
      signal.waitNext().then(resolve, resolve)
    }
  })

export const combineSignals = (signalMap) => {
  if(!isImmutableMap(signalMap) && !isImmutableList(signalMap))
    throw new TypeError('entries must be immutable map/list')

  for(let signal of signalMap.values()) {
    assertSignal(signal)
  }

  const getCurrentValue = () =>
    signalMapToValues(signalMap)

  const waitNext = () =>
    waitSignalMap(signalMap)

  const subscribe = observer => {
      const subscription = createSubscription()
      const unsubscribe = subscription.subscribe(observer)

      subscribeSignalMap(uniqueErrorSink(subscription), signalMap)
      return unsubscribe
  }

  const combinedSignal = {
    isQuiverSignal: true,
    currentValue: getCurrentValue,
    waitNext,
    subscribe
  }

  return combinedSignal
}
