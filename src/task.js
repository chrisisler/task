// @flow

function unimplemented() {
  throw Error('unimplemented')
}

export default class Task<T> {
  static resolve(value: any | undefined) {
    unimplemented()
  }

  static reject(reason: mixed | undefined) {
    unimplemented()
  }

  then(f: Function) {
    unimplemented()
  }

  catch(f: Function) {
    unimplemented()
  }
}
