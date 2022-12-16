export default {
  clean: true,
  dts: true,
  entry: ["src/index.ts", "src/cli.ts", "src/util.ts"],
  format: ["esm", "cjs"],
  minify: true,
  shims: true,
  sourcemap: true,
  splitting: false,
};
