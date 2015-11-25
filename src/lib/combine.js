import {
  isImmutableMap, isImmutableList
} from 'quiver-util/immutable'

import { assertSignal } from './util'
import { createSubscription } from './subscribe'
import { subscribeGenerator } from './generator'
import { subscribeChannel } from './channel'

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

  const subscription = createSubscription()

  const getCurrentValue = () =>
    signalMap.map(signal =>
      signal.currentValue())

  const getCurrentError = () => {
    const errorMap = signalMap.map(signal =>
      signal.currentError())

    return errorMapToError(errorMap)
  }

  const getNextValue = async function() {
    const currentValue = getCurrentValue()

    return new Promise((resolve, reject) => {
      for(let [key, signal] of signalMap.entries()) {
        signal.nextValue()
        .then(value => {
          const newValue = currentValue.set(key, value)
          resolve(newValue)
        }, reject)
      }
    })
  }

  let pipeRunning = false
  const pipeCombine = () => {
    let running = true

    let valueMap = signalMap.map(signal => {
      try {
        return signal.currentValue()
      } catch(err) {
        return null
      }
    })

    let errorMap = signalMap.map(signal =>
      signal.currentError())

    const channelMap = signalMap.map(subscribeChannel)

    const closePipe = () => {
      if(!running) return
      running = false
      let pipeRunning = false

      for(let channel of channelMap.values()) {
        channel.close()
      }
    }

    const updateValue = (key, value, error) => {
      if(!running) return

      valueMap = valueMap.set(key, value)
      errorMap = errorMap.set(key, error)

      const combinedError = errorMapToError(errorMap)
      if(combinedError) {
        subscription.sendError(combinedError)
      } else {
        subscription.sendValue(valueMap)
      }
    }

    const pipeChannel = async function(key, channel) {
      while(running) {
        if(!subscription.hasObservers())
          return closePipe()

        try {
          const value = await channel.nextValue()
          updateValue(key, value, null)
        } catch(err) {
          updateValue(key, null, err)
        }
      }
    }

    for(let [key, channel] of channelMap.entries()) {
      pipeChannel(key, channel)
    }
  }

  const subscribe = observer => {
    const unsubscribe = subscription.subscribe(observer)
    if(!pipeRunning) {
      pipeCombine()
    }

    return unsubscribe
  }

  const combinedSignal = {
    isQuiverSignal: true,
    currentValue: getCurrentValue,
    currentError: getCurrentError,
    nextValue: getNextValue,
    subscribe
  }

  return combinedSignal
}
