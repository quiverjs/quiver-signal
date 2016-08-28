import test from 'tape'
import { ImmutableMap } from 'quiver-util/immutable'
import { asyncTest } from 'quiver-util/tape'

import { valueSignal, flattenScsa } from '../lib'
import { subscribeChannel } from '../lib/method'

// type C a = Container a
// type CS a = Container Signal a
// type SC a = Signal Container a
// type SCS a = Signal Container Signal a
// flattenScsa :: Signal Container Signal a -> Signal Container a
test('flatten Signal Container Signal a', assert => {
  assert::asyncTest('basic flatten', async assert => {
    const [fooSignal, fooSetter] = valueSignal('foo')
    const [barSignal, barSetter] = valueSignal('bar')
    const [bazSignal, bazSetter] = valueSignal('baz')

    // csa :: Container Signal a
    const csa = ImmutableMap()
      .set('foo', fooSignal)
      .set('bar', barSignal)

    // scsa :: Signal Container Signal a
    const [scsa, csaSetter] = valueSignal(csa)

    // flattenedSignal :: Signal Container a
    const flattenedSignal = flattenScsa(scsa)

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

    const newCsa = ImmutableMap()
      .set('foo', fooSignal)
      .set('baz', bazSignal)

    csaSetter.setValue(newCsa)

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

  assert::asyncTest('basic flatten 2', async assert => {
    const [fooSignal, fooSetter] = valueSignal('foo')
    const [barSignal, barSetter] = valueSignal('bar')
    const [bazSignal, bazSetter] = valueSignal('baz')

    const csa = ImmutableMap()
      .set('foo', fooSignal)
      .set('bar', barSignal)

    const [scsa, csaSetter] = valueSignal(csa)
    const flattenedSignal = flattenScsa(scsa)

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

    const csa2 = csa.set('baz', bazSignal)
    csaSetter.setValue(csa2)

    fooSetter.setValue('fool')

    const map2 = await channel.nextValue()
    assert.deepEqual(map2.toObject(), {
      foo: 'fool',
      bar: 'beer',
      baz: 'baz'
    },
    'all updates should be sent at once only after error is recovered')

    csaSetter.setError('map error')
    bazSetter.setValue('bazaar')

    try {
      await channel.nextValue()
      assert.fail('should raise error')
    } catch(err) {
      assert.equal(err, 'map error')
    }

    const csa3 = csa2.delete('bar')
    csaSetter.setValue(csa3)

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
