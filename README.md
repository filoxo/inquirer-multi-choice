# inquirer-multi-choice [![npm version](https://badge.fury.io/js/inquirer-multi-choice.svg)](https://badge.fury.io/js/inquirer-multi-choice)

> A multiple choice prompt for [Inquirer.js](https://github.com/SBoudrias/Inquirer.js)

![Screen capture of the table prompt](screen-capture.gif)

## Installation

```
npm install --save inquirer-multi-choice
```

## Usage

After registering the prompt, set any question to have `type: "mutli-choice"` to make use of this prompt.

The result will be an array, containing the value for each row.

```js
inquirer.registerPrompt('multi-choice', require('inquirer-multi-choice'));

inquirer
  .prompt([
    {
      type: 'multi-choice',
      name: 'settings',
      message: 'Change settings',
      rows: [
        {
          name: 'Enabled',
          choices: ['on', 'off'],
        },
        {
          name: 'Color',
          choices: [
            {
              name: 'red',
              value: '#f00',
            },
            {
              name: 'green',
              value: '#0f0',
            },
            {
              name: 'blue',
              value: '#00f',
            },
          ],
        },
        {
          name: 'Log',
          default: 'false',
          choices: ['true', 'false'],
        },
      ],
    },
  ])
  .then((answers) => {
    console.log(answers);
    /*
      {
        settings: {
          Enabled: 'on',
          Color: 'red',
          Log: 'true'
        }
      }
    */
  });
```

### Options

- `rows`: Array of objects. Follows the same format as Inquirer's `choices`
