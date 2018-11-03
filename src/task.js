const hasProcess = typeof process === 'object'

const defer =
  hasProcess && typeof process.nextTick === 'function'
    ? process.nextTick
    : typeof setImmediate === 'function'
      ? setImmediate
      : setTimeout

const warning =
  hasProcess &&
  process.env.NODE_ENV !== 'production' &&
  console != null &&
  typeof console.warn === 'function'
    ? function warning(condition, message) {
        if (condition) {
          console.warn('Warning: ' + message)
        }

        // Pump fake error throw so calls can be traced here.
        try {
          throw Error(message)
        } catch (_) {}
      }
    : function warningMuted() {}

const Pending = 'Pending'
const Resolved = 'Resolved'
const Rejected = 'Rejected'

export default function Task(executor) {
  if (!(this instanceof Task)) {
    throw TypeError('Task must be instantiated with `new` keyword')
  }

  let state = Pending
  let value = void 0
  let resolvedReactions = []
  let rejectedReactions = []
  let errorsHandled = false

  if (executor != void 0) {
    if (typeof executor !== 'function') {
      throw TypeError(
        `Expected a function, instead received ${typeof executor}`
      )
    } else {
      let executed = false

      try {
        executor(
          function resolve(value) {
            if (!executed) {
              executed = true
              settle(Resolved, value)
            }
          },
          function reject(reason) {
            if (!executed) {
              executed = true
              settle(Rejected, reason)
            }
          }
        )
      } catch (reason) {
        executed = true
        // warning(!errorsHandled, 'Unhandled Task rejection.')
        settle(Rejected, reason)
      }
    }
  }

  this.done = (resolveReaction, rejectReaction, _errorsHandled) => {
    // console.log('_errorsHandled is:', _errorsHandled)
    errorsHandled = _errorsHandled
    if (state === Pending) {
      resolvedReactions.push(resolveReaction)
      rejectedReactions.push(rejectReaction)
    } else {
      defer(() => {
        if (state === Resolved) {
          resolveReaction(value)
        } else if (state === Rejected) {
          // warning(!errorsHandled, 'Unhandled Task rejection.')
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

  function settle(completedState, completedValue) {
    if (state === Pending) {
      state = completedState
      value = completedValue

      defer(() => {
        let reactions =
          state === Resolved ? resolvedReactions : rejectedReactions

        reactions.forEach(reaction => {
          if (typeof reaction === 'function') {
            reaction(completedValue)
          }
        })

        resolvedReactions = null
        rejectedReactions = null
      })
    }
  }
}

Task.prototype = {
  constructor: Task,
  catch: function(rejectReaction) {
    // if (typeof onRejected === 'function') {
    //   errorsHandled = true // out of scope
    // }
    return this.then(void 0, rejectReaction)
  },
  then: function(onResolved, onRejected) {
    let task = new Task()

    const resolveReaction = resolvedValue => {
      if (typeof onResolved === 'function') {
        try {
          resolutionProcedure(task, onResolved(resolvedValue))
        } catch (error) {
          task.reject(error)
        }
      } else {
        task.resolve(resolvedValue)
      }
    }

    let _errorsHandled = false
    const rejectReaction = rejectedValue => {
      if (typeof onRejected === 'function') {
        _errorsHandled = true
        try {
          resolutionProcedure(task, onRejected(rejectedValue))
        } catch (error) {
          task.reject(error)
        }
      } else {
        task.reject(rejectedValue)
      }
    }

    this.done(resolveReaction, rejectReaction, _errorsHandled)

    return task
  }
}

function resolutionProcedure(task, x) {
  if (task === x) {
    task.reject(TypeError('The task and its value refer to the same object'))
  }

  if (x && (typeof x === 'function' || typeof x === 'object')) {
    let called = false
    let then

    try {
      then = x.then

      if (typeof then === 'function') {
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

// function isThenable(x: ?any): boolean {
function isThenable(x) {
  return (
    x != null &&
    (typeof x === 'object' || typeof x === 'function') &&
    'then' in x &&
    typeof x.then === 'function'
  )
}

function getClassName(x) {
  let ctor = x.constructor
  let className = ctor && ctor.name
  return className
}

Task.resolve = resolution => {
  return new Task(resolve => {
    resolve(resolution)
  })

  // if (isThenable(resolution)) {
  //   if (getClassName(resolution) === 'Task') {
  //     return resolution
  //   } else {
  //     return resolution.then(Task.resolve, Task.reject)
  //   }
  // } else {
  //   return new Task(resolve => {
  //     resolve(resolution)
  //   })
  // }
}

Task.reject = rejection => {
  return new Task((_, reject) => {
    reject(rejection)
  })

  // if (isThenable(rejection)) {
  //   if (getClassName(rejection) === 'Task') {
  //     return rejection
  //   } else {
  //     return rejection.then(Task.resolve, Task.reject)
  //   }
  // } else {
  //   return new Task((_, reject) => {
  //     reject(rejection)
  //   })
  // }
}
