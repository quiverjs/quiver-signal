import test from 'tape'
import { ImmutableMap } from 'quiver-util/immutable'
import { asyncTest } from 'quiver-util/tape'

import { valueSignal } from '../lib/value'
import { flattenSignal } from '../lib/flatten'
import { subscribeChannel } from '../lib/method'

test('flatten signal test', assert => {
  assert::asyncTest('basic flatten', async assert => {
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

    const channel = flattenedSignal::subscribeChannel()

    fooSetter.setValue('food')
    barSetter.setValue('beer')

    const map1 = await channel.nextValue()
    assert.equal(map1.get('foo'), 'food')
    assert.equal(map1.get('bar'), 'bar')

    const map2 = await channel.nextValue()
    assert.equal(map2.get('foo'), 'food')
    assert.equal(map2.get('bar'), 'beer')

    const newSignalMap = ImmutableMap()
      .set('foo', fooSignal)
      .set('baz', bazSignal)

    signalMapSetter.setValue(newSignalMap)

    const map3 = await channel.nextValue()
    assert.equal(map3.get('foo'), 'food')
    assert.equal(map3.get('baz'), 'baz')
    assert.notOk(map3.has('bar'))

    barSetter.setValue('blah')
    bazSetter.setValue('bazaar')

    const map4 = await channel.nextValue()
    assert.equal(map4.get('foo'), 'food')
    assert.equal(map4.get('baz'), 'bazaar')
    assert.notOk(map4.has('bar'))

    assert.end()
  })
})
