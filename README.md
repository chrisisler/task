# Task

> Super sick conformant implementation of Promises/A+

- Zero dependencies
- Same API as ES6 Promises
- Adds cancellation
- [Promises/A+](https://promisesaplus.com)

## Install

Not published yet.

## Usage

```javascript
import Task from 'task'

let promise = new Task((resolve, reject) => {
  resolve('yay!')
})

promise
  .then(resolved => {
    console.log(resolved)
  })
  .catch(reason => {
    console.error(reason)
  })
```

## Goals

- Implementation (WIP)
- Cancellation API
- Deferred constructor API: `new Task((resolve, reject) => {})`
  - Should reduce API surface: `_done()`
- Helpful warnings (see Bluebird)
- Try out Prepacc
