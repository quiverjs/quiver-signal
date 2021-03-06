import { methodfy } from 'quiver-util/function'
import { generatorObserver } from './generator'

const valueResolver = value =>
  (resolve) => resolve(value)

const errorResolver = error =>
  (resolve, reject) => reject(error)

export const subscribeChannel = signal => {
  let isClosed = false
  let pendingResolve = null

  let resolvers = []

  const nextValue = () =>
    new Promise((resolve, reject) => {
      if(isClosed)
        throw new Error('channel closed')

      if(pendingResolve)
        throw new Error('previous call to nextValue has not been resolved')

      if(resolvers.length > 0) {
        const resolver = resolvers.shift()
        resolver(resolve, reject)
      } else {
        pendingResolve = [ resolve, reject ]
      }
    })

  const observer = generatorObserver(function*() {
    while(!isClosed) {
      let resolver
      try {
        const value = yield
        resolver = valueResolver(value)
      } catch(err) {
        resolver = errorResolver(err)
      }

      if(isClosed) return

      if(pendingResolve) {
        resolver(...pendingResolve)
        pendingResolve = null

      } else {
        resolvers.push(resolver)
      }
    }
  })

  const unsubscribe = signal.subscribe(observer)
  const close = () => {
    if(isClosed) return
    isClosed = true
    resolvers = []
    unsubscribe()

    if(pendingResolve) {
      const [, reject] = pendingResolve
      reject(new Error('channel closed'))
      pendingResolve = null
    }
  }

  const channel = {
    nextValue,
    close
  }

  return channel
}

export const subscribeChannelMethod = methodfy(subscribeChannel)
