import { assertFunction } from 'quiver-util/assert'

import { assertSignal } from './util'
import { valueSignal } from './value'
import { subscribeGenerator } from './generator'

// foldp :: Signal a -> (b -> a -> b) -> b -> Signal b
export const foldpSignal = (targetSignal, folder, acc) => {
  assertSignal(targetSignal)
  assertFunction(folder)

  const [foldedSignal, setter] = valueSignal(acc)

  const doFold = value => {
    try {
      acc = folder(acc, value)
      setter.setValue(acc)
    } catch(err) {
      setter.setError(err)
    }
  }

  const initialValue = targetSignal.currentValue()
  doFold(initialValue)

  targetSignal::subscribeGenerator(function*() {
    while(true) {
      let value
      try {
        value = yield
      } catch(err) {
        setter.setError(err)
        return
      }

      try {
        acc = folder(acc, value)
        setter.setValue(acc)
      } catch(err) {
        setter.setError(err)
        return
      }
    }
  })

  return foldedSignal
}

export const foldp = function(...args) {
  return foldpSignal(this, ...args)
}
