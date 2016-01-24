import test from 'tape'
import { ImmutableMap } from 'quiver-util/immutable'
import { asyncTest } from 'quiver-util/tape'

import { combineSignals } from '../lib/combine'
import { valueSignal, subscribeChannel } from '../lib'

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

    const channel = subscribeChannel(signal)

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
})
