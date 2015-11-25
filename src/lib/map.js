import { equals } from './util'
import { createSubscription } from './subscribe'
import { subscribeGenerator } from './generator'
import { subscribeChannel } from './channel'

export const mapSignal = (signal, mapper) => {
  const subscription = createSubscription()

  let lastValue = signal.currentValue()
  let lastMappedValue = mapper(lastValue)

  const updateLastValue = value => {
    const mappedValue = mapper(value)

    lastValue = value
    lastMappedValue = mappedValue

    return mappedValue
  }

  const getCurrentValue = () => {
    const latestValue = signal.currentValue()

    if(equals(latestValue, lastValue))
      return lastMappedValue

    return updateLastValue(latestValue)
  }

  const getCurrentError = () => {
    const err = signal.currentError()
    if(err) return err

    try {
      getCurrentValue()
      return null
    } catch(err) {
      return err
    }
  }

  const getNextValue = async function() {
    let currentValue = getCurrentValue()
    const channel = subscribeChannel(signal)

    while(true) {
      const latestValue = await channel.nextValue()
      const mappedValue = mapper(latestValue)

      if(!equals(mappedValue, currentValue)) {
        channel.close()
        return mappedValue
      }

      currentValue = mappedValue
    }
  }

  let pipeRunning = false
  const pipeMap = () => {
    if(pipeRunning) return
    pipeRunning = true

    signal::subscribeGenerator(function*() {
      while(subscription.hasObservers()) {
        try {
          const value = yield

          const mapped = mapper(value)
          subscription.sendValue(mapped)
        } catch(err) {
          subscription.sendError(err)
        }
      }

      pipeRunning = false
    })
  }

  const subscribe = observer => {
    const unsubscribe = subscription.subscribe(observer)
    if(!pipeRunning) {
      pipeMap()
    }

    return unsubscribe
  }

  const mappedSignal = {
    isQuiverSignal: true,
    currentValue: getCurrentValue,
    currentError: getCurrentError,
    nextValue: getNextValue,
    subscribe
  }

  return mappedSignal
}

const maybeMapper = mapper =>
  (value=null) => {
    if(value === null) {
      return null
    } else {
      return mapper(value)
    }
  }

export const map = function(mapper) {
  return mapSignal(this, maybeMapper(mapper))
}
