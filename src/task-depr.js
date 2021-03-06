// @flow

import { warning, defer } from './util'

// const nativeCodeRE = /native code/
// const hasSymbol =
//   typeof Symbol === 'function' && nativeCodeRE.test(Symbol.toString())

const Pending = 'Pending'
const Resolved = 'Resolved'
const Rejected = 'Rejected'
type State = 'Pending' | 'Resolved' | 'Rejected'

export default function Task(executor: ?Function) {
  if (!(this instanceof Task)) {
    throw TypeError('Cannot call `Task` as a function, use `new Task` instead')
  } else if (typeof executor !== 'function') {
    throw TypeError(`Expected a function, instead received ${typeof executor}`)
  } else if (executor.length < 1) {
    // ES6 Promises do not require this
    throw TypeError('Expected function to take at least one argument')
  }

  let value = void 0
  let state: State = Pending
  let resolvedReactions: ?Array<Function> = []
  let rejectedReactions: ?Array<Function> = []
  let taskErrorsHandled = false
  let executed = false // To disallow more than one resolve/reject calls

  executor(
    function resolve(resolution) {
      if (!executed) {
        executed = true
        settle(Resolved, resolution)
      }
    },
    function reject(rejection) {
      if (!executed) {
        executed = true
        settle(Rejected, rejection)
      }
    }
  )

  // if (hasSymbol) {
  //   // $FlowFixMe
  //   this.__proto__[Symbol.toStringTag] = `Value: <${
  //     state === Pending ? 'pending' : String(value)
  //   }>`
  // }

  this.catch = (onRejected: Function) => {
    if (typeof onRejected === 'function') {
      taskErrorsHandled = true
    }
    return this.then(void 0, onRejected)
  }

  this.then = (onResolved?: Function, onRejected?: Function) => {
    // if (typeof onResolved !== 'function' && state !== Pending) {
    //   return this
    // }

    return new Task((resolve, reject) => {
      let nextTask = { resolve, reject }

      let resolveReaction = resolved => {
        if (typeof onResolved === 'function') {
          try {
            console.log('resolved is:', resolved)
            let nextValue = onResolved.call(void 0, resolved)
            resolutionProcedure(nextValue, nextTask)
          } catch (error) {
            reject(error)
          }
        } else {
          resolve(resolved)
        }
      }

      let rejectReaction = rejected => {
        if (typeof onRejected === 'function') {
          taskErrorsHandled = true
          try {
            let nextValue = onRejected.call(void 0, rejected)
            resolutionProcedure(nextValue, nextTask)
          } catch (error) {
            reject(error)
          }
        } else {
          reject(rejected)
        }
      }

      if (state === Pending) {
        // $FlowFixMe - This array will be valid, not undefined.
        resolvedReactions.push(resolveReaction)
        // $FlowFixMe - This array will be valid, not undefined.
        rejectedReactions.push(rejectReaction)
      } else {
        defer(() => {
          if (state === Resolved) {
            resolveReaction(value)
          } else if (state === Rejected) {
            // DEV: Commented out for tests.
            // warning(!taskErrorsHandled, 'Unhandled Task rejection.')
            rejectReaction(value)
          }
        })
      }
    })
  }

  function resolutionProcedure(
    v: ?any,
    nextTask: { resolve: Function, reject: Function }
  ): void {
    // console.log('self is:', self)
    console.log('resolutionProcedure: v is:', v)
    if (value === v) {
      return nextTask.reject(TypeError('Invariant from spec: 2.3.1'))
    }

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
                resolutionProcedure(resolved, nextTask)
              }
            },
            rejected => {
              if (!called) {
                called = true
                nextTask.reject(rejected)
              }
            }
          )
        } else {
          nextTask.resolve(v)
        }
      } catch (error) {
        if (!called) {
          called = true
          nextTask.reject(error)
        }
      }
    } else {
      nextTask.resolve(v)
    }
  }

  function settle(settledState: State, settledValue: ?any): void {
    if (state === Pending) {
      state = settledState
      value = settledValue
      console.log('settledValue is:', settledValue)

      defer(() => {
        let reactions =
          state === Resolved ? resolvedReactions : rejectedReactions

        // $FlowFixMe - This array will be valid, not undefined.
        reactions.forEach(reaction => {
          if (typeof reaction === 'function') {
            reaction(value)
          }
        })

        // Garbage collect.
        resolvedReactions = null
        rejectedReactions = null
      })
    }
  }
}

function isThenable(x: ?any): boolean {
  return (
    x != null &&
    (typeof x === 'object' || typeof x === 'function') &&
    'then' in x &&
    typeof x.then === 'function'
  )
}

Task.resolve = resolution => {
  if (isThenable(resolution)) {
    // if (resolution.constructor.name === 'Task') {
    //   return resolution
    // }
    // $FlowFixMe - This is fine.
    return resolution.then(
      res => {
        return new Task(resolve => {
          resolve(res)
        })
      },
      rej => {
        return new Task((_, reject) => {
          reject(rej)
        })
      }
    )
  }
  return new Task(resolve => {
    resolve(resolution)
  })
}

Task.reject = rejection => {
  if (rejection && isThenable(rejection)) {
    // if (rejection.constructor.name === 'Task') {
    //   return rejection
    // }
    // $FlowFixMe - This is fine.
    return rejection.then(
      res => {
        return new Task(resolve => {
          resolve(res)
        })
      },
      rej => {
        return new Task((_, reject) => {
          reject(rej)
        })
      }
    )
  }
  return new Task((_, reject) => {
    reject(rejection)
  })
}

// Task.race = tasks => {}
// Task.all = tasks => {}
// Task.allSettled = tasks => {}
// Task.split = tasks => {}
