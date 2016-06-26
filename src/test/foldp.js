import test from 'tape'
import { asyncTest, rejected } from 'quiver-util/tape'

import { valueSignal, subscribeChannel } from '../lib'
import { foldp, handleError } from '../lib/method'

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

  assert::asyncTest('source signal error', async function(assert) {
    const [signal, setter] = valueSignal(1)

    const sumSignal = signal::foldp(
      (total, value) => (total + value),
      0)

    assert.equal(sumSignal.currentValue(), 0)

    const channel = subscribeChannel(sumSignal)

    setter.setValue(2)
    setter.setError(new Error ('test error'))
    setter.setValue(3)
    setter.setValue(4)

    assert.equal(await channel.nextValue(), 1)
    assert.equal(await channel.nextValue(), 3)

    await assert::rejected(channel.nextValue())

    assert.throws(() => sumSignal.currentValue())

    assert.end()
  })

  assert::asyncTest('source signal error recovery', async function(assert) {
    const [signal, setter] = valueSignal(1)

    const sumSignal = signal
      ::handleError(err => 1)
      ::foldp(
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
    assert.equal(await channel.nextValue(), 4)
    assert.equal(await channel.nextValue(), 7)
    assert.equal(await channel.nextValue(), 11)

    assert.equal(sumSignal.currentValue(), 11)

    assert.end()
  })

  assert::asyncTest('folder error', async function(assert) {
    const [signal, setter] = valueSignal(1)

    const divideSignal = signal
      ::handleError(err => 5)
      ::foldp(
        (prev, divisor) => {
          if(divisor == 0)
            throw new Error('division by zero')

          return prev / divisor

        }, 100,
        (err, acc) => 100)

    assert.equal(divideSignal.currentValue(), 100)

    const channel = subscribeChannel(divideSignal)

    setter.setValue(2)
    setter.setError(new Error('test error'))
    setter.setValue(4)
    setter.setValue(0)
    setter.setValue(10)

    assert.equal(await channel.nextValue(), 50)
    assert.equal(await channel.nextValue(), 10)
    assert.equal(await channel.nextValue(), 2.5)

    assert::rejected(channel.nextValue())
    assert::rejected(channel.nextValue(),
      'should not recover from folder error')

    assert.throws(() => divideSignal.currentValue())

    assert.end()
  })
})
