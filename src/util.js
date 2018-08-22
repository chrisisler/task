// @flow

const processExists = typeof process === 'object'

export const warning: Function = (_ => {
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

export const defer: Function = (_ => {
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
