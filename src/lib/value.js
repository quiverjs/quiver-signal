import { equals } from './util'
import { createSubscription } from './subscribe'

export const valueSignal = (initialValue) => {
  let currentValue = initialValue
  let currentError = null

  let nextResolvers = []
  const subscription = createSubscription()

  const getCurrentValue = () => {
    if(currentError) throw currentError

    return currentValue
  }

  const waitNext = () =>
    new Promise(resolve => {
      nextResolvers.push(resolve)
    })

  const setValue = async function(newValue) {
    await Promise.resolve()
    if(equals(currentValue, newValue)) return

    currentValue = newValue
    currentError = null

    for(let resolver of nextResolvers) {
      resolver()
    }
    nextResolvers = []

    subscription.sendValue(newValue)
  }

  const setError = async function(newError) {
    await Promise.resolve()
    if(currentError === newError) return

    currentValue = null
    currentError = newError

    for(let resolver of nextResolvers) {
      resolver()
    }
    nextResolvers = []

    subscription.sendError(newError)
  }

  const subscribe = observer => {
    return subscription.subscribe(observer)
  }

  const signal = {
    isQuiverSignal: true,
    currentValue: getCurrentValue,
    waitNext,
    subscribe
  }

  const setter = {
    setValue, setError
  }

  return [signal, setter]
}
