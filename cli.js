#!/usr/bin/env node

(async () => {
  const {main} = await import("./src/cli_main.js");

  main();

})();
