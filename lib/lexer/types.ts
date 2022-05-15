import {
    UnrecognizedCharError,
    UnclosedSequenceError,
    UnexpectedCharError
} from "./errors.ts";

// Token types
export enum TokenType {
    // Plain text word.
    WORD,
    // '@' delimiter
    AT_DELIM,
    // Markup macro definition.
    MACRO_DEF,
    // 'TEX <<< ...' and '...'
    HEREDOC_BLOCK,
    // TeX Math
    TEX_INLINE_MATH, TEX_DISPLAY_MATH,
    // LaTeX Math
    LATEX_INLINE_MATH, LATEX_DISPLAY_MATH,

    // '*', '**', '__', '~~'
    STAR, DOUBLE_STAR, DOUBLE_UNDERSCORE, DOUBLE_TILDE,

    // '#', '##', '###' and star variants.
    HASH, DOUBLE_HASH, TRIPLE_HASH,
    HASHSTAR, DOUBLE_HASHSTAR, TRIPLE_HASHSTAR,

    // '[', '![', '](', ')'
    // TODO: Hmm, should I lex the whole thing instead
    // TODO: of just [ and ]( and separate tokens here?
    // TODO: Is it REALLY a big deal if my parser calls
    // TODO: the lexer inside it???
    LEFT_BRACKET, BANG_BRACKET,
    BRACKET_PAREN, RIGHT_PAREN,

    // Unnumbered/Numbered list items.
    UL_ITEM, OL_ITEM,

    // Start-of-File, End-of-File
    SOF, EOF,
    // An empty line
    EMPTY_ROW
}

// Token object
export type Token = {
    type: TokenType,
    lexeme: string,
    // Position of the token in the source string.
    position: number
    // Column/row in the source file.
    col: number,
    row: number
}

// Just two types of errors for the lexer.
export type LexerError
    = UnrecognizedCharError
    | UnclosedSequenceError
    | UnexpectedCharError;

// Keep track of scanner state.
export type State = {
    source: string,
    tokens: Token[],
    position: number,
    col: number,
    row: number,
    errors: LexerError[]
}
