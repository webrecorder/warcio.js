/*eslint-env node */

import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import { terser } from "rollup-plugin-terser";
import license from "rollup-plugin-license";

export default {
  input: "main.js",
  output: [
    {
      file: "dist/warcio.min.js",
      format: "esm",
      plugins: [terser()]
    },
    {
      file: "dist/warcio.js",
      format: "esm",
    }
  ],
  plugins: [
    commonjs(),
    resolve({ browser: true }),
    license({
      banner: "This file is part of Webrecorder warcio.js, released under the MIT license.\nSee https://github.com/webrecorder/warcio.js for more info. Copyright (C) 2020, Webrecorder Software"
    })
  ]
};

