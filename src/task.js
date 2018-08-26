// @flow

import { warning, defer } from './util'

const Pending = 'Pending'
const Resolved = 'Resolved'
const Rejected = 'Rejected'
type State = 'Pending' | 'Resolved' | 'Rejected'

// ecma-international.org/ecma-262/6.0/#sec-promise-objects
export default function Task(executor: Function) {
  if (!(this instanceof Task)) {
    throw TypeError('Cannot call `Task` as a function, use `new Task` instead')
  } else if (typeof executor !== 'function') {
    throw TypeError('Expected a function')
  } else if (executor.length < 1) {
    throw TypeError('Expected function to take at least one argument')
  }

  let value = void 0
  let state: State = Pending

  let taskErrorsHandled = false
  let resolvedReactions: ?Array<Function> = []
  let rejectedReactions: ?Array<Function> = []

  {
    let executed = false

    executor(
      function resolve(resolution) {
        if (executed) {
          return
        }
        executed = true
        state = Resolved
        value = resolution
      },
      function reject(rejection) {
        if (executed) {
          return
        }
        executed = true
        state = Rejected
        value = rejection
      }
    )
  }

  // $FlowFixMe
  this.__proto__[Symbol.toStringTag] = `Value: <${
    state === Pending ? 'pending' : String(value)
  }>`

  this.__proto__.catch = (onRejected: Function) => {
    taskErrorsHandled = true
    return this.then(void 0, onRejected)
  }

  // ecma-international.org/ecma-262/6.0/#sec-promise.prototype.then
  this.__proto__.then = (onResolved?: Function, onRejected?: Function) => {
    return new Task((resolve, reject) => {
      // Define functions that wrap the given optional onResolved and onRejected
      // functions, providing error handling and transitioning the
      // internal state of the Task from Pending to Resolved or Rejected.
      let _resolveReaction = (resolved: ?any): void => {
        if (typeof onResolved === 'function') {
          try {
            _resolveTask(onResolved(resolved), { resolve, reject })
          } catch (error) {
            _settle(Rejected, error)
          }
        } else {
          _settle(Resolved, resolved)
        }
      }
      let _rejectReaction = (rejected: ?any): void => {
        if (typeof onRejected === 'function') {
          taskErrorsHandled = true
          try {
            _resolveTask(onRejected(rejected), { resolve, reject })
          } catch (error) {
            _settle(Rejected, error)
          }
        } else {
          _settle(Rejected, rejected)
        }
      }

      if (state === Pending) {
        // $FlowFixMe - This array will be valid, not undefined.
        resolvedReactions.push(_resolveReaction)
        // $FlowFixMe - This array will be valid, not undefined.
        rejectedReactions.push(_rejectReaction)
      } else {
        defer(() => {
          if (state === Resolved) {
            _resolveReaction(value)
          } else if (state === Rejected) {
            _rejectReaction(value)
          }
        })
      }
    })
  }

  function _settle(settledState: State, settledValue: ?any): void {
    console.log('_settle()')
    if (settledState !== Pending) {
      state = settledState
      value = settledValue

      defer(() => {
        console.log('reacting')
        let reactions =
          state === Resolved ? resolvedReactions : rejectedReactions
        console.log('reactions is:', reactions)
        // $FlowFixMe - This array will be valid, not undefined.
        reactions.forEach(reaction => {
          if (typeof reaction === 'function') {
            reaction(settledValue)
          }
        })
        // Garbage collect.
        resolvedReactions = null
        rejectedReactions = null
      })
    }
  }

  function _resolveTask(v: ?any, { resolve, reject }) {
    if (v && (typeof v === 'function' || typeof v === 'object')) {
      let called = false

      try {
        let then = v.then

        if (typeof then === 'function') {
          then.call(
            v,
            resolved => {
              if (!called) {
                called = true
                // resolve again with the unwrapped/unboxed task value
                _resolveTask(resolved, { resolve, reject })
              }
            },
            rejected => {
              if (!called) {
                called = true
                _settle(Rejected, v)
                // reject(v)
              }
            }
          )
        } else {
          _settle(Rejected, v)
          // reject(v)
        }
      } catch (error) {
        if (!called) {
          called = true
          _settle(Rejected, v)
          // reject(v)
        }
      }
    } else {
      _settle(Resolved, v)
      // resolve(v)
    }
  }
}

function isThenable(x: ?any): boolean {
  return (
    x != null &&
    (typeof x === 'object' || typeof x === 'function') &&
    typeof x.then === 'function'
  )
}

Task.resolve = resolution => {
  if (resolution && isThenable(resolution)) {
    if (resolution.constructor.name === 'Task') {
      return resolution
    }
    return resolution.then(
      resolved => {
        return new Task(resolve => {
          resolve(resolved)
        })
      },
      rejected => {
        return new Task((_, reject) => {
          reject(rejected)
        })
      }
    )
  }
  return new Task(resolve => {
    resolve(resolution)
  })
}

// Task.reject = rejection => {}
// Task.race = tasks => {}

Task.all = tasks => {
  if (!Array.isArray(tasks)) {
    throw TypeError('Expected an array')
  }

  let values = []

  return new Task((resolve, reject) => {
    resolve(values)
  })
}
