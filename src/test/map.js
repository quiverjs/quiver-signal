import test from 'tape'
import { timeout } from 'quiver-util/promise'
import { asyncTest, rejected } from 'quiver-util/tape'

import { valueSignal, subscribeChannel } from '../lib'
import { map } from '../lib/method'

test('signal channel test', assert => {
  assert::asyncTest('current value map', async function(assert) {
    const [signal, setter] = valueSignal('foo')
    const channel = subscribeChannel(signal)

    const mappedSignal = signal::map(str => str.toUpperCase())

    assert.equal(mappedSignal.currentValue(), 'FOO')

    setter.setValue('bar')

    assert.equal(await mappedSignal.nextValue(), 'BAR')
    assert.equal(mappedSignal.currentValue(), 'BAR')

    setter.setValue('Bar')
    setter.setValue('BaR')
    setter.setValue('baz')

    assert.equal(await mappedSignal.nextValue(), 'BAZ',
      'should ignore mapped value that are same as previous')

    assert.end()
  })
})
