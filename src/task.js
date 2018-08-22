// @flow

const processExists = typeof process === 'object'

const warning: Function = (_ => {
  // Keep track of warning messages to avoid duplicates.
  let warned: Set<string> = new Set()
  let _warning = function warningMuted() {}

  if (processExists && process.env.NODE_ENV !== 'production') {
    _warning = function warning(condition: boolean, message: string): void {
      if (!warned.has(message)) {
        if (condition) {
          if (console && typeof console.warn === 'function') {
            console.warn('Warning: ' + message)
          }

          try {
            // Throw error so people can trace calls here.
            throw Error(message)
          } catch (error) {}
        }
      }
    }
  }

  return _warning
})()

const defer: Function = (_ => {
  let _defer

  if (processExists && typeof process.nextTick === 'function') {
    _defer = process.nextTick
  } else if (typeof setImmediate === 'function') {
    _defer = setImmediate
  } else {
    _defer = setTimeout
  }

  return callback => _defer(callback)
})()

type State = 'Pending' | 'Resolved' | 'Rejected'
const Pending = 'Pending'
const Resolved = 'Resolved'
const Rejected = 'Rejected'

// extract :: (Task<T> | T) => T
function extract(thing) {
  if (thing) {
    if (typeof thing === 'function' || typeof thing === 'object') {
      let called = false

      try {
        const isPromise = typeof thing.then === 'function'
        if (isPromise) {
          thing.then(value => {
            if (!called) {
              called = true
            }
          })
        }
      } catch (error) {}
    }
  }
  return void 0
}

export default function Task<T>(executor: (Function, Function) => void) {
  if (!(this instanceof Task)) {
    throw TypeError('Cannot call the Task class as a function')
  } else if (typeof executor !== 'function') {
    throw TypeError('Expected a function')
  } else if (executor.length < 1) {
    throw TypeError('Expected function to take at least one argument')
  }

  let value: ?T = void 0
  let state: State = Pending
  let resolveHandlers: Array<Function> = []
  let rejectHandlers: Array<Function> = []
  let hasCatch = false

  executor(
    function resolve(_value) {
      state = Resolved
      value = extract(_value)
    },
    function reject(reason) {
      state = Rejected
      value = extract(reason)
    }
  )

  // prettier-ignore
  // this.then = (onResolved?: ?T => ?T): Task<T> => {
  //   if (typeof onResolved === 'function') {
  //     return new Task((resolve, reject) => {
  //       try {
  //         // $FlowFixMe
  //         resolve(onResolved(value))
  //       } catch (error) {
  //         warning(!hasCatch, 'Unhandled promise rejection.')
  //         reject(error)
  //       }
  //     })
  //   }
  //   return this
  // }

  // prettier-ignore
  this.then = (onResolved?: ?T => (?T | ?Task<T>)): Task<T> => {
    if (typeof onResolved === 'function') {
      try {
        value = extract(onResolved(value))
        state = Resolved
      } catch (error) {
        state = Rejected
        value = error
      }
    }
    return this
  }

  // prettier-ignore
  // this.catch = (onRejected?: ?T => ?T): Task<T> => {
  //   hasCatch = true
  // }
}
