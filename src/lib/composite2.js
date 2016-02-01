import {
  ImmutableMap, isImmutableMap, isImmutableList
} from 'quiver-util/immutable'

import { assertSignal } from './util'
import { createSignal } from './value'
import { subscribeGenerator } from './generator'

const errorMapToError = errorMap => {
  const hasError = errorMap.find(err => !!err)
  if(!hasError) return null

  const error = new Error('error in signal combine')
  error.errorMap = errorMap
  return error
}

const extractValues = signalMap => {
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

  return { valueMap, errorMap }
}

export const compositeSignal = signalMap => {
  if(!isImmutableMap(signalMap) && !isImmutableList(signalMap))
    throw new TypeError('entries must be immutable map/list')

  for(let signal of signalMap.values()) {
    assertSignal(signal)
  }

  let [valueMap, errorMap] = extractValues(signalMap)

  const [resultSignal, resultSetter] = createSignal({
    initialValue: valueMap,
    initialError: errorMapToError(errorMap)
  })

  const updateValue = (key, value, error) => {
    valueMap = valueMap.set(key, value)
    errorMap = errorMap.set(key, error)

    const combinedError = errorMapToError(errorMap)
    if(combinedError) {
      resultSetter.setError(combinedError)
    } else {
      resultSetter.setValue(valueMap)
    }
  }

  const unsubscribeMap = new Map()

  const unsubscribeSignal = key => {
    const unsubscribe = unsubscribeMap.get(key)
    if(unsubscribe) {
      unsubscribe()
      unsubscribeMap.delete(key)
    }
  }

  const subscribeSignal = (key, signal) => {
    const unsubscribe = signal::subscribeGenerator(function*() {
      while(true) {
        try {
          const value = yield
          updateValue(key, value, null)
        } catch(err) {
          updateValue(key, null, err)
        }
      }
    })

    unsubscribeMap.set(key, unsubscribe)
  }

  for(let [key, signal] of signalMap.entries()) {
    subscribeSignal(key, signal)
  }

  const setSignal = (key, signal) => {
    assertSignal(signal)

    if(signalMap.get(key) === signal) return
    signalMap = signalMap.set(key, signal)

    unsubscribeSignal(key)
    subscribeSignal(key, signal)
  }

  const removeSignal = key => {
    if(!signalMap.has(key)) return

    unsubscribeSignal(key)
    signalMap = signalMap.delete(key)
  }

  const setter = {
    setSignal,
    removeSignal
  }

  return [resultSignal, setter]
}
