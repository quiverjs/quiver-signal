import {
  ImmutableMap, isImmutableMap, isImmutableList
} from 'quiver-util/immutable'

import { assertSignal } from './util'
import { subscribeGenerator } from './generator'
import { managedSubscription } from './subscribe'

const errorMapToError = errorMap => {
  const hasError = errorMap.find(err => !!err)
  if(!hasError) return null

  const error = new Error('error in signal combine')
  error.errorMap = errorMap
  return error
}

export const combineSignals = (signalMap) => {
  if(!isImmutableMap(signalMap) && !isImmutableList(signalMap))
    throw new TypeError('entries must be immutable map/list')

  for(let signal of signalMap.values()) {
    assertSignal(signal)
  }

  const getCurrentValue = () =>
    signalMap.map(signal =>
      signal.currentValue())

  const waitNext = () =>
    new Promise(resolve => {
      for(let signal of signalMap.values()) {
        signal.waitNext().then(resolve)
      }
    })

  const subscribe = managedSubscription(subscription => {
    let valueMap = ImmutableMap()
    let errorMap = ImmutableMap()

    for(let [key, signal] of signalMap.entries()) {
      try {
        const value = signal.currentValue()
        valueMap = valueMap.set(key, value)
        errorMap = errorMap.set(key, null)

      } catch(err) {
        valueMap = valueMap.set(key, null)
        errorMap = errorMap.set(key, err)
      }
    }

    const updateValue = (key, value, error) => {
      valueMap = valueMap.set(key, value)
      errorMap = errorMap.set(key, error)

      const combinedError = errorMapToError(errorMap)
      if(combinedError) {
        subscription.sendError(combinedError)
      } else {
        subscription.sendValue(valueMap)
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
  })

  const combinedSignal = {
    isQuiverSignal: true,
    currentValue: getCurrentValue,
    waitNext,
    subscribe
  }

  return combinedSignal
}
