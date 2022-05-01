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
    MACRO,
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

export interface Token {
    type: TokenType,
    lexeme: string,
    // Position of the token in the source string.
    position: number
    // Column/row in the source file.
    col: number,
    row: number
}

// Shortens longer lexemes to a length of 25 characters.
function constrainLexeme(lexeme: string): string {
    const shortEnough = Math.max(lexeme.length, 25) == 25;

    if (shortEnough) {
        return lexeme;
    } else {
        const start = lexeme.slice(0, 11);
        const end   = lexeme.slice(lexeme.length, -11);
        return start + "..." + end;
    }
}

export function tokenToStr(token: Token): string {
    return `Token {
    Type: ${token.type},
    Position: ${token.position},
    Column: ${token.col},
    Row: ${token.row},
    Lexeme: ${constrainLexeme(token.lexeme)}
    };`
}
