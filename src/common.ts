import { Token, KeywordDescTable } from './token';
import { Errors, report } from './errors';
import { Node, Comment } from './estree';
import { nextToken } from './lexer/scan';

/**
 * The core context, passed around everywhere as a simple immutable bit set.
 */
export const enum Context {
  None = 0,
  OptionsNext = 1 << 0,
  OptionsRanges = 1 << 1,
  OptionsLoc = 1 << 2,
  OptionsDirectives = 1 << 3,
  OptionsJSX = 1 << 4,
  OptionsGlobalReturn = 1 << 5,
  OptionsLexical = 1 << 6,
  OptionsPreserveParens = 1 << 7,
  OptionsWebCompat = 1 << 8,
  OptionsRaw = 1 << 9,
  Strict = 1 << 10,
  Module = 1 << 11, // Current code should be parsed as a module body
  InSwitch = 1 << 12,
  InGlobal = 1 << 13,
  InClass = 1 << 14,
  AllowRegExp = 1 << 15,
  TaggedTemplate = 1 << 16,
  InIteration = 1 << 17,
  SuperProperty = 1 << 18,
  SuperCall = 1 << 19,
  InYieldContext = 1 << 21,
  InAwaitContext = 1 << 22,
  InArgumentList = 1 << 23,
  InConstructor = 1 << 24,
  InMethod = 1 << 25,
  AllowNewTarget = 1 << 26,
  DisallowIn = 1 << 27,
  OptionsIdentifierPattern = 1 << 28,
  OptionsSpecDeviation = 1 << 29,
}

export const enum PropertyKind {
  None = 0,
  Method = 1 << 0,
  Computed = 1 << 1,
  Shorthand = 1 << 2,
  Generator = 1 << 3,
  Async = 1 << 4,
  Static = 1 << 5,
  Constructor = 1 << 6,
  ClassField = 1 << 7,
  Getter = 1 << 8,
  Setter = 1 << 9,
  Extends = 1 << 10,
  Literal = 1 << 11,
  PrivateField = 1 << 12,
  GetSet = Getter | Setter
}

export const enum BindingKind {
  None = 0,
  ArgumentList = 1 << 0,
  EmptyBinding  = 1 << 1,
  Variable = 1 << 2,
  Let = 1 << 3,
  Const = 1 << 4,
  Class = 1 << 5,
  FunctionLexical = 1 << 6,
  FunctionStatement = 1 << 7,
  CatchPattern = 1 << 8,
  CatchIdentifier  = 1 << 9,
  CatchIdentifierOrPattern = CatchIdentifier | CatchPattern,
  LexicalOrFunction = Variable | FunctionLexical,
  LexicalBinding = Let | Const | FunctionLexical | FunctionStatement | Class
}

export const enum BindingOrigin {
  None = 0,
  Declaration = 1 << 0,
  Arrow = 1 << 1,
  ForStatement = 1 << 2,
  Statement = 1 << 3,
  Export = 1 << 4,
  Other = 1 << 5,
  BlockStatement = 1 << 7,
  TopLevel = 1 << 8,
}

export const enum AssignmentKind {
  None = 0,
  Assignable = 1 << 0,
  NotAssignable = 1 << 1
}

export const enum DestructuringKind {
  None = 0,
  MustDestruct = 1 << 3,
  CannotDestruct = 1 << 4,
  // Only destructible if assignable
  AssignableDestruct = 1 << 5,
  // `__proto__` is a special case and only valid to parse if destructible
  SeenProto = 1 << 6,
  Await = 1 << 7,
  Yield = 1 << 8
}

/**
 * The mutable parser flags, in case any flags need passed by reference.
 */
export const enum Flags {
  None = 0,
  NewLine = 1 << 0,
  HasConstructor = 1 << 5,
  Octals = 1 << 6,
  SimpleParameterList = 1 << 7,
  HasStrictReserved = 1 << 8,
  StrictEvalArguments = 1 << 9,
}

export const enum HoistedClassFlags {
  None,
  Hoisted = 1 << 0,
  Export = 1 << 1
}

export const enum HoistedFunctionFlags {
  None,
  Hoisted = 1 << 0,
  Export = 1 << 1
}

