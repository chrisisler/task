// @flow
// https://github.com/promises-aplus/promises-tests

const Task = require('../lib/task')

module.exports = {
  resolved(value /*: mixed */) {
    return Task.resolve(value)
  },

  rejected(reason /*: mixed */) {
    return Task.reject(reason)
  },

  deferred() /*: { promise: *, resolve: any => void, reject: any => void } */ {
    let actions = {}
    let task = new Task((resolve, reject) => {
      actions.resolve = resolve
      actions.reject = reject
    })

    return {
      promise: task,
      resolve: actions.resolve,
      reject: actions.reject
    }
  }
}
