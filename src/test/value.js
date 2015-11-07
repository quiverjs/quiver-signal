import test from 'tape'
import { timeout } from 'quiver-util/promise'
import { asyncTest } from 'quiver-util/tape'

import { valueSignal } from '../lib/value'

test('value signal test', assert => {
  assert::asyncTest('current value 1', async function(assert) {
    const [signal, setter] = valueSignal('foo')

    assert.equal(signal.currentValue(), 'foo')
    assert.equal(signal.currentError(), null)

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
    assert.equal(signal.currentError(), null)

    setter.setValue('bar')
    setter.setValue('baz')

    assert.equal(signal.currentValue(), 'foo',
      'should only change value on next tick')

    await Promise.resolve()
    assert.equal(signal.currentValue(), 'baz',
      'should change to latest value after next tick')

    assert.end()
  })

  assert::asyncTest('next value 1', async function(assert) {
    const [signal, setter] = valueSignal('foo')

    assert.equal(signal.currentValue(), 'foo')
    assert.equal(signal.currentError(), null)

    signal.nextValue().then(newValue => {
      assert.equal(newValue, 'bar',
        'should resolve to new value')

      assert.end()
    }).catch(assert.fail)

    await timeout(10)
    setter.setValue('bar')
  })

  assert::asyncTest('next value 2', async function(assert) {
    const [signal, setter] = valueSignal('foo')

    assert.equal(signal.currentValue(), 'foo')
    assert.equal(signal.currentError(), null)

    setter.setValue('bar')

    const newValue = await signal.nextValue()
    assert.equal(newValue, 'bar',
      'should capture previous setter value within the same tick')

    assert.end()
  })

  assert::asyncTest('next value 3', async function(assert) {
    const [signal, setter] = valueSignal('foo')

    assert.equal(signal.currentValue(), 'foo')
    assert.equal(signal.currentError(), null)

    setter.setValue('bar')
    setter.setValue('baz')

    const newValue = await signal.nextValue()
    assert.equal(newValue, 'bar',
      'should capture previous setter value within the same tick')

    assert.equal(signal.currentValue(), 'baz',
      'should have changed current value to baz')

    signal.nextValue().then(newValue => {
      assert.equal(newValue, 'too late',
        'should not able to capture baz')

      assert.end()
    }).catch(assert.fail)

    await timeout(10)
    setter.setValue('too late')
  })

  assert::asyncTest('subscribe', async function(assert) {
    const [signal, setter] = valueSignal()

    const expectedValues = ['foo', 'bar', 'baz']
    const observer = function*() {
      for(let expected of expectedValues) {
        const value = yield
        assert.equal(value, expected)
      }

      assert.end()
    }()
    observer.next()

    signal.subscribe(observer)
    setter.setValue('foo')
    setter.setValue('bar')

    await timeout(10)
    setter.setValue('baz')
  })
})
