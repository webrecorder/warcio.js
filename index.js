require = require("esm")(module);
module.exports = {
  ...require("./main.js"), ...require('./streamserializers.js')
};

// ensure global Headers object is set for node
/* istanbul ignore next */
if (typeof process !== 'undefined' && typeof global === 'object') {
  if (typeof(global.Headers) === 'undefined') {
    global.Headers = require('node-fetch').Headers;
  }
}

