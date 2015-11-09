import test from 'tape'
import { timeout } from 'quiver-util/promise'
import { asyncTest, rejected } from 'quiver-util/tape'

import { valueSignal, subscribeChannel } from '../lib'

test('signal channel test', assert => {
  assert::asyncTest('basic channel subscribe', async function(assert) {
    const [signal, setter] = valueSignal('foo')

    const channel = subscribeChannel(signal)

    setter.setValue('bar')
    setter.setValue('baz')

    const value1 = await channel.nextValue()
    assert.equal(value1, 'bar')

    setter.setValue('beer')
    await timeout(10)

    const value2 = await channel.nextValue()
    assert.equal(value2, 'baz')

    const value3 = await channel.nextValue()
    assert.equal(value3, 'beer')

    assert.end()
  })

  assert::asyncTest('error channel', async function(assert) {
    const [signal, setter] = valueSignal()

    const channel = subscribeChannel(signal)

    setter.setValue('bar')
    await timeout(10)

    setter.setError(new Error('error'))
    setter.setValue('baz')

    await timeout(10)

    const value1 = await channel.nextValue()
    assert.equal(value1, 'bar')

    await assert::rejected(channel.nextValue())

    const value2 = await channel.nextValue()
    assert.equal(value2, 'baz')

    assert.end()
  })
})
