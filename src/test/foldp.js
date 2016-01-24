import test from 'tape'
import { timeout } from 'quiver-util/promise'
import { asyncTest, rejected } from 'quiver-util/tape'

import { valueSignal, subscribeChannel } from '../lib'
import { foldp } from '../lib/method'

test('foldp signal test', assert => {
  assert::asyncTest('sum signal', async function(assert) {
    const [signal, setter] = valueSignal(1)

    const sumSignal = signal::foldp(
      (total, value) => (total + value),
      0)

    assert.equal(sumSignal.currentValue(), 0)

    const channel = subscribeChannel(sumSignal)

    setter.setValue(2)
    setter.setValue(3)
    setter.setValue(4)

    assert.equal(await channel.nextValue(), 1)
    assert.equal(await channel.nextValue(), 3)
    assert.equal(await channel.nextValue(), 6)
    assert.equal(await channel.nextValue(), 10)

    assert.end()
  })

  assert::asyncTest('foldp error', async function(assert) {
    const [signal, setter] = valueSignal(1)

    const sumSignal = signal::foldp(
      (total, value) => (total + value),
      0)

    assert.equal(sumSignal.currentValue(), 0)

    const channel = subscribeChannel(sumSignal)

    setter.setValue(2)
    setter.setError(new Error('test error'))
    setter.setValue(3)
    setter.setValue(4)

    assert.equal(await channel.nextValue(), 1)
    assert.equal(await channel.nextValue(), 3)

    await assert::rejected(channel.nextValue())

    assert.throws(() => sumSignal.currentValue())

    assert.end()
  })

  assert::asyncTest('foldp error recovery', async function(assert) {
    const [signal, setter] = valueSignal(1)

    const sumSignal = signal::foldp(
      (total, value) => (total + value),
      0, {
        errorHandler(err) {
          return 0
        }
      })

    assert.equal(sumSignal.currentValue(), 0)

    const channel = subscribeChannel(sumSignal)

    setter.setValue(2)
    setter.setError(new Error('test error'))
    setter.setValue(3)
    setter.setValue(4)

    assert.equal(await channel.nextValue(), 1)
    assert.equal(await channel.nextValue(), 3)
    assert.equal(await channel.nextValue(), 0)
    assert.equal(await channel.nextValue(), 3)
    assert.equal(await channel.nextValue(), 7)

    assert.equal(sumSignal.currentValue(), 7)

    assert.end()
  })

})
