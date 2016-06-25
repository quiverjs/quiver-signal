import test from 'tape'
import { ImmutableMap } from 'quiver-util/immutable'
import { asyncTest } from 'quiver-util/tape'

import { flattenSignal } from '../lib/flatten'
import { subscribeGenerator } from '../lib/method'

import {
  valueSignal, subscribeChannel
} from '../lib'

test('flatten signal test', assert => {
  assert.test('basic flatten', assert => {
    const [fooSignal, fooSetter] = valueSignal('foo')
    const [barSignal, barSetter] = valueSignal('bar')
    const [bazSignal, bazSetter] = valueSignal('baz')

    const signalMap = ImmutableMap()
      .set('foo', fooSignal)
      .set('bar', barSignal)

    const [nestedSignal, signalMapSetter] = valueSignal(signalMap)
    const flattenedSignal = flattenSignal(nestedSignal)

    const flattenedMap = flattenedSignal.currentValue()
    assert.equal(flattenedMap.get('foo'), 'foo')
    assert.equal(flattenedMap.get('bar'), 'bar')

    flattenedSignal::subscribeGenerator(function*() {
      const map1 = yield
      assert.equal(map1.get('foo'), 'food')
      assert.equal(map1.get('bar'), 'bar')

      const map2 = yield
      assert.equal(map2.get('foo'), 'food')
      assert.equal(map2.get('bar'), 'beer')

      const newSignalMap = ImmutableMap()
        .set('foo', fooSignal)
        .set('baz', bazSignal)

      signalMapSetter.setValue(newSignalMap)


      const map3 = yield
      assert.equal(map3.get('foo'), 'food')
      assert.equal(map3.get('baz'), 'baz')
      assert.notOk(map3.has('bar'))

      barSetter.setValue('blah')
      bazSetter.setValue('bazaar')

      const map4 = yield
      assert.equal(map4.get('foo'), 'food')
      assert.equal(map4.get('baz'), 'bazaar')
      assert.notOk(map4.has('bar'))

      assert.end()
    })

    fooSetter.setValue('food')
    barSetter.setValue('beer')
  })
})
