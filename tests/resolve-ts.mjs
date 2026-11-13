import { registerHooks } from "node:module";

// Claude Code loads a mod's files by their names without a suffix. Node needs the suffix, so the
// tests add it here, and the mod's files keep the form that Claude Code reads.
registerHooks({
  resolve(specifier, context, nextResolve) {
    const isLocal = specifier.startsWith("./") || specifier.startsWith("../");
    const hasSuffix = /\.[a-z]+$/.test(specifier);

    return nextResolve(isLocal && !hasSuffix ? `${specifier}.ts` : specifier, context);
  }
});
