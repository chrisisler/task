// @flow
// https://github.com/promises-aplus/promises-tests

const Task = require('../lib/task')

module.exports = {
  resolved: Task.resolve,
  rejected: Task.reject,

  deferred() {
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