/**
 * Scope types
 */
export const enum ScopeKind {
  None = 0,
  For = 1 << 0,
  Block = 1 << 1,
  Catch = 1 << 2,
  Switch = 1 << 3,
  ArgList = 1 << 4,
  Try = 1 << 5,
  CatchHead = 1 << 6,
  CatchBody = 1 << 7,
  Finally = 1 << 8,
  FuncBody = 1 << 9,
  FuncRoot = 1 << 10,
  ArrowParams = 1 << 11,
  FakeBlock = 1 << 12,
  Global = 1 << 13,
  CatchIdentifier = 1 << 14,
  ForHeader = 1 << 15,
  FunctionParams = 1 << 16
}

/**
 * The type of the `onComment` option.
 */
export type OnComment = void | Comment[] | ((type: string, value: string, start?: number, end?: number) => any);

/**
 * Lexical scope interface
 */
export interface ScopeState {
  parent: ScopeState | undefined;
  type: ScopeKind;
  scopeError?: ScopeError | null;
}

/** Scope error interface */
export interface ScopeError {
  type: Errors;
  index: number;
  line: number;
  column: number;
}

/**
 * The parser interface.
 */
export interface ParserState {
  source: string;
  flags: Flags;
  index: number;
  line: number;
  column: number;
  tokenPos: number;
  startPos: number;
  startColumn: number;
  startLine: number;
  colPos: number;
  linePos: number;
  end: number;
  token: Token;
  onComment: any;
  tokenValue: any;
  tokenRaw: string;
  tokenRegExp: void | {
    pattern: string;
    flags: string;
  };
  sourceFile: string | void;
  assignable: AssignmentKind | DestructuringKind;
  destructible: AssignmentKind | DestructuringKind;
  nextCP: number;
  exportedNames: any;
  exportedBindings: any;
}

/**
 * Check for automatic semicolon insertion according to the rules
 * given in `ECMA-262, section 7.9, page 21`.
 *
 * @param parser Parser object
 * @param context Context masks
 */

export function matchOrInsertSemicolon(parser: ParserState, context: Context, specDeviation?: number): void {
  if ((parser.flags & Flags.NewLine) === 0 && (parser.token & Token.IsAutoSemicolon) !== Token.IsAutoSemicolon
  && !specDeviation) {
    report(parser, Errors.UnexpectedToken, KeywordDescTable[parser.token & Token.Type]);
  }
  consumeOpt(parser, context, Token.Semicolon);
}

export function isValidStrictMode(parser: ParserState, index: number, tokenPos: number, tokenValue: string): 0 | 1 {
  if (index - tokenPos < 13 && tokenValue === 'use strict') {
    if ((parser.token & Token.IsAutoSemicolon) === Token.IsAutoSemicolon || parser.flags & Flags.NewLine) {
      return 1;
    }
  }
  return 0;
}

/**
 * Consumes the current token if the current token kind is
 * the specified `kind` and returns `0`. Otherwise returns `1`.
 *
 * @param parser Parser state
 * @param context Context masks
 * @param token The type of token to consume
 */
export function optionalBit(parser: ParserState, context: Context, t: Token): 0 | 1 {
  if (parser.token !== t) return 0;
  nextToken(parser, context);
  return 1;
}

/** Consumes the current token if the current token kind is
 * the specified `kind` and returns `true`. Otherwise returns
 * `false`.
 *
 * @param parser Parser state
 * @param context Context masks
 * @param token The type of token to consume
 */
export function consumeOpt(parser: ParserState, context: Context, t: Token): boolean {
  if (parser.token !== t) return false;
  nextToken(parser, context);
  return true;
}

/**
 * Consumes the current token. If the current token kind is not
 * the specified `kind`, an error will be reported.
 *
 * @param parser Parser state
 * @param context Context masks
 * @param t The type of token to consume
 */
export function consume(parser: ParserState, context: Context, t: Token): void {
  if (parser.token !== t) report(parser, Errors.ExpectedToken, KeywordDescTable[t & Token.Type]);
  nextToken(parser, context);
}

