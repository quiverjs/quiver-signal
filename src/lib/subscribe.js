import { equals, wrapCallOnce } from './util'

export const createSubscription = () => {
  const observers = new Set()

  const hasObservers = () => {
    return observers.size > 0
  }

  const subscribe = observer => {
    observers.add(observer)

    const unsubscribe = wrapCallOnce(() => {
      observers.delete(observer)

      if(observer.return) observer.return()
    })

    return unsubscribe
  }

  const sendValueToObserver = async function(observer, value) {
    await Promise.resolve()
    if(!observers.has(observer)) return

    try {
      const { done } = observer.next(value)
      if(done) observers.delete(observer)

    } catch(err) {
      observers.delete(observer)
      throw err
    }
  }

  const sendErrorToObserver = async function(observer, error) {
    if(!observer.throw) return
    await Promise.resolve()
    if(!observers.has(observer)) return

    try {
      const { done } = observer.throw(error)
      if(done) observers.delete(observer)

    } catch(err) {
      observers.delete(observer)
      throw err
    }
  }

  const sendValue = value => {
    for(let observer of observers) {
      sendValueToObserver(observer, value)
    }
  }

  const sendError = error => {
    for(let observer of observers) {
      sendErrorToObserver(observer, error)
    }
  }

  return {
    subscribe,
    hasObservers,
    sendValue,
    sendError
  }
}

export const managedSubscription = runProducer => {
  let subscription = null

  const subscribe = observer => {
    if(subscription && subscription.hasObservers()) {
      return subscription.subscribe(observer)
    }

    subscription = createSubscription()
    const unsubscribe = subscription.subscribe(observer)

    const sink = {
      hasObservers: subscription.hasObservers,
      sendValue: subscription.sendValue,
      sendError: subscription.sendError
    }

    runProducer(sink)
    return unsubscribe
  }

  return subscribe
}
