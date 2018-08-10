// https://github.com/promises-aplus/promises-tests

import promisesAplusTests from 'promises-aplus-tests'
import Task from '../lib/task'

const testAdapter = {
  resolved(value) {
    return Task.resolve(value)
  },

  rejected(reason) {
    return Task.reject(reason)
  },

  deferred() {
    return {
      promise: new Task(),
      resolve: Task.resolve,
      reject: Task.reject,
    }
  },
}

promisesAplusTests(testAdapter, err => {
  console.error(err)
})