/**
 * Transforms a `LeftHandSideExpression` into a `AssignmentPattern` if possible,
 * otherwise it returns the original tree.
 *
 * @param parser Parser state
 * @param {*} node
 */
export function reinterpretToPattern(state: ParserState, node: any): void {
  switch (node.type) {
    case 'ArrayExpression':
      node.type = 'ArrayPattern';
      const elements = node.elements;
      for (let i = 0, n = elements.length; i < n; ++i) {
        const element = elements[i];
        if (element) reinterpretToPattern(state, element);
      }
      return;
    case 'ObjectExpression':
      node.type = 'ObjectPattern';
      const properties = node.properties;
      for (let i = 0, n = properties.length; i < n; ++i) {
        reinterpretToPattern(state, properties[i]);
      }
      return;
    case 'AssignmentExpression':
      node.type = 'AssignmentPattern';
      if (node.operator !== '=') report(state, Errors.InvalidDestructuringTarget);
      delete node.operator;
      reinterpretToPattern(state, node.left);
      return;
    case 'Property':
      reinterpretToPattern(state, node.value);
      return;
    case 'SpreadElement':
      node.type = 'RestElement';
      reinterpretToPattern(state, node.argument);
    default: // ignore
  }
}

/**
 * Validates binding identifier
 *
 * @param parser Parser state
 * @param context Context masks
 * @param type Binding type
 * @param token Token
 */

export function validateBindingIdentifier(
  parser: ParserState,
  context: Context,
  type: BindingKind,
  t: Token,
  skipEvalArgCheck: 0 | 1
): void {
  if ((t & Token.Keyword) !== Token.Keyword) return;

  if (context & Context.Strict) {
    if (t === Token.StaticKeyword) {
      report(parser, Errors.InvalidStrictStatic);
    }

    if ((t & Token.FutureReserved) === Token.FutureReserved) {
      report(parser, Errors.FutureReservedWordInStrictModeNotId);
    }

    if (!skipEvalArgCheck && (t & Token.IsEvalOrArguments) === Token.IsEvalOrArguments) {
      report(parser, Errors.StrictEvalArguments);
    }

    if (t === Token.EscapedFutureReserved) {
      report(parser, Errors.InvalidEscapedKeyword);
    }
  }

  if ((t & Token.Reserved) === Token.Reserved) {
    report(parser, Errors.KeywordNotId);
  }

   // The BoundNames of LexicalDeclaration and ForDeclaration must not
   // contain 'let'. (CatchParameter is the only lexical binding form
   // without this restriction.)
  if (type & (BindingKind.Let | BindingKind.Const) && t === Token.LetKeyword) {
    report(parser, Errors.InvalidLetConstBinding);
  }

  if (context & (Context.InAwaitContext | Context.Module) && t === Token.AwaitKeyword) {
    report(parser, Errors.AwaitOutsideAsync);
  }

  if (context & (Context.InYieldContext | Context.Strict) && t === Token.YieldKeyword) {
    report(parser, Errors.DisallowedInContext, 'yield');
  }

  if (t === Token.EscapedReserved) {
    report(parser, Errors.InvalidEscapedKeyword);
  }
}

/**
 * Validates binding identifier
 *
 * @param parser Parser state
 * @param context Context masks
 * @param t Token
 */

export function isStrictReservedWord(parser: ParserState, context: Context, t: Token): boolean {
  if (t === Token.AwaitKeyword) {
    if (context & (Context.InAwaitContext | Context.Module)) report(parser, Errors.AwaitOutsideAsync);
    parser.destructible |= DestructuringKind.Await;
  }

  if (t === Token.YieldKeyword && context & Context.InYieldContext) report(parser, Errors.DisallowedInContext, 'yield');

  return (
    (t & Token.Reserved) === Token.Reserved ||
    (t & Token.FutureReserved) === Token.FutureReserved ||
    t == Token.EscapedFutureReserved
  );
}

/**
 * Checks if the property has any private field key
 *
 * @param parser Parser object
 * @param context  Context masks
 */
export function isPropertyWithPrivateFieldKey(expr: any): boolean {
  return !expr.property ? false : expr.property.type === 'PrivateName';
}

