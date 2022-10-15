#!/usr/bin/env node

/*eslint-env node */
// eslint-disable-next-line no-global-assign
require = require("esm")(module);

// ===========================================================================
/* istanbul ignore if */
if (require.main === module) {
  require("./src/cli_main.js").main();
}


