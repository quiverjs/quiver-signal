import test from 'tape'
import { ImmutableMap } from 'quiver-util/immutable'
import { asyncTest } from 'quiver-util/tape'

import { valueSignal, flattenSignal } from '../lib'
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

    const channel = flattenedSignal::subscribeChannel()

    const flattenedMap = flattenedSignal.currentValue()
    assert.equal(flattenedMap.get('foo'), 'foo')
    assert.equal(flattenedMap.get('bar'), 'bar')

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

  assert::asyncTest('basic flatten', async assert => {
    const [fooSignal, fooSetter] = valueSignal('foo')
    const [barSignal, barSetter] = valueSignal('bar')
    const [bazSignal, bazSetter] = valueSignal('baz')

    const signalMap = ImmutableMap()
      .set('foo', fooSignal)
      .set('bar', barSignal)

    const [nestedSignal, signalMapSetter] = valueSignal(signalMap)
    const flattenedSignal = flattenSignal(nestedSignal)

    const channel = flattenedSignal::subscribeChannel()

    fooSetter.setValue('food')
    fooSetter.setError('foo error')

    const map1 = await channel.nextValue()
    assert.deepEqual(map1.toObject(), {
      foo: 'food',
      bar: 'bar'
    })

    try {
      await channel.nextValue()
      assert.fail('should raise error')
    } catch(err) {
      const { errorMap } = err
      assert.ok(errorMap)
      assert.deepEqual(errorMap.toObject(), {
        foo: 'foo error'
      })
    }

    barSetter.setValue('beer')

    const signalMap2 = signalMap.set('baz', bazSignal)
    signalMapSetter.setValue(signalMap2)

    fooSetter.setValue('fool')

    const map2 = await channel.nextValue()
    assert.deepEqual(map2.toObject(), {
      foo: 'fool',
      bar: 'beer',
      baz: 'baz'
    },
    'all updates should be sent at once only after error is recovered')

    signalMapSetter.setError('map error')
    bazSetter.setValue('bazaar')

    try {
      await channel.nextValue()
      assert.fail('should raise error')
    } catch(err) {
      assert.equal(err, 'map error')
    }

    const signalMap3 = signalMap2.delete('bar')
    signalMapSetter.setValue(signalMap3)

    const map3 = await channel.nextValue()
    assert.deepEqual(map3.toObject(), {
      foo: 'fool',
      baz: 'bazaar'
    })

    assert.deepEqual(flattenedSignal.currentValue().toObject(), {
      foo: 'fool',
      baz: 'bazaar'
    })

    assert.end()
  })
})
