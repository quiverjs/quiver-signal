export const assertSignal = signal => {
  if(!signal.isQuiverSignal)
    throw new TypeError('object must be a quiver signal')
}

export const safeValue = function() {
  try {
    const value = this.currentValue()
    return [null, value]
  } catch(err) {
    return [err, null]
  }
}

export const equals = (value1, value2) => {
  if(value1 === value2)
    return true

  if(value1 && value1.equals)
    return value1.equals(value2)

  return false
}

export const wrapCallOnce = fn => {
  let called = false

  return (...args) => {
    if(called) return

    called = true
    return fn(...args)
  }
}
