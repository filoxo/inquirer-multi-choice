const chalk = require('chalk');
const cliCursor = require('cli-cursor');
const Base = require('inquirer/lib/prompts/base');
const Choices = require('inquirer/lib/objects/choices');
const observe = require('inquirer/lib/utils/events');
const { map, takeUntil } = require('rxjs/operators');

// @ts-check

class TablePrompt extends Base {
  /**
   * Initialise the prompt
   *
   * @param  {Object} questions
   * @param  {Object} rl
   * @param  {Object} answers
   */
  constructor(questions, rl, answers) {
    super(questions, rl, answers);

    this.cursorY = 0;
    this.cursorX = 0;
    this.rows = new Choices(this.opt.rows, []);
    // columns == row choices
    this.columns = this.opt.rows.map((row) => new Choices(row.choices, []));
    // values == "selected choices"
    this.values = this._toArray(this.rows).map((v) => v.default);
  }

  /**
   * Start the inquirer session
   *
   * @param  {Function} callback
   * @return {TablePrompt}
   */
  _run(callback) {
    this.done = callback;

    const events = observe(this.rl);
    const validation = this.handleSubmitEvents(
      events.line.pipe(map(this.getCurrentValue.bind(this)))
    );
    validation.success.forEach(this.onEnd.bind(this));
    validation.error.forEach(this.onError.bind(this));

    events.keypress.forEach(({ key }) => {
      switch (key.name) {
        case 'left':
          return this.onLeftKey();

        case 'right':
          return this.onRightKey();
      }
    });

    events.normalizedUpKey
      .pipe(takeUntil(validation.success))
      .forEach(this.onUpKey.bind(this));
    events.normalizedDownKey
      .pipe(takeUntil(validation.success))
      .forEach(this.onDownKey.bind(this));
    events.spaceKey
      .pipe(takeUntil(validation.success))
      .forEach(this.onSpaceKey.bind(this));

    if (this.rl.line) {
      this.onKeypress();
    }

    cliCursor.hide();
    this.render();

    return this;
  }

  getCurrentValue() {
    return Object.fromEntries(
      this._toArray(this.rows).map((row, index) => [
        row.name,
        this.values[index],
      ])
    );
  }

  offsetYForXMovement() {
    const maxCursorY = this.columns[this.cursorX].realLength;
    if (maxCursorY <= this.cursorY) this.cursorY = maxCursorY - 1;
  }

  onSpaceKey() {
    const value = this.columns[this.cursorX].get(this.cursorY).value;
    this.values[this.cursorX] = value;
    this.spaceKeyPressed = true;
    this.render();
  }

  onUpKey() {
    this.cursorX = this.cursorX > 0 ? this.cursorX - 1 : this.cursorX;
    this.offsetYForXMovement();
    this.render();
  }

  onDownKey() {
    const length = this.rows.realLength;
    this.cursorX = this.cursorX < length - 1 ? this.cursorX + 1 : this.cursorX;
    this.offsetYForXMovement();
    this.render();
  }

  onLeftKey() {
    const length = this.columns[this.cursorX].realLength;
    this.cursorY = this.cursorY > 0 ? this.cursorY - 1 : length - 1;
    this.render();
  }

  onRightKey() {
    const length = this.columns[this.cursorX].realLength;
    this.cursorY = this.cursorY < length - 1 ? this.cursorY + 1 : 0;
    this.render();
  }

  onEnd(state) {
    this.status = 'answered';
    this.spaceKeyPressed = true;

    this.render();

    this.screen.done();
    cliCursor.show();
    this.done(state.value);
  }

  onError(state) {
    this.render(state.isValid);
  }

  render(error) {
    let message = this.getQuestion();
    let bottomContent = '';

    if (!this.spaceKeyPressed) {
      bottomContent += chalk.dim(
        `(Use ${chalk.cyan.bold('<up/down>')} to move rows, ${chalk.cyan.bold(
          '<left/right>'
        )} to move between options, ${chalk.cyan.bold(
          '<space>'
        )} to select, and ${chalk.cyan.bold('<enter>')} to finish)`
      );
    }

    const table = this._toArray(this.rows)
      .map((row, rowIndex) => {
        const selectedValue = this.values[rowIndex];
        const options = this.columns[rowIndex].choices
          .map((choice, columnIndex) => {
            const highlighted =
              this.status !== 'answered' &&
              this.cursorX === rowIndex &&
              this.cursorY === columnIndex;

            let value =
              choice.value === selectedValue
                ? chalk.cyan(choice.name)
                : choice.name;

            if (highlighted) value = chalk.inverse(value);

            return value;
          })
          .join(' | '); // TODO: make configurable as option
        let rowText = `${this._clamp(row.name)}${options}`;
        return selectedValue === undefined ? chalk.dim(rowText) : rowText;
      })
      .join('\n');

    message += '\n\n' + table;

    if (error) {
      bottomContent = chalk.red('>> ') + error;
    }

    this.screen.render(message, bottomContent);
  }

  _toArray(a) {
    return a.filter(() => true);
  }
  // TODO: make configurable as option
  _clamp(s, n = 25) {
    if (s.trim().length > n) s = s.slice(0, n - 3) + '...';
    return s.padEnd(n + 4);
  }
}

module.exports = TablePrompt;
