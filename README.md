# Task

> Super sick conformant implementation of Promises/A+

- Zero dependencies
- [Promises/A+](https://promisesaplus.com) compliant
- Adds cancellation

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
```

## Goals

- Implementation (WIP)
- Cancellation API
- Helpful warnings (see Bluebird)
- Try out Prepacc
