# Task

> Super sick conformant implementation of Promises/A+

A Task is an object that is used as a placeholder for the eventual results of a
deferred (and possibly asynchronous) computation.

- Zero dependencies
- [Promises/A+](https://promisesaplus.com) compliant
- Cancellable

## Install

Not published on NPM yet.

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
```

Promises basically 

## Goals

- Implementation
- Cancellation API
- Helpful warnings
- `task.finally(fn)`
