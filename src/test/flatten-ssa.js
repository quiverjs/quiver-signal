import test from 'tape'
import { asyncTest } from 'quiver-util/tape'
import { ImmutableMap } from 'quiver-util/immutable'

import {
  subscribeChannel
} from '../lib/method'

import {
  valueSignal, flattenSsa
} from '../lib'

// flattenSsa :: Signal Signal a -> Signal a
test('flatten Signal Signal Signal a', assert => {
  assert::asyncTest('basic flatten', async function(assert) {
    const [fooSignal, fooSetter] = valueSignal('foo')
    const [barSignal, barSetter] = valueSignal('bar')

    const [ssa, signalSetter] = valueSignal(fooSignal)

    const flattenedSignal = flattenSsa(ssa)

    assert.equal(flattenedSignal.currentValue(), 'foo')

    const channel = flattenedSignal::subscribeChannel()

    fooSetter.setValue('food')

    assert.equal(await channel.nextValue(), 'food')

    signalSetter.setValue(barSignal)

    assert.equal(await channel.nextValue(), 'bar')
    assert.equal(flattenedSignal.currentValue(), 'bar')

    fooSetter.setValue('fool')
    barSetter.setValue('beer')

    assert.equal(await channel.nextValue(), 'beer')
    assert.equal(flattenedSignal.currentValue(), 'beer')

    signalSetter.setValue(null)

    assert.equal(await channel.nextValue(), null)
    assert.equal(flattenedSignal.currentValue(), null)

    fooSetter.setValue('foo')
    barSetter.setValue('bar')

    await Promise.resolve()
    assert.equal(flattenedSignal.currentValue(), null)

    assert.end()
  })
})
