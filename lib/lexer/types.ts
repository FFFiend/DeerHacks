import {
    UnrecognizedCharError,
    UnclosedSequenceError,
    UnexpectedCharError
} from "./errors.ts";

// Token types
export enum TokenType {
    // Plain text word.
    WORD,
    // '@' delimiter.
    AT_DELIM,
    // Markup macro definition.
    MACRO_DEF,
    // 'TEX <<< ...' and '...'.
    HEREDOC_BLOCK,

    // TeX & LaTeX Math Delimiters.
    TEX_INLINE_MATH, TEX_DISPLAY_MATH,
    LATEX_INLINE_MATH, LATEX_DISPLAY_MATH,

    // '*', '**', '__', '~~'.
    STAR, DOUBLE_STAR, DOUBLE_UNDERSCORE, DOUBLE_TILDE,

    // '#', '##', '###' and star variants.
    HASH, DOUBLE_HASH, TRIPLE_HASH,
    HASHSTAR, DOUBLE_HASHSTAR, TRIPLE_HASHSTAR,

    // '[', '![', '](', ')'.
    LEFT_BRACKET, BANG_BRACKET,
    BRACKET_PAREN, RIGHT_PAREN,

    // Unnumbered/Numbered list items.
    UL_ITEM, OL_ITEM,

    // Start-of-File, End-of-File.
    SOF, EOF,
    // An empty line.
    EMPTY_ROW
}

// Token object
export type Token = {
    type: TokenType,
    lexeme: string,
    // Position of the token in the source string.
    position: number,
    // Whitespace to the left of the token lexeme,
    // until the start of a new token (including EMPTY_ROW)
    rightPad: string,
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
export type LexerState = {
    source: string,
    tokens: Token[],
    position: number,
    col: number,
    row: number,
    errors: LexerError[]
}
