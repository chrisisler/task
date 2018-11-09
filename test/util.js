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

test('Task#finally', t => {
  //
  // Finally does not get any input values
  //
  const noInputCases = () => {
    Task.resolve('yes').finally(resolved => {
      t.is(resolved, void 0)
    })

    Task.reject('foo').finally(rejected => {
      t.is(rejected, void 0)
    })

    Task.all([Task.resolve(1), Task.resolve(2)]).finally(tasks => {
      t.is(tasks, void 0)
    })
  }

  //
  // The return value of `finally` is not used unless it is the content of a
  // rejection or a thrown value (thrown thenables are not unboxed).
  //
  const resolveCases = () => {
    Task.resolve('chocolate cake')
      .finally(() => {
        return 42
      })
      .then(resolved => {
        t.is(resolved, 'chocolate cake')
      })

    Task.resolve('pizza')
      .finally(() => {
        return Task.resolve(42)
      })
      .then(resolved => {
        t.is(resolved, 'pizza')
      })

    Task.resolve('rejected foo')
      .finally(() => {
        return Task.reject('rejected message')
      })
      .then(() => {
        t.fail('never going to happen - unreachable')
      })
      .catch(rejected => {
        t.is(rejected, 'rejected message')
      })

    Task.resolve('rejected foo')
      .finally(() => {
        throw 'thrown message'
      })
      .then(() => {
        t.fail('never going to happen - unreachable')
      })
      .catch(rejected => {
        t.is(rejected, 'thrown message')
      })
  }
  resolveCases()

  const rejectCases = () => {
    Task.reject('rejected chocolate cake')
      .finally(() => {
        return 42
      })
      .then(() => {
        t.fail('never going to happen - unreachable')
      })
      .catch(rejected => {
        t.is(rejected, 'rejected chocolate cake')
      })

    Task.reject('rejected pizza')
      .finally(() => {
        return Task.resolve(42)
      })
      .then(() => {
        t.fail('never going to happen - unreachable')
      })
      .catch(rejected => {
        t.is(rejected, 'rejected pizza')
      })

    Task.reject('zzzzzzzzzzzzzzzzzzzzzz')
      .finally(() => {
        return Task.reject('rejected message')
      })
      .then(() => {
        t.fail('never going to happen - unreachable')
      })
      .catch(rejected => {
        t.is(rejected, 'rejected message')
      })

    Task.reject('zzzzzzzzzzzzzzzzzzzzzz')
      .finally(() => {
        throw 'thrown message'
      })
      .then(() => {
        t.fail('never going to happen - unreachable')
      })
      .catch(rejected => {
        t.is(rejected, 'thrown message')
      })
  }
  rejectCases()
})
