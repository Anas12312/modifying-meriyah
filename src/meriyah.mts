import { Context } from './common.mjs';
import { parseSource, Options } from './parser.mjs';
import * as ESTree from './estree.mjs';
// Current version

/**
 * Parse a script, optionally with various options.
 */
export function parseScript(source: string, options?: Options): ESTree.Program {
  return parseSource(source, options, Context.None);
}

/**
 * Parse a module, optionally with various options.
 */
export function parseModule(source: string, options?: Options): ESTree.Program {
  return parseSource(source, options, Context.Strict | Context.Module);
}

/**
 * Parse a module or a script, optionally with various options.
 */
export function parse(source: string, options?: Options): ESTree.Program {
  return parseSource(source, options, Context.None);
}

export { Options, ESTree };
