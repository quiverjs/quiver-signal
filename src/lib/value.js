import { createSubscription } from './subscribe'

export const valueSignal = (initialValue) => {
  let currentValue = initialValue
  let currentError = null

  let nextResolves = []
  const subscription = createSubscription()

  const getCurrentValue = () => {
    if(currentError) throw currentError

    return currentValue
  }

  const getCurrentError = () => {
    return currentError
  }

  const getNextValue = () =>
    new Promise(resolve => {
      nextResolves.push(resolve)
    })

  const setValue = async function(newValue) {
    await Promise.resolve()
    if(currentValue === newValue) return

    currentValue = newValue
    currentError = null

    for(let resolve of nextResolves) {
      resolve(newValue)
    }
    nextResolves = []

    subscription.sendValue(newValue)
  }

  const setError = async function(newError) {
    await Promise.resolve()
    if(currentError === newError) return

    currentValue = null
    currentError = newError

    const errorPromise = Promise.reject(newError)
    for(let resolve of nextResolves) {
      resolve(errorPromise)
    }
    nextResolves = []

    subscription.sendError(newError)
  }

  const subscribe = observer => {
    return subscription.subscribe(observer)
  }

  const signal = {
    currentValue: getCurrentValue,
    currentError: getCurrentError,
    nextValue: getNextValue,
    subscribe
  }

  const setter = {
    setValue, setError
  }

  return [signal, setter]
}
