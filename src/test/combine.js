import test from 'tape'
import { ImmutableMap } from 'quiver-util/immutable'
import { asyncTest } from 'quiver-util/tape'

import {
  subscribeGenerator, subscribeChannel
} from '../lib/method'

import {
  valueSignal, combineSignals
} from '../lib'

test('combine signal test', assert => {
  assert::asyncTest('basic combine', async function(assert) {
    const [fooSignal, fooSetter] = valueSignal('foo')
    const [barSignal, barSetter] = valueSignal('bar')

    const signalMap = ImmutableMap()
      .set('foo', fooSignal)
      .set('bar', barSignal)

    const signal = combineSignals(signalMap)

    assert.deepEqual(signal.currentValue().toObject(),
      { foo: 'foo', bar: 'bar' })

    fooSetter.setValue('food')
    await signal.waitNext()

    assert.deepEqual(signal.currentValue().toObject(),
      { foo: 'food', bar: 'bar' })

    const channel = signal::subscribeChannel()

    barSetter.setValue('beer')
    fooSetter.setValue('fool')
    barSetter.setValue('buzz')

    assert.deepEqual((await channel.nextValue()).toObject(),
      { foo: 'food', bar: 'beer' })

    assert.deepEqual((await channel.nextValue()).toObject(),
      { foo: 'fool', bar: 'beer' })

    assert.deepEqual((await channel.nextValue()).toObject(),
      { foo: 'fool', bar: 'buzz' })

    channel.close()

    assert.end()
  })

  assert.test('race condition test', assert => {
    const [fooSignal, fooSetter] = valueSignal('foo')
    const [barSignal] = valueSignal('bar')

    const signalMap = ImmutableMap()
      .set('foo', fooSignal)
      .set('bar', barSignal)

    const combinedSignal = combineSignals(signalMap)

    let observedFoo = []

    fooSignal::subscribeGenerator(function*() {
      const newValue = yield
      assert.equal(newValue, 'food')
      assert.deepEqual(observedFoo, [])
      assert.equal(combinedSignal.currentValue().get('foo'), 'food')

      combinedSignal::subscribeGenerator(function*() {
        const newValue = (yield).get('foo')

        assert.equal(newValue, 'fool',
          'combinedSignal.subscribe should subscribe based on current value ' +
          'instead of piping old values from previous subscription')

        assert.deepEqual(observedFoo, ['food', 'fool'],
          'other subscriber should receieve the old value first ' +
          'as per contract of signal subscription')

        assert.end()
      })

      fooSetter.setValue('fool')
    })

    combinedSignal::subscribeGenerator(function*() {
      const value1 = (yield).get('foo')
      assert.equal(value1, 'food')
      observedFoo.push(value1)

      const value2 = (yield).get('foo')
      assert.equal(value2, 'fool')
      observedFoo.push(value2)
    })

    fooSetter.setValue('food')
  })

  assert.test('error test', assert => {
    const [fooSignal, fooSetter] = valueSignal('foo')
    const [barSignal, barSetter] = valueSignal('bar')

    const signalMap = ImmutableMap()
      .set('foo', fooSignal)
      .set('bar', barSignal)

    const combinedSignal = combineSignals(signalMap)

    combinedSignal::subscribeGenerator(function*() {
      const map1 = yield
      assert.equal(map1.get('foo'), 'food')
      assert.equal(map1.get('bar'), 'bar')

      try {
        yield
        assert.fail('should throw error')
      } catch(err) {
        const { errorMap } = err

        assert.ok(errorMap)
        assert.equal(errorMap.size, 1)
        assert.equal(errorMap.get('foo'), 'foo error')
      }

      const map2 = yield
      assert.equal(map2.get('bar'), 'beer')
      assert.equal(map2.get('foo'), 'fool',
        'should get both update at same time, because bar ' +
        'is set during foo value is error')

      assert.end()
    })

    fooSetter.setValue('food')
    fooSetter.setError('foo error')
    barSetter.setValue('beer')
    fooSetter.setValue('fool')
  })
})
