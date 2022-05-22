import {
    Token,
    LexerState as State,
    TokenType,
    LexerError,
} from "./types.ts"


/**
 * Initializes a new LexerState object from the given source
 * @param {string} src - The markup source to lex.
 */
export function newState(src: string): State {
    return {
        source: src,
        tokens: [],
        position: 0,
        col: 1,
        row: 1,
        errors: []
    };
}

export function attachError(oldState: State, err: LexerError): State {
    return {
        source: oldState.source,
        tokens: oldState.tokens,
        position: oldState.position,
        col: oldState.col,
        row: oldState.row,
        errors: [...oldState.errors, err]
    };
}

// Creates a token object given the state, token type,
// and token lexeme. Note that this must be called
// with the state at the BEGINNING of the lexeme
// (i.e before calling advance any number of times),
// otherwise it'll mess up the position/col/row fields.
// ALSO collects whitespace after the token lexeme.
export function createToken(state: State, type: TokenType, lexeme: string, rightPad: string): Token {
    return {
        type,
        lexeme,
        position: state.position,
        rightPad,
        col: state.col,
        row: state.row
    };
}

// Returns a new copy of updated state with the given
// token added to its list.
export function addToken(oldState: State, token: Token): State {
    return {
        source: oldState.source,
        tokens: [...oldState.tokens, token],
        position: oldState.position,
        col: oldState.col,
        row: oldState.row,
        errors: [...oldState.errors]
    };
}

// Advances state by one character, and sets/resets
// col/row if the current character was a newline.
// If there is no source left to scan, returns the
// oldState as is.
export function advanceOnce(oldState: State): State {
    if (hasSourceLeft(oldState)) {
        const isEndOfLine = curChar(oldState) == "\n"

        return {
            source: oldState.source,
            tokens: [...oldState.tokens],
            position: oldState.position + 1,
            col: isEndOfLine ? 1 : oldState.col + 1,
            row: isEndOfLine ? oldState.row + 1 : oldState.row,
            errors: [...oldState.errors]
        }
    } else {
        return oldState;
    }
}

// Advances the state `n` times, defaults to once.
export function advance(oldState: State, n: number = 1): State {
    if (n == 1) return advanceOnce(oldState);
    else return advance(advanceOnce(oldState), n - 1);
}

// Keeps advancing the state as long as the predicate
// function `fn` returns true given the state at each
// step. If the source runs out, it will immediately
// return the final state regardless of the predicate
// function's value.
export function advanceWhile(oldState: State, fn: (s: State) => boolean): State {
    if (hasSourceLeft(oldState) && fn(oldState)) {
        return advanceWhile(advanceOnce(oldState), fn);
    } else {
        return oldState;
    }
}

// Special advancing function to handle escaping inside words.
export function advanceWhileEscaping(st: State): State {
    const newSt = advanceWhile(st, (curSt) => {
        // We advance until a whitespace or a \ or one of the
        // special *, %, ~~, __ chars.
        if (/\s/.test(lookahead(curSt))) return false;
        if (lookahead(curSt) == "\\") return false;
        if (/[*%]/.test(lookahead(curSt))) return false;
        if (lookahead(curSt, 2) == "~~") return false;
        if (lookahead(curSt, 2) == "__") return false;
        // Otherwise continue.
        return true;
    });

    // If we had stopped at a \, it means we're at an escape
    // sequence, so we immediately skip the \ and the char
    // following it (since we have to escape it) and then
    // recurse to keep advancing.
    if (lookahead(newSt) == "\\") {
        return advanceWhileEscaping(advance(newSt, 2));
    } else {
        return newSt;
    }
}

// Escapes the following chars: \, *, %, ~, _
export function escapeWord(str: string): string {
    let acc = "";
    let i = 0;
    while (i < str.length) {
        if (str[i] == "\\") {
            if (/[\\*%~_]/.test(str[i+1])) {
                acc = acc + str[i+1];
                i = i + 2;
                continue;
            }
        } else {
            acc = acc + str[i];
            i = i + 1;
        }
    }
    return acc;
}

// Given two states, it returns the substring between
// the first state's position and the second's, including
// both characters at each state's current position. If
// the sources for the two states are not the same, it
// will return an empty string.
export function substringBetweenStates(stateA: State, stateB: State): string {
    if (stateA.source != stateB.source) return "";

    const source = stateA.source;
    const posA = stateA.position;
    const posB = stateB.position;

    const start = Math.min(posA, posB);
    const end   = Math.max(posA, posB);

    return source.slice(start, end + 1);
}

// Returns the next n characters in source. n is optional,
// and defaults to 1. If there are no more characters left,
// returns an empty string. If there are fewer than n
// characters left, it returns whichever characters are left.
export function lookahead(state: State, n: number = 1): string {
    const { source, position } = state;

    const lookaheadPosition = position + n;
    const bound = source.length;

    // The end index of slice is exclusive, so we add one.
    // The start index is inclusive but that would be the
    // CURRENT character which we don't want either, so
    // again we add one.
    const start = position + 1;
    const end   = Math.min(lookaheadPosition, bound) + 1;
    return source.slice(start, end);
}

// Same as lookahead, but in the other direction.
export function lookback(state: State, n: number = 1): string {
    const { position } = state;

    const lookbackPosition = position - n;
    const bound = 0;

    const sliceSize = Math.max(lookbackPosition, bound);
    return state.source.slice(sliceSize, position);
}

// Captures the whitespace that follows the current position
// of the state, up to any non-whitespace character, or until
// an empty row (i.e double newline). The character at the
// current position of the state is not included.
export function captureRightPad(state: State): string {
    // We collect whitespace until we reach a non-whitespace character
    // (i.e start of a new token) OR a double newline (i.e an EMPTY_ROW)
    // token.
    const newState = advanceWhile(state, (curSt) => {
        const whitespace = /\s/.test(lookahead(curSt));
        const emptyRow   = /\n\n/.test(lookahead(curSt, 2));
        // Advance while we see whitespace and no empty rows.
        return whitespace && !emptyRow
    });

    return substringBetweenStates(state, newState).slice(1);
}

// Returns the character at the current position in
// source.
export function curChar(state: State): string {
    return state.source[state.position];
}

// Given an offset from the current state position `i`,
// returns the character at that offset.
export function charAtOffset(state: State, i: number): string {
    return state.source[state.position + i];
}

// Returns true if there are still characters left to
// be scanned.
export function hasSourceLeft(state: State): boolean {
    return state.position < state.source.length;
}

// Shortens longer lexemes to a length of 25 characters.
export function constrainLexeme(lexeme: string): string {
    const shortEnough = Math.max(lexeme.length, 25) == 25;

    if (shortEnough) {
        return lexeme;
    } else {
        const start = lexeme.slice(0, 11);
        const end   = lexeme.slice(-11);
        return start + "..." + end;
    }
}

// Prints a token with pretty colors :)
export function printToken(token: Token): void {
    const type = TokenType[token.type];
    const colrow = `${token.col}:${token.row}`;
    const lexeme = constrainLexeme(JSON.stringify(token.lexeme));
    const str = `%c${type}%c { C:R = %c${colrow}%c, Lexeme = %c${lexeme}%c }`;

    console.log(
        str,
        "color: red",
        "color: default",
        "color: blue",
        "color: default",
        "color: green",
        "color: default"
    );
}
