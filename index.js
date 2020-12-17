const chalk = require('chalk');
const cliCursor = require('cli-cursor');
const figures = require('figures');
const Base = require('inquirer/lib/prompts/base');
const Choices = require('inquirer/lib/objects/choices');
const observe = require('inquirer/lib/utils/events');
// const Table = require('cli-table');
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

    this.cursorX = 0;
    this.cursorY = 0;
    this.rows = new Choices(this.opt.rows, []);
    // columns == row choices
    this.columns = this.opt.rows.map((row) => new Choices(row.choices, []));
    // values == "selected choices"
    this.values = Array.from(this.columns).map(() => undefined);
    this.pageSize = this.opt.pageSize || 10;
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
    const currentValue = [];

    this.rows.forEach((row, rowIndex) => {
      currentValue.push(this.values[rowIndex]);
    });

    return currentValue;
  }

  onDownKey() {
    const length = this.rows.realLength;

    this.cursorX = this.cursorX < length - 1 ? this.cursorX + 1 : this.cursorX;
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

  onSpaceKey() {
    const value = this.columns[this.cursorX].get(this.cursorY).value;
    this.values[this.cursorX] = value;
    this.spaceKeyPressed = true;
    this.render();
  }

  onUpKey() {
    this.cursorX = this.cursorX > 0 ? this.cursorX - 1 : this.cursorX;
    this.render();
  }

  paginate() {
    const middleOfPage = Math.floor(this.pageSize / 2);
    const firstIndex = Math.max(0, this.cursorX - middleOfPage);
    const lastIndex = Math.min(
      firstIndex + this.pageSize - 1,
      this.rows.realLength - 1
    );
    const lastPageOffset = this.pageSize - 1 - lastIndex + firstIndex;

    return [Math.max(0, firstIndex - lastPageOffset), lastIndex];
  }

  render(error) {
    let message = this.getQuestion();
    let bottomContent = '';

    if (!this.spaceKeyPressed) {
      message += `(Press ${chalk.cyan.bold(
        '<space>'
      )} to select, ${chalk.cyan.bold(
        '<Up/Down>'
      )} to move rows, ${chalk.cyan.bold('<Left/Right>')} to make a choice)`;
    }

    const table = this._toArray(this.rows)
      .map((row, rowIndex) => {
        const optionsToPrint = this.columns[rowIndex].choices
          .map((choice, columnIndex) => {
            const isSelected =
              this.status !== 'answered' &&
              this.cursorX === rowIndex &&
              this.cursorY === columnIndex;

            let value =
              choice.value === this.values[rowIndex]
                ? chalk.cyan(choice.value)
                : choice.value;

            if (isSelected) value = chalk.inverse(value);

            return value;
          })
          .join(' | ');
        return `${row.name}\t\t${optionsToPrint}`;
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
}

module.exports = TablePrompt;
