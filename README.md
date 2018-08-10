# Task

> Super sick conformant implementation of Promises/A+

## Install

```sh
yarn add Task
```

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
