const fs = require('node:fs');
const path = require('node:path');

module.exports = function workerSource(context) {
  const workerPath = path.resolve(__dirname, '../src/worker.mjs');

  // The VM tests access private worker functions, so load the module imports
  // into the test context before evaluating the worker body as a script.
  return fs.readFileSync(workerPath, 'utf8')
    .replace(/^import \{ (\w+) \} from '([^']+)';$/gm, (_, name, specifier) => {
      context[name] = require(path.resolve(path.dirname(workerPath), specifier))[name];
      return '';
    })
    .replace('export default {', 'const worker={')
    .replace('export class GameRoom', 'class GameRoom');
};