/**
 * Checks if a label in `LabelledStatement` are valid or not
 *
 * @param parser Parser state
 * @param labels Object holding the labels
 * @param name Current label
 * @param isIterationStatement
 */
export function isValidLabel(parser: ParserState, labels: any, name: string, isIterationStatement: 0 | 1): 0 | 1 {
  while (labels) {
    if (labels['$' + name]) {
      if (isIterationStatement) report(parser, Errors.InvalidNestedStatement);
      return 1;
    }
    if (isIterationStatement && labels.loop) isIterationStatement = 0;
    labels = labels['$'];
  }

  return 0;
}

/**
 * Checks if current label already have been declrared, and if not
 * declare it
 *
 * @param parser Parser state
 * @param labels Object holding the labels
 * @param name Current label
 */
export function validateAndDeclareLabel(parser: ParserState, labels: any, name: string): void {
  let set = labels;
  while (set) {
    if (set['$' + name]) report(parser, Errors.LabelRedeclaration, name);
    set = set['$'];
  }

  labels['$' + name] = 1;
}

export function finishNode<T extends Node>(
  parser: ParserState,
  context: Context,
  start: number,
  line: number,
  column: number,
  node: T
): T {
  if (context & Context.OptionsRanges) {
    node.start = start;
    node.end = parser.startPos;
  }

  if (context & Context.OptionsLoc) {
    node.loc = {
      start: {
        line,
        column
      },
      end: {
        line: parser.startLine,
        column: parser.startColumn
      }
    };

    if (parser.sourceFile) {
      node.loc.source = parser.sourceFile;
    }
  }

  return node;
}

/** @internal */
export function isEqualTagName(elementName: any): any {
  switch (elementName.type) {
    case 'JSXIdentifier':
      return elementName.name;
    case 'JSXNamespacedName':
      return elementName.namespace + ':' + elementName.name;
    case 'JSXMemberExpression':
      return isEqualTagName(elementName.object) + '.' + isEqualTagName(elementName.property);
    /* istanbul ignore next */
    default:
    // ignore
  }
}

export function createArrowScope(parser: ParserState, context: Context, value: string) {
  const scope = addChildScope(createScope(), ScopeKind.ArrowParams);
  addBlockName(parser, context, scope, value, BindingKind.ArgumentList, BindingOrigin.Other);
  return scope;
}

export function recordScopeError(parser: ParserState, type: Errors): ScopeError {
  const { index, line, column } = parser;
  return {
    type,
    index, line, column
  }
}

/**
 * Creates a block scope
 */
export function createScope(): ScopeState {
  return {
    parent: void 0,
    type: ScopeKind.Global
  };
}

/**
 * Inherit scope
 *
 * @param scope Parser object
 * @param type Scope type
 */
export function addChildScope(parent: any, type: ScopeKind): ScopeState {
  return {
    parent,
    type,
    scopeError: void 0
  };
}


/**
 * Adds either a var binding or a block scoped binding.
 *
 * @param parser Parser state
 * @param context Context masks
 * @param scope Scope state
 * @param name Binding name
 * @param type Binding kind
 * @param origin Binding Origin
 */
export function addVarOrBlock(parser: ParserState,
  context: Context,
  scope: ScopeState,
  name: string,
  type: BindingKind,
  origin: BindingOrigin) {
    if (type & BindingKind.Variable) {
      addVarName(parser, context, scope, name, type);
    } else {
      addBlockName(parser, context, scope, name, type, BindingOrigin.Other);
    }
    if (origin & BindingOrigin.Export) {
      updateExportsList(parser, parser.tokenValue);
      addBindingToExports(parser, parser.tokenValue);
    }
}

/**
 * Adds a variable binding
 *
 * @param parser Parser state
 * @param context Context masks
 * @param scope Scope state
 * @param name Binding name
 * @param type Binding kind
 */
