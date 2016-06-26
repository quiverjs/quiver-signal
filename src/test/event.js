import test from 'tape'
import { ImmutableMap } from 'quiver-util/immutable'
import { asyncTest } from 'quiver-util/tape'

import { eventSignal } from '../lib'
import { subscribeChannel } from '../lib/method'

test('event signal test', assert => {
  assert::asyncTest('basic event', async assert => {
    const [signal, evHandler] = eventSignal()
    const channel = signal::subscribeChannel()

    assert.equal(signal.currentValue(), null)

    evHandler('foo')
    evHandler('bar')

    assert.equal(await channel.nextValue(), 'foo')
    assert.equal(await channel.nextValue(), null)

    assert.equal(await channel.nextValue(), 'bar')
    assert.equal(signal.currentValue(), null)

    assert.equal(await channel.nextValue(), null)

    assert.end()
  })
})
