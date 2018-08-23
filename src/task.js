// @flow

import { warning, defer } from './util'

const Pending = 'Pending'
const Resolved = 'Resolved'
const Rejected = 'Rejected'

// ecma-international.org/ecma-262/6.0/#sec-promise-objects
export default function Task(executor: Function) {
  if (!(this instanceof Task)) {
    throw TypeError('Cannot call `Task` as a function, use `new Task` instead')
  } else if (typeof executor !== 'function') {
    throw TypeError('Expected a function')
  } else if (executor.length < 1) {
    throw TypeError('Expected function to take at least one argument')
  }

  let hasCatch = false
  let value = void 0
  let state = Pending
  let resolveReactions = []
  let rejectReactions = []

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

  this.__proto__.catch = onRejected => {
    hasCatch = true
    return this.then(void 0, onRejected)
  }

  // ecma-international.org/ecma-262/6.0/#sec-promise.prototype.then
  this.__proto__.then = (onResolved, onRejected) => {
    return new Task((resolve, reject) => {
      if (typeof onResolved !== 'function') {
        onResolved = function identity(x) {
          return x
        }
      }
      if (typeof onRejected !== 'function') {
        onRejected = function thrower(x) {
          throw x
        }
      } else {
        hasCatch = true
      }

      let createReaction = handler => value => {
        try {
          resolve(handler(value))
        } catch (error) {
          reject(error)
        }
      }

      let _resolveReaction = createReaction(onResolved)
      let _rejectReaction = createReaction(onRejected)

      if (state === Pending) {
        resolveReactions.push(_resolveReaction)
        rejectReactions.push(_rejectReaction)
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

  // $FlowFixMe
  this.__proto__[Symbol.toStringTag] = `<${value}>`
}

Task.resolve = resolution => {
  if (resolution && typeof resolution.then === 'function') {
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
// Task.all = tasks => {}
// Task.race = tasks => {}
