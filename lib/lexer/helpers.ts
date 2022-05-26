import {
    Token,
    Snapshot,
    TokenType,
    StatePredicate
} from "./types.ts";

import { State } from "./state.ts";

// TODO: Move to types (not for lex/parse/render, just the general one).
type Colorer = (str: string, color: string) => string

export function createToken(s: Snapshot, t: TokenType, l: string, p: string): Token {
    return {
        type: t,
        lexeme: l,
        rightPad: p,
        col: s.col,
        row: s.row,
        position: s.position
    };
}

export function isEscapableChar(char: string): boolean {
    // A regex of all the FIRST characters of meaningful string
    // sequences in our markup. That is:
    // single-char:
    //   '%' | '[' | '@' | ')'
    // double-char:
    //   '~~' | '__' | '](' | '!['
    // single-or-double-char:
    //   '*' | '**' | '$' | '$$'
    const escapeRegex = /[%\[@\)~_\]!*$]/;
    return escapeRegex.test(char);
}

export function escapeWord(str: string): string {
    // TODO: Implementation
    return str;
}

export function constrainString(str: string, n: number = 50): string {
    const shortEnough = Math.max(str.length, n) === n;

    if (shortEnough) {
        return str;
    } else {
        const start = str.slice(0, Math.floor(n/2) - 3);
        const end   = str.slice(-Math.ceil(n/2));
        return start + "..." + end;
    }
}

export function constrainList<T>(lst: T[], n: number = 50): T[] {
    const shortEnough = Math.max(lst.length, n) === n;

    if (shortEnough) {
        return lst;
    } else {
        const start = lst.slice(0, Math.floor(n/2));
        const end   = lst.slice(-Math.ceil(n/2));
        return [...start, ...end];
    }
}

export function tokenToString(token: Token, color: Colorer): string {
    const r = (str: string) => color(str, "red");
    const g = (str: string) => color(str, "green");
    const b = (str: string) => color(str, "blue");

    const type   = r(TokenType[token.type]);
    const colrow = b(token.col.toString()) + ":" + b(token.row.toString());
    const lexeme = g(constrainString(JSON.stringify(token.lexeme)));

    return `${type} { C:R = ${colrow}, Lexeme = '${lexeme}' }`;
}

// State predicates.
export const onEndOfLine = (st: State) => st.curChar() === "\n";
export const behindEndOfLine = (st: State) => st.lookahead() === "\n";

export const onWhitespace = (st: State) => /\s/.test(st.curChar());
export const behindWhitespace = (st: State) => /\s/.test(st.lookahead());

export const onDigit = (st: State) => /\d/.test(st.curChar());
export const behindDigit = (st: State) => /\d/.test(st.lookahead());

export const on =
    (c: string) => (st: State) => st.curChar() === c;
export const behind =
    (s: string) => (st: State) => st.lookahead(s.length) === s;

// Logical state predicate modifiers.
type Predicate = StatePredicate;

export const not =
    (fn: Predicate) => (st: State) => !fn(st);

export const and =
    (fn1: Predicate, fn2: Predicate) => (st: State) => fn1(st) && fn2(st);

export const or =
    (fn1: Predicate, fn2: Predicate) => (st: State) => fn1(st) || fn2(st);
