import { valueSignal } from './value'
import { subscribeGenerator } from './generator'
import { subscribeChannel } from './channel'

// foldp :: Signal a -> (b -> a -> b) -> b -> Signal b
export const foldpSignal = (targetSignal, folder, acc, errorHandler) => {
  const [foldedSignal, setter] = valueSignal(acc)

  const raiseError = err => {
    setter.setError(err)
    throw err
  }

  const recoverError = err => {
    try {
      acc = errorHandler(err, acc)
      setter.setValue(acc)
    } catch(err) {
      raiseError(err)
    }
  }

  const handleError = errorHandler ? recoverError : raiseError

  const doFold = value => {
    try {
      acc = folder(acc, value)
      setter.setValue(acc)
    } catch(err) {
      raiseError(err)
    }
  }

  ;(() => {
    let initialValue
    try {
      initialValue = targetSignal.currentValue()
    } catch(err) {
      handleError(err)
      return
    }

    doFold(initialValue)
  })()

  targetSignal::subscribeGenerator(function*() {
    while(true) {
      let value
      try {
        value = yield
      } catch(err) {
        handleError(err)
        continue
      }

      doFold(value)
    }
  })

  return foldedSignal
}

export const foldp = function(...args) {
  return foldpSignal(this, ...args)
}
