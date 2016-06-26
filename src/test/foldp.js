import test from 'tape'
import { asyncTest, rejected } from 'quiver-util/tape'

import { valueSignal, subscribeChannel } from '../lib'
import { foldp } from '../lib/method'

const testError = message => {
  const err = new Error(message)
  err.isTestError = true
  return err
}

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
    setter.setError(testError('test error'))
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

    const sumSignal = signal::foldp(
      (total, value) => (total + value),
      0,
      (err, acc) => 0)

    assert.equal(sumSignal.currentValue(), 0)

    const channel = subscribeChannel(sumSignal)

    setter.setValue(2)
    setter.setError(testError('test error'))
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

  assert::asyncTest('folder error', async function(assert) {
    const [signal, setter] = valueSignal(1)

    const divideSignal = signal::foldp(
      (prev, divisor) => {
        if(divisor == 0)
          throw testError('division by zero')

        return prev / divisor

      }, 100,
      (err, acc) => 100)

    assert.equal(divideSignal.currentValue(), 100)

    const channel = subscribeChannel(divideSignal)

    setter.setValue(2)
    setter.setError(testError('test error'))
    setter.setValue(5)
    setter.setValue(4)
    setter.setValue(0)
    setter.setValue(10)

    assert.equal(await channel.nextValue(), 50)
    assert.equal(await channel.nextValue(), 100)
    assert.equal(await channel.nextValue(), 20)
    assert.equal(await channel.nextValue(), 5)

    assert::rejected(channel.nextValue())
    assert::rejected(channel.nextValue(),
      'should not recover from folder error')

    assert.throws(() => divideSignal.currentValue())

    assert.end()
  })
})
