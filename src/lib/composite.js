import {
  ImmutableMap, isImmutableMap, isImmutableList
} from 'quiver-util/immutable'

import { createSignal } from './value'
import { assertSignal } from './util'
import { subscribeGenerator } from './generator'

const assertSignalMap = signalMap => {
  if(!isImmutableMap(signalMap) && !isImmutableList(signalMap))
    throw new TypeError('entries must be immutable map/list')

  for(let signal of signalMap.values()) {
    assertSignal(signal)
  }
}

const compositeError = errorMap => {
  const err = compositeError = new Error('error in signal combine')
  compositeError.errorMap = errorMap
  return err
}

export const compositeSignal = (initialSignalMap) => {
  assertSignalMap(initialSignalMap)

  let currentError = null
  let errorMap = ImmutableMap()
  let valueMap = ImmutableMap()

  const setSignalValue = (key, value) => {
    valueMap = valueMap.set(key, value)

    if(currentError && errorMap.has(key)) {
      errorMap = errorMap.delete(key)
      if(errorMap.size === 0) {
        currentError = null
      } else {
        currentError = compositeError(errorMap)
      }
    }
  }

  const setSignalError = (key, err) => {
    errorMap = errorMap.set(key, err)
    valueMap = valueMap.set(key, null)
    currentError = compositeError(errorMap)
  }

  const resetSignals = () => {
    currentError = null
    errorMap = ImmutableMap()
    valueMap = ImmutableMap()
  }

  const updateSignalMap = signalMap => {
    for(let [key, signal] of signalMap.entries()) {
      try {
        const value = signal.currentValue()
        setSignalValue(key, value)
      } catch(err) {
        setSignalError(key, err)
      }
    }
  }

  updateSignalMap()

  const [flattenSignal, resultSetter] = createSignal({
    initialError: currentError,
    initialValue: valueMap
  })

  const sendUpdate = () => {
    if(currentError) {
      resultSetter.setError(currentError)
    } else {
      resultSetter.setValue(valueMap)
    }
  }

  // Note: WeakMap might be more appropriate here
  const observerSet = new Set()
  const signalKeyMap = new Map()

  const observeSignal = signal => {
    if(observerSet.has(signal)) return
    observerSet.add(signal)

    signal::subscribeGenerator(function*() {
      while(true) {
        const keys = signalKeyMap.get(signal)
        if(!keys) break

        try {
          const value = yield
          for(let key of keys) {
            setSignalValue(key, value)
          }
        } catch(err) {
          for(let key of keys) {
            setSignalError(key, err)
          }
        }

        sendUpdate()
      }

      observerSet.delete(signal)
    })
  }


  const setError = async function(err) {
    await Promise.resolve()

    signalKeyMap.clear()
    resultSetter.setError(err)
  }

  const setSignalMap = async function(signalMap) {
    await Promise.resolve()

    try {
      assertSignalMap(signalMap)
    } catch(err) {
      return setError(err)
    }

    resetSignals()
    updateSignalMap(signalMap)
    sendUpdate()

    signalKeyMap.clear()
    for(let [key, signal] of signalMap.entries()) {
      const keySet = signalKeyMap.get(signal)
      if(keySet) {
        keySet.add(key)

      } else {
        const newKeySet = new Set()
        newKeySet.add(key)
        signalKeyMap.set(newKeySet)
        observeSignal(signal)
      }
    }
  }

  const setter = {
    setError,
    setSignalMap
  }

  return [flattenSignal, setter]
}
