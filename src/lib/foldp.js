import { valueSignal } from './value'
import { subscribeGenerator } from './generator'

// foldp :: Signal a -> (b -> a -> b) -> b -> Signal b
export const foldpSignal = (targetSignal, folder, acc, options={}) => {
  const { errorHandler } = options

  const [foldedSignal, setter] = valueSignal(acc)

  const raiseError = err => {
    setter.setError(err)
    throw err
  }

  const handleError = !errorHandler ? raiseError :
    err => {
      try {
        acc = errorHandler(err)
        setter.setValue(acc)
      } catch(err) {
        raiseError(err)
      }
    }

  const doFold = value => {
    acc = folder(acc, value)
    setter.setValue(acc)
  }

  // perform folding on initial value,
  // also handle error on current value
  try {
    const initialValue = targetSignal.currentValue()
    doFold(initialValue)
  } catch(err) {
    handleError(err)
  }

  targetSignal::subscribeGenerator(function*() {
    while(true) {
      try {
        const value = yield
        doFold(value)
      } catch(err) {
        handleError(err)
      }
    }
  })

  return foldedSignal
}

export const foldp = function(...args) {
  return foldpSignal(this, ...args)
}
