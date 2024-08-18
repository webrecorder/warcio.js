import { Options, defineConfig } from "tsup";

const sharedConfig: Partial<Options> = {
  dts: true,
  minify: true,
  shims: true,
  splitting: false,
};

const nodeConfig: Options = {
  ...sharedConfig,
  clean: true,
  entry: ["src/index.ts", "src/cli.ts", "src/utils.ts", "src/node/index.ts"],
  platform: "node",
  format: ["esm", "cjs"],
};

const browserConfig: Options = {
  ...sharedConfig,
  clean: false,
  entry: ["src/index.ts"],
  platform: "browser",
  format: ["esm"],
  outExtension() {
    return {
      js: ".all.js",
    };
  },
  sourcemap: true,
  noExternal: ["pako", "uuid-random", "base32-encode"],
};

export default defineConfig((options) => {
  if (options.define && options.define.browser) {
    return browserConfig;
  } else {
    return nodeConfig;
  }
});
