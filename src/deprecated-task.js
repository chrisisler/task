// @flow

const warning: Function =
  typeof process === 'object' && process.env.NODE_ENV === 'production'
    ? function noop() {}
    : function warning(condition: boolean, message: string): void {
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

type State = 'Pending' | 'Resolved' | 'Rejected'
const Pending = 'Pending'
const Resolved = 'Resolved'
const Rejected = 'Rejected'

export default class Task<T: mixed | void> {
  status: State = Pending
  value: T | void = void 0
  _resolveHandlers: Array<Function> = []
  _rejectHandlers: Array<Function> = []

  static resolve(value: T): Task<T> {
    console.log('static resolve()')
    let task = new Task()

    if (value) {
      if (typeof value === 'function' || typeof value === 'object') {
        let called = false

        try {
          if (typeof value.then === 'function') {
            value
              .then(nextValue => {
                if (!called) {
                  called = true
                  task._settle(Resolved, nextValue)
                }
              })
              .catch(reason => {
                if (!called) {
                  called = true
                  task._settle(Rejected, reason)
                }
              })
          } else {
            task._settle(Resolved, value)
          }
        } catch (error) {
          if (!called) {
            called = true
            task._settle(Rejected, value)
          }
        }
      } else {
        task.status = Resolved
        task.value = value
        delete task._resolveHandlers
        delete task._rejectHandlers
      }
    } else {
      task._settle(Resolved, value)
    }

    return task
  }

  // TODO
  static reject(reason: T): Task<T> {
    console.log('static reject()')
    return new Task()
  }

  // _done is only used by `task.then` and `task.catch`
  _done(resolveHandler: Function, rejectHandler: Function): void {
    console.log('_done()')

    if (this.status === Pending) {
      this._resolveHandlers.push(resolveHandler)
      this._rejectHandlers.push(rejectHandler)
    } else {
      defer(() => {
        if (this.status === Resolved) {
          resolveHandler(this.value)
        } else if (this.status === Rejected) {
          rejectHandler(this.value)
        }
      })
    }
  }

  _settle(status: State, value: T): void {
    console.log('_settle()')
    if (this.status !== Pending) {
      this.status = status
      this.value = value

      defer(() => {
        let handlers =
          status === Resolved ? this._resolveHandlers : this._rejectHandlers

        handlers.forEach(h => {
          if (typeof h === 'function') {
            h(value)
          }
        })

        // Clear both arrays.
        this._resolveHandlers.length = this._rejectHandlers.length = 0
      })
    }
  }

  then(resolveHandler?: Function, rejectHandler?: Function): Task<T> {
    console.log('then()')

    let task = new Task()

    const onResolve = value => {
      console.log('onResolve()')

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
  //         res(onRes(this.value))
  //       } catch (error) {
  //         rej(error)
  //       }
  //     }
  //   })
  // }

  catch(rejectHandler: Function): Task<T> {
    console.log('catch()')
    return this.then(void 0, rejectHandler)
  }
}
