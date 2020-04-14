#!/usr/bin/env node

require = require("esm")(module);

// ===========================================================================
/* istanbul ignore if */
if (require.main === module) {
  require("./src/cli_main.js").main();
}


