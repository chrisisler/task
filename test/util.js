import test from 'ava'

import Task from '../lib/task'

test('Task#race', async t => {
  let t1 = new Task((resolve, reject) => {
    setTimeout(() => resolve('first'), 100)
  })

  let t2 = new Task((resolve, reject) => {
    setTimeout(() => resolve('second'), 200)
  })

  t.is(await Task.race([t1, t2]), 'first')
})

test('Task#all', async t => {
  let array = [
    Task.resolve(3),
    42,
    new Task(resolve => {
      setTimeout(() => resolve('foo'), 100)
    })
  ]

  let resolved = await Task.all(array)
  t.deepEqual(resolved, [3, 42, 'foo'])

  let arrayReject = [
    Task.reject('oh no!'),
    new Task(resolve => {
      setTimeout(() => resolve('foo'), 2000)
    }),
    'I want pancakes wow I am hungry'
  ]

  Task.all(arrayReject).catch(error => {
    t.is(error, 'oh no!')
  })
  // try {
  //   await Task.all(arrayReject)
  // } catch (error) {
  //   t.is(error, 'oh no!')
  // }
})
