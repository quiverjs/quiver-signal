import test from 'tape'
import { ImmutableMap } from 'quiver-util/immutable'
import { asyncTest } from 'quiver-util/tape'

import { valueSignal, flattenScsv } from '../lib'
import { subscribeChannel } from '../lib/method'

// type C v = Container v
// type CS v = Container Signal v
// type SC v = Signal Container v
// type SCS v = Signal Container Signal v
// flattenScsv :: Signal Container Signal v -> Signal Container v
test('flatten Signal Container Signal v', assert => {
  assert::asyncTest('basic flatten', async assert => {
    const [fooSignal, fooSetter] = valueSignal('foo')
    const [barSignal, barSetter] = valueSignal('bar')
    const [bazSignal, bazSetter] = valueSignal('baz')

    // csv :: Container Signal v
    const csv = ImmutableMap()
      .set('foo', fooSignal)
      .set('bar', barSignal)

    // scsv :: Signal Container Signal v
    const [scsv, csvSetter] = valueSignal(csv)

    // flattenedSignal :: Signal Container v
    const flattenedSignal = flattenScsv(scsv)

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

    const newCsv = ImmutableMap()
      .set('foo', fooSignal)
      .set('baz', bazSignal)

    csvSetter.setValue(newCsv)

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

    const csv = ImmutableMap()
      .set('foo', fooSignal)
      .set('bar', barSignal)

    const [scsv, csvSetter] = valueSignal(csv)
    const flattenedSignal = flattenScsv(scsv)

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

    const csv2 = csv.set('baz', bazSignal)
    csvSetter.setValue(csv2)

    fooSetter.setValue('fool')

    const map2 = await channel.nextValue()
    assert.deepEqual(map2.toObject(), {
      foo: 'fool',
      bar: 'beer',
      baz: 'baz'
    },
    'all updates should be sent at once only after error is recovered')

    csvSetter.setError('map error')
    bazSetter.setValue('bazaar')

    try {
      await channel.nextValue()
      assert.fail('should raise error')
    } catch(err) {
      assert.equal(err, 'map error')
    }

    const csv3 = csv2.delete('bar')
    csvSetter.setValue(csv3)

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
