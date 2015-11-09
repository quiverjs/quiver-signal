export const assertSignal = signal => {
  if(!signal.isQuiverSignal)
    throw new TypeError('object must be a quiver signal')
}
