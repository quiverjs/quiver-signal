import { valueSignal } from './value'

export const eventSignal = () => {
  const [signal, setter] = valueSignal(null)

  const eventHandler = ev => {
    setter.setValue(ev)
    setter.setValue(null)
  }

  return [signal, eventHandler]
}

export const unitEventSignal = () => {
  [signal, eventHandler] = eventSignal()

  unitEventHandler = () => eventHandler(true)

  return [signal, unitEventHandler]
}
