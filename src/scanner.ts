// Scans raw source to a list of tokens.

// TODO: Some patterns repeat (e.g MACRO and AT_DELIM)
// TODO: and are basically the same, the logic could be
// TODO: pulled out into it's own func.

// TODO: pull stuff out of switch statements into its
// TODO: own function.

// TODO: lots of it could be shortened with regexes, so
// TODO: use them wherever possible.

// TODO: Scan greedily: that is, instead of scanning just "**"
// TODO: as TokenType.DOUBLE_STAR, when u see "**" that isn't
// TODO: escaped or anything, scan it up to the next unescaped
// TODO: "**" and store THAT as a full TokenType.BOLD token.

import { Token, TokenType, tokenToStr } from "./token.ts"

// Keep track of scanner state.
interface State {
    source: string,
    tokens: Token[],
    position: number,
    col: number,
    row: number
}

// Initializes a new State object from the given source.
function newState(src: string): State {
    return {
        source: src,
        tokens: [],
        position: 0,
        col: 1,
        row: 1
    };
}

// Creates a token object given the state, token type,
// and token lexeme. Note that this must be called
// with the state at the BEGINNING of the lexeme
// (i.e before calling advance any number of times),
// otherwise it'll mess up the position/col/row fields.
function createToken(state: State, type: TokenType, lexeme: string): Token {
    return {
        type,
        lexeme,
        position: state.position,
        col: state.col,
        row: state.row
    };
}

// Returns a new copy of updated state with the given
// token added to its list.
function addToken(oldState: State, token: Token): State {
    return {
        source: oldState.source,
        tokens: [...oldState.tokens, token],
        position: oldState.position,
        col: oldState.col,
        row: oldState.row
    };
}

// Increment's given state's position, and
// sets/resets col/row if the char we were at
// was a newline. The optional n argument (default 1)
// can be used to advance state 'n' times.
function advance(oldState: State, n: number = 1): State {
    if (n == 1) return advanceOnce(oldState);
    else return advance(advanceOnce(oldState), n - 1);
}

// Advances state by one character.
function advanceOnce(oldState: State): State {
    const isEndOfLine = oldState.source[oldState.position] == "\n"

    return {
        source: oldState.source,
        tokens: [...oldState.tokens],
        position: oldState.position + 1,
        col: isEndOfLine ? 1 : oldState.col + 1,
        row: isEndOfLine ? oldState.row + 1 : oldState.row
    }
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
    return state.source.slice(start, end);
}

// Same as lookahead, but in the other direction.
function lookback(state: State, n: number = 1): string {
    const { source, position } = state;

    const lookbackPosition = position - n;
    const bound = 0;

    const sliceSize = Math.max(lookbackPosition, bound);
    return state.source.slice(lookbackPosition, position);
}

// Returns the character at the current position in
// source.
function curChar(state: State): string {
    return state.source[state.position];
}

// Returns true if there are still characters left to
// be scanned.
function hasSourceLeft(state: State): boolean {
    return state.position < state.source.length;
}

