import { subscribeGenerator } from './generator'

export const listenEvent = (eventSignal, listener) =>
  eventSignal::subscribeGenerator(function*() {
    while(true) {
      try {
        const ev = yield
        if(ev !== null && ev !== undefined) {
          listener(ev)
        }

      } catch(err) {
        Promise.reject(err)
      }
    }
  })

export const listen = function(listener) {
  return listenEvent(this, listener)
}
