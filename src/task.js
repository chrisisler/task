import { warning, defer } from './util'

const Pending = 'Pending'
const Resolved = 'Resolved'
const Rejected = 'Rejected'

export default function Task(executor) {
  if (!(this instanceof Task)) {
    throw TypeError('Cannot call the Task class as a function')
  } else if (typeof executor !== 'function') {
    throw TypeError('Expected a function')
  } else if (executor.length < 1) {
    throw TypeError('Expected function to take at least one argument')
  }

  let value = void 0
  let state = Pending
  let hasCatch = false

  executor(
    function resolve(resolvedValue) {
      state = Resolved
      value = resolvedValue
    },
    function reject(rejectedValue) {
      state = Rejected
      value = rejectedValue
    }
  )

  this.then = (onResolved, onRejected) => {}
}
