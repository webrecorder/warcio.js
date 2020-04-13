import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';

export default {
  input: 'main.js',
  output: [
    {
      file: 'dist/warcio.min.js',
      format: 'esm',
      plugins: [terser()]
    },
    {
      file: 'dist/warcio.js',
      format: 'esm',
    }
  ],
  plugins: [commonjs(), resolve()]
};

