import { UnrecognizedCharError, UnclosedSequenceError } from "./errors.ts";

// Token types
export enum TokenType {
    // Start-of-File, End-of-File
    SOF, EOF,

    // Plain text word.
    WORD,
    // '@' delimiter
    AT_DELIM,
    // An empty line
    EMPTY_ROW,
    // Markup macro definition.
    MACRO_DEF,
    // 'TEX <<< ...' and '...'
    HEREDOC_BLOCK,
    // Unnumbered/Numbered list items.
    UL_ITEM, OL_ITEM,

    // '*', '**', '__', '~~'
    STAR, DOUBLE_STAR, DOUBLE_UNDERSCORE, DOUBLE_TILDE,

    // '[', '![', '](', ')'
    LEFT_BRACKET, BANG_BRACKET,
    BRACKET_PAREN, RIGHT_PAREN,

    // '#', '##', '###' and star variants.
    HASH, DOUBLE_HASH, TRIPLE_HASH,
    HASHSTAR, DOUBLE_HASHSTAR, TRIPLE_HASHSTAR,
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
export type LexerError = UnrecognizedCharError | UnclosedSequenceError;

// Keep track of scanner state.
export type State = {
    source: string,
    tokens: Token[],
    position: number,
    col: number,
    row: number,
    errors: LexerError[]
}
