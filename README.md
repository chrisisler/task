# Task

> Super sick conformant implementation of Promises/A+

## Install

Not published yet.

## Usage

```javascript
import Task from 'task'

let result = new Task((resolve, reject) => {
  resolve('yay!')
})

task
  .then(resolved => {
    console.log(resolved)
  })
  .catch(reason => {
    console.error(reason)
  })
```

## API

Work in progress.

## Goals

- Implementation
- Cancellation API (`task.cancel()`)
- Deferred constructor API (`new Task((resolve, reject) => {})`)
  - Should reduce API surface
