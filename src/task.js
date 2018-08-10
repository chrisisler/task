// @flow

const warning: Function =
  typeof process === 'object' && process.env.NODE_ENV === 'production'
    ? function noop() {}
    : function warning(condition: boolean, message: string) {
        if (condition) {
          if (console && typeof console.warn === 'function') {
            console.warn('Warning: ' + message)
          }

          try {
            // Throw error so people can trace calls here.
            throw Error(message)
          } catch (error) {
            // No.
          }
        }
      }

const defer: Function = (_ => {
  let _defer

  if (typeof process === 'object' && typeof process.nextTick === 'function') {
    _defer = process.nextTick
  } else if (typeof setImmediate === 'function') {
    _defer = setImmediate
  } else {
    _defer = setTimeout
  }

  return callback => _defer(callback)
})()

const Pending = 'Pending'
const Resolved = 'Resolved'
const Rejected = 'Rejected'

//todo
type State = Pending | Resolved | Rejected

export default class Task<T: any | void> {
  _status: State = Pending
  _value: T | void = void 0
  _resolveHandlers: Array<Function> = []
  _rejectHandlers: Array<Function> = []

  // constructor(f: (Function, Function) => void) {}
  constructor() {}

  // This current implementation uses the non-existent constructor
  static resolve(value: T | void): Task<T> {
    let task = new Task()

    if (value) {
      if (typeof value === 'function' || typeof value === 'object') {
        let called = false

        try {
          if (typeof value.then === 'function') {
            value.then(
              nextValue => {
                if (!called) {
                  called = true
                  task._settle(Resolved, nextValue)
                }
              },
              reason => {
                if (!called) {
                  called = true
                  task._settle(Rejected, reason)
                }
              },
            )
          } else {
            task._settle(Resolved, value)
          }
        } catch (error) {
          // Reject if accessing `.then` prop throws.
          if (!called) {
            called = true
            task._settle(Rejected, value)
          }
        }
      }
    } else {
      // Resolve/fulfill promise if unknown input type.
      task._settle(Resolved, value)

      // ???
      // task.then(value)
      // task.then(() => value)
    }

    // todo type errors
    return task
  }

  // TODO
  static reject(reason: T | mixed): Task<T> {
    return new Task()
  }

  // _done is only used by `task.then` and `task.catch`
  _done(resolveHandler: Function, rejectHandler: Function): void {
    if (this._status === Pending) {
      this._resolveHandlers.push(resolveHandler)
      this._rejectHandlers.push(rejectHandler)
    } else {
      defer(() => {
        if (this._status === Resolved && typeof resolveHandler === 'function') {
          resolveHandler(this._value)
        } else if (
          this._status === Rejected &&
          typeof rejectHandler === 'function'
        ) {
          rejectHandler(this._value)
        }
      })
    }
  }

  _settle(status: State, value: T): void {
    if (this._status !== Pending) {
      this._status = status
      this._value = value

      defer(() => {
        let handlers =
          status === Resolved ? this._resolveHandlers : this._rejectHandlers

        handlers.forEach(handle => {
          if (typeof handle === 'function') {
            handle(value)
          }
        })

        // Clear both arrays.
        this._resolveHandlers.length = this._rejectHandlers.length = 0
      })
    }
  }

  then(resolveHandler?: Function, rejectHandler?: Function): Task<T> {
    let task = new Task()

    const onResolve = value => {
      if (resolveHandler && typeof resolveHandler === 'function') {
        try {
          task = Task.resolve(resolveHandler(value))
        } catch (error) {
          task = Task.reject(error)
        }
      }
    }

    const onReject = reason => {
      if (rejectHandler && typeof rejectHandler === 'function') {
        warning(true, 'Prefer `.catch` rather than `.then` for error handling.')

        try {
          task = Task.resolve(rejectHandler(reason))
        } catch (error) {
          task = Task.reject(error)
        }
      }
    }

    this._done(onResolve, onReject)

    return task
  }

  // with deferred constuctor api
  // dev_then(onRes, onRej): Task<T> {
  //   return new Task((res, rej) => {
  //     if (onRes && typeof onRes === 'function') {
  //       try {
  //         res(onRes(this._value))
  //       } catch (error) {
  //         rej(error)
  //       }
  //     }
  //   })
  // }

  catch(rejectHandler: Function): Task<T> {
    return this.then(void 0, rejectHandler)
  }
}
