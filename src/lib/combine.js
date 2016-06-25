import {
  ImmutableMap, isImmutableMap, isImmutableList
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

const errorMapToError = errorMap => {
  const hasError = errorMap.find(err => !!err)
  if(!hasError) return null

  return new CompositeError(errorMap)
}

export const signalMapToValues = signalMap => {
  let errors = ImmutableMap()
  let values = ImmutableMap()

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

export const subscribeSignalMap = (subscription, signalMap) => {
  let valueMap = ImmutableMap()
  let errorMap = ImmutableMap()
  let sentError = null

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

  const updateValue = (key, value, error) => {
    if(error) {
      valueMap = valueMap.delete(key)
      errorMap = errorMap.set(key, error)
    } else {
      valueMap = valueMap.set(key, value)
      errorMap = errorMap.delete(key)
    }

    if(errorMap.size == 0) {
      sentError = null
      subscription.sendValue(valueMap)
    } else if(!errorMap.equals(sentError)) {
      sentError = errorMap
      subscription.sendError(new CompositeError(errorMap))
    }
  }

  const pipeSignal = (key, signal) => {
    signal::subscribeGenerator(function*() {
      while(subscription.hasObservers()) {
        try {
          const value = yield
          updateValue(key, value, null)
        } catch(err) {
          updateValue(key, null, err)
        }
      }
    })
  }

  for(let [key, signal] of signalMap.entries()) {
    pipeSignal(key, signal)
  }
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
      subscribeSignalMap(subscription, signalMap)
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
