// @flow

const hasProcess = isObject(process)

const defer =
  hasProcess && isFunction(process.nextTick)
    ? process.nextTick
    : isFunction(setImmediate)
      ? setImmediate
      : setTimeout

const warning =
  hasProcess &&
  process.env.NODE_ENV !== 'production' &&
  isDefined(console) &&
  isFunction(console.warn)
    ? function warning(condition: boolean, message: string): void {
        if (condition) {
          console.warn('Warning: ' + message)
        }

        // Pump fake error throw so calls can be traced here.
        try {
          throw Error(message)
        } catch (_) {}
      }
    : function warningMuted(condition: boolean, message: string): void {}

const Pending = Symbol('Pending')
const Resolved = Symbol('Resolved')
const Rejected = Symbol('Rejected')

type State = Symbol
type TaskType = *
type Executor = (resolve: (any) => void, reject: (any) => void) => void
type Reaction = any => void

export default function Task(executor?: Executor) {
  if (!(this instanceof Task)) {
    throw TypeError('Task must be instantiated with `new` keyword')
  }

  let value = void 0
  let state: State = Pending
  let resolvedReactions: ?Array<Reaction> = []
  let rejectedReactions: ?Array<Reaction> = []

  if (executor != void 0) {
    if (!isFunction(executor)) {
      throw TypeError(
        `Expected a function, instead received ${typeof executor}`
      )
    } else {
      let executed = false

      const reject = (reason: any): void => {
        if (!executed) {
          executed = true
          settle(Rejected, reason)
        }
      }

      const resolve = (value: any): void => {
        if (!executed) {
          executed = true
          settle(Resolved, value)
        }
      }

      try {
        const result = executor(resolve, reject)
        warning(
          result != null,
          'Returning a value is a no-op. Call `resolve` or `reject` instead.'
        )
      } catch (reason) {
        reject(reason)
      }
    }
  }

  this.done = (resolveReaction: Reaction, rejectReaction: Reaction): void => {
    if (state === Pending) {
      // $FlowFixMe - This array will be defined at this time.
      resolvedReactions.push(resolveReaction)
      // $FlowFixMe - This array will be defined at this time.
      rejectedReactions.push(rejectReaction)
    } else {
      defer(() => {
        if (state === Resolved) {
          resolveReaction(value)
        } else if (state === Rejected) {
          rejectReaction(value)
        }
      })
    }
  }

  this.resolve = resolvedValue => {
    settle(Resolved, resolvedValue)
  }

  this.reject = rejectedValue => {
    settle(Rejected, rejectedValue)
  }

  function settle(completedState: State, completedValue: any): void {
    if (state === Pending) {
      state = completedState
      value = completedValue

      defer(() => {
        let reactions =
          state === Resolved ? resolvedReactions : rejectedReactions

        // $FlowFixMe - This array will be defined at this time.
        reactions.filter(isFunction).forEach((r: Reaction) => {
          r(value)
        })

        resolvedReactions = null
        rejectedReactions = null
      })
    }
  }
}

Task.prototype = {
  constructor: Task,
  catch: function(onRejected?: any => ?any): TaskType {
    return this.then(void 0, onRejected)
  },
  then: function(onResolved?: any => ?any, onRejected?: any => ?any): TaskType {
    let task = new Task()

    const hasOnResolved = isFunction(onResolved)
    const resolveReaction: Reaction = resolvedValue => {
      if (hasOnResolved) {
        try {
          // $FlowFixMe - `onResolved` is a function in this block.
          resolutionProcedure(task, onResolved(resolvedValue))
        } catch (error) {
          task.reject(error)
        }
      } else {
        task.resolve(resolvedValue)
      }
    }

    const rejectReaction: Reaction = rejectedValue => {
      if (isFunction(onRejected)) {
        // `foo.then(onRes, onRej)` is an anti-pattern, warn the user.
        // warning(
        //   hasOnResolved,
        //   'Prefer using Task#catch over Task#then for error propagation'
        // )
        try {
          resolutionProcedure(task, onRejected(rejectedValue))
        } catch (error) {
          task.reject(error)
        }
      } else {
        task.reject(rejectedValue)
      }
    }

    this.done(resolveReaction, rejectReaction)

    return task
  }
  // finally: function() {
  // TODO
  // }
}

function resolutionProcedure(task: TaskType, x: any): void {
  if (task === x) {
    task.reject(TypeError('The task and its value refer to the same object'))
  }

  if (x != null && (isFunction(x) || typeof x === 'object')) {
    let called = false
    let then

    try {
      then = x.then

      if (isFunction(then)) {
        then.call(
          x,
          resolvedValue => {
            if (!called) {
              called = true
              resolutionProcedure(task, resolvedValue)
            }
          },
          rejectedValue => {
            if (!called) {
              called = true
              task.reject(rejectedValue)
            }
          }
        )
      } else {
        task.resolve(x)
      }
    } catch (error) {
      if (!called) {
        called = true
        task.reject(error)
      }
    }
  } else {
    task.resolve(x)
  }
}

function isThenable(x: any): boolean %checks {
  return isDefined(x) && (isObject(x) || isFunction(x)) && isFunction(x.then)
}

function isObject(x: mixed): boolean %checks {
  return x !== null && typeof x === 'object'
}

function isDefined(x: any): boolean %checks {
  return x !== void 0 || x !== null
}

function isFunction(x: any): boolean %checks {
  return typeof x === 'function'
}

Task.resolve = (resolution: any): TaskType => {
  if (resolution instanceof Task) {
    return resolution
  } else {
    return new Task(resolve => {
      resolve(resolution)
    })
  }
}

Task.reject = (rejection: any): TaskType => {
  // If `rejection` is a thenable it is NOT flattened (per ES6 behavior).
  return new Task((_, reject) => {
    reject(rejection)
  })
}

Task.all = (array: Array<any>): TaskType => {
  if (!Array.isArray(array)) {
    return Task.reject(TypeError(`Expected Array, received ${typeof array}`))
  } else if (array.length === 0) {
    return Task.resolve([])
  } else if (!array.some(isThenable)) {
    return Task.resolve(array)
  } else {
    return new Task((resolve, reject) => {
      let pending = array.length
      let resolved = []

      const pushResolve = (value: any): void => {
        resolved.push(value)
        pending -= 1
        if (pending === 0) {
          resolve(resolved)
        }
      }

      array.forEach(value => {
        if (isThenable(value)) {
          value.then(pushResolve, reject)
        } else {
          defer(() => pushResolve(value))
        }
      })
    })
  }
}

Task.race = (tasks: Array<TaskType>): TaskType => {
  // Exploits the execute-only-once behavior of the given executor functions
  // (resolve/reject) to return the first task to call `resolve` or `reject`
  return new Task((resolve, reject) => {
    tasks.forEach(task => {
      task.then(resolve).catch(reject)
    })
  })
}
