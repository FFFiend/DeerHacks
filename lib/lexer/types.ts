// Token types
export enum TokenType {
    // '*', '**'
    STAR, DOUBLE_STAR,
    // '__'
    DOUBLE_UNDERSCORE,
    // '~~'
    DOUBLE_TILDE,

    // '[', '!['
    LEFT_BRACKET, BANG_BRACKET,
    // '](', ')'
    BRACKET_PAREN, RIGHT_PAREN,
    // '{' and '}'
    LEFT_BRACE, RIGHT_BRACE,

    // '#', '##', '###'
    HASH, DOUBLE_HASH, TRIPLE_HASH,
    // '#*', '##*', '###*'
    HASHSTAR, DOUBLE_HASHSTAR, TRIPLE_HASHSTAR,

    // '-', denotes unnumbered lists
    HYPHEN,
    // An empty line
    EMPTY_ROW,
    // LaTeX macro, i.e '\XYZ'
    MACRO_CALL,
    // Markup macro definition.
    MACRO_DEF,
    // '@' delimiter
    AT_DELIM,
    // A number followed by a dot (which will be used
    // to check for numbered lists).
    N_DOT,
    // Keyword 'macro'
    KW_MACRO,
    // 'TEX <<< ...' and '...'
    HEREDOC_BLOCK,
    // Plain text word (delimited by whitespace).
    WORD,
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

// Keep track of scanner state.
export type State = {
    source: string,
    tokens: Token[],
    position: number,
    col: number,
    row: number
}
