import test from 'tape'
import { timeout } from 'quiver-util/promise'
import { asyncTest, rejected } from 'quiver-util/tape'

import { valueSignal, subscribeChannel } from '../lib'
import { map } from '../lib/method'

test('signal channel test', assert => {
  assert::asyncTest('current value map', async function(assert) {
    const [signal, setter] = valueSignal('foo')
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

  assert::asyncTest('subscribe map', async function(assert) {
    const [signal, setter] = valueSignal('foo')
    const mappedSignal = signal::map(str => str.toUpperCase())
    const channel = subscribeChannel(mappedSignal)

    setter.setValue('bar')
    setter.setValue('baz')

    await timeout(10)
    setter.setValue('beer')

    assert.equal(await channel.nextValue(), 'BAR')
    assert.equal(await channel.nextValue(), 'BAZ')
    assert.equal(await channel.nextValue(), 'BEER')

    assert.end()
  })

  assert::asyncTest('maybe mapper', async function(assert) {
    const [signal, setter] = valueSignal()
    const mappedSignal = signal::map(str => str.toUpperCase())
    const channel = subscribeChannel(mappedSignal)

    assert.equal(mappedSignal.currentValue(), null)

    setter.setValue('foo')
    setter.setValue()

    await timeout(10)
    setter.setValue('bar')

    assert.equal(await channel.nextValue(), 'FOO')
    assert.equal(await channel.nextValue(), null)
    assert.equal(await channel.nextValue(), 'BAR')

    setter.setValue(null)
    assert.equal(await mappedSignal.nextValue(), null)

    assert.end()
  })

  assert::asyncTest('error map', async function(assert) {
    const [signal, setter] = valueSignal('foo')

    const safeMapper = value => {
      if(!/^[0-9a-zA-Z]+$/.test(value))
        throw new Error('string contains invalid characters')

      return value.toUpperCase()
    }

    const mappedSignal = signal::map(safeMapper)
    const channel = subscribeChannel(mappedSignal)


    setter.setValue('bar')
    setter.setValue('@invalid str!ng')

    await timeout(10)
    setter.setValue('baz')

    assert.equal(await channel.nextValue(), 'BAR')
    await assert::rejected(channel.nextValue())

    assert.equal(await channel.nextValue(), 'BAZ')

    assert.end()
  })
})
