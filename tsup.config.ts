import { defineConfig } from 'tsup';

const sharedConfig = {
  dts: true,
  minify: true,
  shims: true,
  splitting: false
}


const nodeConfig = {
  ...sharedConfig,
  clean: true,
  entry: ["src/index.ts", "src/cli.ts", "src/utils.ts", "src/lib/tempfilebuffer.ts"],
  platform: "node",
  format: ["esm", "cjs"],
}


const browserConfig = {
  ...sharedConfig,
  clean: false,
  entry: ["src/index.ts"],
  platform: "browser",
  format: ["esm"],
  outExtension() {
    return {
      js: `.all.js`,
    }
  },
  sourcemap: true,
  noExternal: ["pako", "uuid-random", "base32-encode"]
};


export default defineConfig((options) => {
  console.log(options);
  if (options.define && options.define.browser) {
    return browserConfig;
  } else {
    return nodeConfig;
  }
});
