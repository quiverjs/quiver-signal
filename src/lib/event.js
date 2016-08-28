import { valueSignal } from './value'

export const eventSignal = () => {
  const [signal, setter] = valueSignal(null)

  const emitter = ev => {
    setter.setValue(ev)
    setter.setValue(null)
  }

  signal.isQuiverEventSignal = true

  return [signal, emitter]
}

export const unitEventSignal = () => {
  const [signal, emitter] = eventSignal()

  const unitEmitter = () => emitter(true)

  return [signal, unitEmitter]
}
