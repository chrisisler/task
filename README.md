# Task

> Super sick conformant implementation of Promises/A+

A Task is an object that is used as a placeholder for the eventual results of a
deferred (and possibly asynchronous) computation.

- Zero dependencies
- [Promises/A+](https://promisesaplus.com) compliant
- Same behavior as ES6 Promises
- Cancellable [WIP]

## Install

Not published yet.

## Usage

```javascript
import Task from 'task'

let task = new Task((resolve, reject) => {
  resolve('yay!')
})

task
  .then(value => {
    console.log(value)
  })
  .catch(error => {
    console.error(error)
  })
  .finally(() => {
    console.log('done!')
  })
```

## Goals

- `Task#cancel`
