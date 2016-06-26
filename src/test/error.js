import test from 'tape'
import { timeout } from 'quiver-util/promise'
import { asyncTest, rejected } from 'quiver-util/tape'

import { valueSignal, subscribeChannel } from '../lib'
import { map, handleError } from '../lib/method'

test('error recovery test', assert => {
  assert::asyncTest('basic error recovery', async assert => {
    const [signal, setter] = valueSignal('foo')
    const safeSignal = signal::handleError(err => 'recovered')

    const channel = subscribeChannel(safeSignal)

    setter.setValue('bar')
    setter.setError('signal error')
    setter.setValue('baz')

    assert.equal(await channel.nextValue(), 'bar')
    assert.equal(await channel.nextValue(), 'recovered')
    assert.equal(await channel.nextValue(), 'baz')

    assert.end()
  })

  assert::asyncTest('error handling with mapper', async assert => {
    const [signal, setter] = valueSignal('foo')

    const mappedSignal = signal
      ::handleError(err => 'source recovered')
      ::map(str => str.toUpperCase())
      ::handleError(err => 'mapper recovered')

    const channel = subscribeChannel(mappedSignal)

    setter.setValue('food')
    setter.setError('signal error')
    setter.setValue('bar')

    // send non string to raise mapper error
    setter.setValue({})

    assert.equal(await channel.nextValue(), 'FOOD')
    assert.equal(await channel.nextValue(), 'SOURCE RECOVERED')
    assert.equal(await channel.nextValue(), 'BAR')
    assert.equal(await channel.nextValue(), 'mapper recovered')

    assert.equal(mappedSignal.currentValue(), 'mapper recovered')

    setter.setValue('baz')
    assert.equal(await channel.nextValue(), 'BAZ')

    assert.end()
  })
})
