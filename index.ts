/*eslint-env node */

// eslint-disable-next-line no-global-assign
require = require("esm")(module);
module.exports = {
  ...require("./main.js")
};

// ensure global Headers object is set for node
/* istanbul ignore next */
if (typeof process !== "undefined" && typeof global === "object") {
  if (typeof(global.Headers) === "undefined") {
    global.Headers = require("node-fetch").Headers;
  }
  if (typeof(global.Crypto) === "undefined") {
    const { Crypto } = require("@peculiar/webcrypto");
    global.crypto = new Crypto();
  }
}