export function addVarName(
  parser: ParserState,
  context: Context,
  scope: ScopeState,
  name: string,
  type: BindingKind
): void {

  let currentScope: any = scope;

  while (currentScope && (currentScope.type & ScopeKind.FuncRoot) === 0) {

    const value: ScopeKind = currentScope['#' + name];

    if (value & BindingKind.LexicalBinding) {
      if (context & Context.OptionsWebCompat && (context & Context.Strict) === 0 &&
        ((type & BindingKind.FunctionStatement && value & BindingKind.LexicalOrFunction) ||
          (value & BindingKind.FunctionStatement && type & BindingKind.LexicalOrFunction))
      ) {
      } else {
        report(parser, Errors.DuplicateBinding, name);
      }
    }
    if (currentScope === scope) {
        if (value & BindingKind.ArgumentList && type & BindingKind.ArgumentList) {
          currentScope.scopeError = recordScopeError(parser, Errors.Unexpected);
        }
    }
    if (value & (BindingKind.CatchIdentifier | BindingKind.CatchPattern)) {
      if (((value & BindingKind.CatchIdentifier) === 0 || (context & Context.OptionsWebCompat) === 0) || context & Context.Strict) {
        report(parser, Errors.DuplicateBinding, name);
      }
    }

    currentScope['#' + name] = type;

    currentScope = currentScope.parent;
  }
}

/**
 * Adds block scoped binding
 *
 * @param parser Parser state
 * @param context Context masks
 * @param scope Scope state
 * @param name Binding name
 * @param type Binding kind
 * @param origin Binding Origin
 */
export function addBlockName(
  parser: ParserState,
  context: Context,
  scope: any,
  name: string,
  type: BindingKind,
  origin: BindingOrigin
) {

  const value = (scope as any)['#' + name];

  if (value && (value & BindingKind.EmptyBinding) === 0) {
    if (type & BindingKind.ArgumentList) {
      scope.scopeError = recordScopeError(parser, Errors.Unexpected);
    } else if (
      context & Context.OptionsWebCompat &&
      value & BindingKind.FunctionLexical &&
      origin & BindingOrigin.BlockStatement
    ) {
    } else {
      report(parser, Errors.DuplicateBinding, name);
    }
  }

  if (
    scope.type & ScopeKind.FuncBody &&
    ((scope as any).parent['#' + name] && ((scope as any).parent['#' + name] & BindingKind.EmptyBinding) === 0)
  ) {
    report(parser, Errors.DuplicateBinding, name);
  }

  if (scope.type & ScopeKind.ArrowParams && value && (value & BindingKind.EmptyBinding) === 0) {
    if (type & BindingKind.ArgumentList) {
      scope.scopeError = recordScopeError(parser, Errors.Unexpected);
    }
  }

  if (scope.type & ScopeKind.CatchBody) {
    if ((scope as any).parent['#' + name] & BindingKind.CatchIdentifierOrPattern) report(parser, Errors.ShadowedCatchClause, name);
  }

  (scope as any)['#' + name] = type;
}

/**
 * Appends a name to the `ExportedNames` of the `ExportsList`, and checks
 * for duplicates
 *
 * @see [Link](https://tc39.github.io/ecma262/$sec-exports-static-semantics-exportednames)
 *
 * @param parser Parser object
 * @param name Exported name
 */
export function updateExportsList(parser: ParserState, name: string): void {
  if (parser.exportedNames !== void 0 && name !== '') {
    if (parser.exportedNames['#' + name]) {
      report(parser, Errors.DuplicateExportBinding, name);
    }
    parser.exportedNames['#' + name] = 1;
  }
}

/**
 * Appends a name to the `ExportedBindings` of the `ExportsList`,
 *
 * @see [Link](https://tc39.es/ecma262/$sec-exports-static-semantics-exportedbindings)
 *
 * @param parser Parser object
 * @param name Exported binding name
 */
export function addBindingToExports(parser: ParserState, name: string): void {
  if (parser.exportedBindings !== void 0 && name !== '') {
    parser.exportedBindings['#' + name] = 1;
  }
}

export function pushComment(context: Context, array: any[]): any {
  return function(type: string, value: string, start: number, end: number) {
    const comment: any = {
      type,
      value
    };

    if (context & Context.OptionsLoc) {
      comment.start = start;
      comment.end = end;
    }
    array.push(comment);
  };
}
