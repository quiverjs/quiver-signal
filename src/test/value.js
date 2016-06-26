import test from 'tape'
import { timeout } from 'quiver-util/promise'
import { asyncTest } from 'quiver-util/tape'

import { valueSignal } from '../lib'
import { subscribeGenerator } from '../lib/method'

test('value signal test', assert => {
  assert::asyncTest('current value 1', async function(assert) {
    const [signal, setter] = valueSignal('foo')

    assert.equal(signal.currentValue(), 'foo')

    setter.setValue('bar')
    assert.equal(signal.currentValue(), 'foo',
      'should only change value on next tick')

    await Promise.resolve()
    assert.equal(signal.currentValue(), 'bar',
      'should change value after next tick')

    assert.end()
  })

  assert::asyncTest('current value 2', async function(assert) {
    const [signal, setter] = valueSignal('foo')

    assert.equal(signal.currentValue(), 'foo')

    setter.setValue('bar')
    setter.setValue('baz')

    assert.equal(signal.currentValue(), 'foo',
      'should only change value on next tick')

    await Promise.resolve()
    assert.equal(signal.currentValue(), 'baz',
      'should change to latest value after next tick')

    assert.end()
  })

  assert::asyncTest('wait value 1', async function(assert) {
    const [signal, setter] = valueSignal('foo')

    assert.equal(signal.currentValue(), 'foo')

    const promise = signal.waitNext()

    await timeout(10)
    setter.setValue('bar')

    await promise
    assert.equal(signal.currentValue(), 'bar',
      'should resolve to new value')

    assert.end()
  })

  assert::asyncTest('wait value 2', async function(assert) {
    const [signal, setter] = valueSignal('foo')

    assert.equal(signal.currentValue(), 'foo')

    setter.setValue('bar')

    await signal.waitNext()
    assert.equal(signal.currentValue(), 'bar',
      'should capture previous setter value within the same tick')

    assert.end()
  })

  assert::asyncTest('next value 3', async function(assert) {
    const [signal, setter] = valueSignal('foo')

    assert.equal(signal.currentValue(), 'foo')

    setter.setValue('bar')
    setter.setValue('baz')

    await signal.waitNext()
    assert.equal(signal.currentValue(), 'baz',
      'should have changed current value to baz')

    assert.end()
  })

  assert::asyncTest('subscribe 1', async function(assert) {
    const [signal, setter] = valueSignal()

    const expectedValues = ['foo', 'bar', 'baz']
    signal::subscribeGenerator(function*() {
      for(let expected of expectedValues) {
        const value = yield
        assert.equal(value, expected)
      }

      assert.end()
    })


    setter.setValue('foo')
    setter.setValue('bar')

    await timeout(10)
    setter.setValue('baz')
  })

  assert::asyncTest('subscribe repeated', async function(assert) {
    const [signal, setter] = valueSignal()

    const expectedValues = ['foo', 'bar', 'baz']
    signal::subscribeGenerator(function*() {
      for(let expected of expectedValues) {
        const value = yield
        assert.equal(value, expected)
      }

      assert.end()
    })

    setter.setValue('foo')
    setter.setValue('foo')
    setter.setValue('bar')
    setter.setValue('bar')
    setter.setValue('bar')

    await timeout(10)
    setter.setValue('baz')
    setter.setValue('baz')
  })

  assert::asyncTest('unsubscribe', async function(assert) {
    const [signal, setter] = valueSignal()

    const unsubscribe = signal::subscribeGenerator(function*() {
      assert.equal(yield, 'foo')
      assert.equal(yield, 'bar')

      try {
        yield
        assert.fail('should never get baz')
      } finally {
        // assert.end('iterator should be closed when unsubscribed')
      }
    })


    setter.setValue('foo')
    setter.setValue('bar')

    await timeout(10)

    unsubscribe()
    setter.setValue('baz')

    // TODO: Node v5 do not support generator.return().
    // end the test without confirming that the observer
    // generator is terminated in the finally block.
    await timeout(10)
    assert.end()
  })

  assert::asyncTest('error value 1', async function(assert) {
    const [signal, setter] = valueSignal('foo')

    setter.setError(new Error('error'))
    await signal.waitNext()

    assert.throws(() => signal.currentValue())

    assert.end()
  })

  assert::asyncTest('error value 2', async function(assert) {
    const [signal, setter] = valueSignal('foo')
    const err = new Error('error')

    signal::subscribeGenerator(function*() {
      const value1 = yield
      assert.equal(value1, 'bar')

      try {
        yield
        assert.fail('yield should throw error')
      } catch(error) {
        assert.equal(error, err, 'should catch error')
      }

      const value2 = yield
      assert.equal(value2, 'baz',
        'should recover from error and get next value')

      assert.end()
    })

    setter.setValue('bar')
    await timeout(10)

    setter.setError(err)
    await timeout(10)

    setter.setError(err)
    setter.setValue('baz')
  })
})