// Recursively scan the source.
function runScanner(st: State): State {
    // Base case, no more source left to scan.
    if (hasSourceLeft(st)) {
        const c = curChar(st);

        switch (c) {
            // Comments
            case "%":
                // Make sure the % is not escaped.
                if (lookback(st) != "\\") {
                    // Offset from current position.
                    let i = 1;
                    // Returns if the i'th char from current position
                    // is a newline. If i goes out of bounds, returns
                    // false.
                    const shouldContinue = (i: number) => {
                        if (st.source.length <= st.position + i) {
                            return st.source[st.position + i] != "\n";
                        } else {
                            return false;
                        }
                    }

                    // Increase i until we find a newline.
                    while (shouldContinue(i)) i++;
                    // Advance i times to go over to the next line.
                    return runScanner(advance(st, i));
                }

            // STAR, DOUBLE_STAR
            case "*":
                if (lookahead(st) == "*") {
                    const type = TokenType.DOUBLE_STAR;
                    const lexeme = "**";
                    const token = createToken(st, type, lexeme);

                    // Add token, advance twice, continue scanning.
                    return runScanner(advance(addToken(st, token), 2));
                } else {
                    const type = TokenType.STAR;
                    const lexeme = "*";
                    const token = createToken(st, type, lexeme);

                    // Advance once since STAR has length one.
                    return runScanner(advance(addToken(st, token)));
                }

            // DOUBLE_UNDERSCORE
            case "_":
                if (lookahead(st) == "_") {
                    const type = TokenType.DOUBLE_UNDERSCORE;
                    const lexeme = "__";
                    const token = createToken(st, type, lexeme);
                    return runScanner(advance(addToken(st, token), 2));
                }

            // DOUBLE_TILDE
            case "~":
                if (lookahead(st) == "~") {
                    const type = TokenType.DOUBLE_TILDE;
                    const lexeme = "~~";
                    const token = createToken(st, type, lexeme);
                    return runScanner(advance(addToken(st, token), 2));
                }

            // LEFT_BRACKET
            // We put everything inside a block because otherwise
            // typescript yells about re-declaring block-scoped variables.
            case "[": {
                const type = TokenType.LEFT_BRACKET;
                const lexeme = "[";
                const token = createToken(st, type, lexeme);
                return runScanner(advance(addToken(st, token)));
            }

            // BANG_BRACKET
            case "!":
                if (lookahead(st) == "[") {
                    const type = TokenType.BANG_BRACKET;
                    const lexeme = "![";
                    const token = createToken(st, type, lexeme);
                    return runScanner(advance(addToken(st, token), 2));
                }

            // BRACKET_PAREN
            case "]":
                if (lookahead(st) == "(") {
                    const type = TokenType.BRACKET_PAREN;
                    const lexeme = "](";
                    const token = createToken(st, type, lexeme);
                    return runScanner(advance(addToken(st, token), 2));
                }

            // RIGHT_PAREN
            case ")": {
                const type = TokenType.RIGHT_PAREN;
                const lexeme = ")";
                const token = createToken(st, type, lexeme);
                return runScanner(advance(addToken(st, token)));
            }

            // LEFT_BRACE
            case "{": {
                const type = TokenType.LEFT_BRACE;
                const lexeme = "{";
                const token = createToken(st, type, lexeme);
                return runScanner(advance(addToken(st, token)));
            }

            // RIGHT_BRACE
            case "}": {
                const type = TokenType.RIGHT_BRACE;
                const lexeme = "}";
                const token = createToken(st, type, lexeme);
                return runScanner(advance(addToken(st, token)));
            }

            // HASH, HASHSTAR (DOUBLE/TRIPLE)
            case "#":
                if (lookahead(st, 3) == "##*") {
                    const type = TokenType.TRIPLE_HASHSTAR;
                    const lexeme = "###*";
                    const token = createToken(st, type, lexeme);
                    return runScanner(advance(addToken(st, token), 4));
                }

                if (lookahead(st, 2) == "##") {
                    const type = TokenType.TRIPLE_HASH;
                    const lexeme = "###";
                    const token = createToken(st, type, lexeme);
                    return runScanner(advance(addToken(st, token), 3));
                }

                if (lookahead(st, 2) == "#*") {
                    const type = TokenType.DOUBLE_HASHSTAR;
                    const lexeme = "##*";
                    const token = createToken(st, type, lexeme);
                    return runScanner(advance(addToken(st, token), 3));
                }

                if (lookahead(st) == "#") {
                    const type = TokenType.DOUBLE_HASH;
                    const lexeme = "##";
                    const token = createToken(st, type, lexeme);
                    return runScanner(advance(addToken(st, token), 2));
                }

                if (lookahead(st) == "*") {
                    const type = TokenType.HASHSTAR;
                    const lexeme = "#*";
                    const token = createToken(st, type, lexeme);
                    return runScanner(advance(addToken(st, token), 2));
                }

                // Again, extra braces to create scope.
                // TODO: Maybe a better way to locally scope the vars?
                // TODO: Or silence TS errors?
                {
                    const type = TokenType.HASH;
                    const lexeme = "#";
                    const token = createToken(st, type, lexeme);
                    return runScanner(advance(addToken(st, token)));
                }

            // HYPHEN
            case "-": {
                const type = TokenType.HYPHEN;
                const lexeme = "-";
                const token = createToken(st, type, lexeme);
                return runScanner(advance(addToken(st, token)));
            }

            // EMPTY_ROW
            case "\n":
                if (lookahead(st) == "\n") {
                    const type = TokenType.EMPTY_ROW;
                    const lexeme = "\n\n";
                    const token = createToken(st, type, lexeme);
                    return runScanner(advance(addToken(st, token), 2));
                }

/*
            // MACRO
            // TODO: Actually, there can be spaces inside the macro's
            // TODO: param as well. E.g. \textit{a b c}. So I need to
            // TODO: check for braces as well, before space.
            // TODO: Also, do we *really* need a macro token?
            case "\\":
                // White space regex
                const re = /\s/;
                // Offset from current state position.
                let i = 1;
                // Helper for loop condition.
                const shouldContinue = (i) => {
                    // If i is within bounds, test for whitespace.
                    // We keep looping as long as the i'th char from
                    // current position is NOT whitespace.
                    if (st.position + i <= st.source.length) {
                        return !re.test(st.source[st.position + i]);
                    } else {
                        // If i goes out of bounds, we stop looping.
                        return false;
                    }
                }

                // Keep increasing i until we're unable to continue.
                while (shouldContinue(i)) i++;

                // i strictly greater than 1 means we have a proper
                // \XYZ instead of a lone "\"
                if (i > 1) {
                    const type = TokenType.MACRO;
                    const lexeme = lookahead(st, i);
                    const token = createToken(st, type, lexeme);
                    // We advance by i since that's the length
                    // of the lexeme.
                    return runScanner(advance(addToken(st, token), i));
                }
*/
            // AT_DELIM
            case "@":
                console.log("INSIDE AT_DELIM BRANCH")
                console.log("CURRENT CHAR: '" + c + "'");
                console.log("LOOKBACK: '" + lookback(st) + "'");
                console.log("LOOKAHEAD: '" + lookahead(st) + "'");
                // Check ot make sure it's not escaped.
                if (lookback(st) != "\\") {
                    // Offset from current state position.
                    let i = 1;
                    // Helper for loop condition.
                    const shouldContinue = (i: number) => {
                        // If i is within bounds, test for whitespace.
                        // We keep looping as long as the i'th char from
                        // current position is NOT whitespace.
                        if (st.position + i <= st.source.length) {
                            return !/\s/.test(st.source[st.position + i]);
                        } else {
                            // If i goes out of bounds, we stop looping.
                            return false;
                        }
                    }

                    // Keep increasing i until we're unable to continue.
                    while (shouldContinue(i)) i++;

                    // i strictly greater than 1 means we have a proper
                    // @XYZ instead of a lone "@"
                    if (i > 1) {
                        const type = TokenType.AT_DELIM;
                        const lexeme = lookahead(st, i);
                        const token = createToken(st, type, lexeme);
                        // We advance by i since that's the length
                        // of the lexeme.
                        return runScanner(advance(addToken(st, token), i));
                    }
                }

            // DEFAULT CASE
            default:
                // N_DOT
                // TODO: Actually, just properly check if the N_DOT
                // follows a newline and is followed by a space,
                // in which case scan the whole line. Much simpler
                // and less work for parser/generator.
                /*
                if (/\d/.test(c)) {
                    let i = 1;
                    const shouldContinue = (i: number) => {
                        if (st.source.length <= st.position + i) {
                            return /\d/.test(st.source[st.position + i]);
                        } else {
                            return false;
                        }
                    }

                    // Loop till non-digit char.
                    while (shouldContinue(i)) i++;
                }
                */

                // KW_MACRO
                // TODO: this will actually still match stuff like
                // TODO: macroabcdef. I need to make sure "acro" is
                // TODO: followed by a whitespace character.
                if (c == "m" && lookahead(st, 4) == "acro") {
                    const type = TokenType.KW_MACRO;
                    const lexeme = "macro";
                    const token = createToken(st, type, lexeme);
                    return runScanner(advance(addToken(st, token), 5));
                }

                // HEREDOC
                if (c == "T" && lookahead(st, 6) == "EX <<<") {
                    /*
                    let i = 7;
                    const shouldContinue = (i: number) => {
                        if (st.source.length <= st.position + i) {
                            return st.source[st.position + i] != "\n";
                        } else {
                            return false;
                        }
                    };

                    while(shouldContinue(i)) i++;
                    */

                    // Index of the next newline char.
                    // TODO: Check for .search failures as well.
                    // TODO: Return custom errors.
                    // TODO: Probably needs more comments.
                    const endlIndex = st.source.slice(st.position).search(/\n/);
                    // Endmarker for the heredoc block.
                    const endMarker = st.source.slice(st.position + 8, endlIndex);
                    // Find index of the closing endmarker. Note
                    // this index is the offset from the newline
                    // of the heredoc opening.
                    const substr = st.source.slice(endlIndex);
                    const endMarkerIndex = substr.search(endMarker);

                    const totalOffset = 7 + endMarker.length + endMarkerIndex;

                    const type = TokenType.HEREDOC_BLOCK;
                    const lexeme = lookahead(st, totalOffset);
                    const token = createToken(st, type, lexeme);
                    return runScanner(advance(addToken(st, token), totalOffset));
                }

                // WORD
                if (/\S/.test(c)) {
                    let i = 1;
                    const shouldContinue = (i: number) => {
                        if (st.source.length >= st.position + i) {
                            return /\S/.test(st.source[st.position + i]);
                        } else {
                            return false;
                        }
                    }

                    // Loop till whitespace.
                    while (shouldContinue(i)) i++;

                    const type = TokenType.WORD;
                    const lexeme = c + lookahead(st, i);
                    const token = createToken(st, type, lexeme);
                    return runScanner(advance(addToken(st, token), i));
                }

                // At this point, `c` is just whitespace, so skip over.
                return runScanner(advance(st));
        }
    }

    // If there's no source left, we just return the
    // state we have.
    return st;
}

// Starts the scanner and returns the final tokens.
export function scan(src: string): Token[] {
    const st = newState(src);
    const finalState = runScanner(st);
    return finalState.tokens;
}

