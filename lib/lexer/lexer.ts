import {
    advance,
    curChar,
    newState,
    addToken,
    lookback,
    lookahead,
    escapeWord,
    createToken,
    charAtOffset,
    advanceWhile,
    hasSourceLeft,
    advanceWhileEscaping,
    substringBetweenStates
} from "./helpers.ts";

import { Token, TokenType, State } from "./types.ts";

// Recursively scan the source.
function runLexer(st: State): State {
    // Base case, no more source left to scan.
    // We just return the state we have.
    if (!hasSourceLeft(st)) return st;

    const c = curChar(st);

    switch (c) {
        // STAR, DOUBLE_STAR *, **
        case "*": {
            if (lookahead(st) == "*") {
                const type = TokenType.DOUBLE_STAR;
                const lexeme = "**";
                const token = createToken(st, type, lexeme);

                // Add token, advance twice, continue lexing.
                return runLexer(advance(addToken(st, token), 2));
            } else {
                const type = TokenType.STAR;
                const lexeme = "*";
                const token = createToken(st, type, lexeme);

                // Advance once since STAR has length one.
                return runLexer(advance(addToken(st, token)));
            }
        }

        // DOUBLE_UNDERSCORE __
        case "_": {
            if (lookahead(st) == "_") {
                const type = TokenType.DOUBLE_UNDERSCORE;
                const lexeme = "__";
                const token = createToken(st, type, lexeme);
                return runLexer(advance(addToken(st, token), 2));
            } else {
                return runLexer(handleOther(st));
            }
        }

        // DOUBLE_TILDE ~~
        case "~": {
            if (lookahead(st) == "~") {
                const type = TokenType.DOUBLE_TILDE;
                const lexeme = "~~";
                const token = createToken(st, type, lexeme);
                return runLexer(advance(addToken(st, token), 2));
            } else {
                return runLexer(handleOther(st));
            }
        }

        // LEFT_BRACKET [
        case "[": {
            const type = TokenType.LEFT_BRACKET;
            const lexeme = "[";
            const token = createToken(st, type, lexeme);
            return runLexer(advance(addToken(st, token)));
        }

        // BANG_BRACKET ![
        case "!": {
            if (lookahead(st) == "[") {
                const type = TokenType.BANG_BRACKET;
                const lexeme = "![";
                const token = createToken(st, type, lexeme);
                return runLexer(advance(addToken(st, token), 2));
            } else {
                return runLexer(handleOther(st));
            }
        }

        // BRACKET_PAREN ])
        case "]": {
            if (lookahead(st) == "(") {
                const type = TokenType.BRACKET_PAREN;
                const lexeme = "](";
                const token = createToken(st, type, lexeme);
                return runLexer(advance(addToken(st, token), 2));
            } else {
                return runLexer(handleOther(st));
            }
        }

        // RIGHT_PAREN
        case ")": {
            const type = TokenType.RIGHT_PAREN;
            const lexeme = ")";
            const token = createToken(st, type, lexeme);
            return runLexer(advance(addToken(st, token)));
        }

        // HASH, HASHSTAR (DOUBLE/TRIPLE)
        // NOTE: In the parser, the heading will consist
        // NOTE: of all the tokens on the same row. The lexeme
        // NOTE: will only contain the heading symbol itself,
        // NOTE: not the entire line.
        case "#": {
            // Headings need to be at the start of a new line.
            if (lookback(st) != "\n") {
                return runLexer(handleOther(st));
            }

            // Headings also need to be followed by a space
            // character.
            if (lookahead(st, 4) == "##* ") {
                const type = TokenType.TRIPLE_HASHSTAR;
                const lexeme = "###*";
                const token = createToken(st, type, lexeme);
                return runLexer(advance(addToken(st, token), 4));
            }

            if (lookahead(st, 3) == "## ") {
                const type = TokenType.TRIPLE_HASH;
                const lexeme = "###";
                const token = createToken(st, type, lexeme);
                return runLexer(advance(addToken(st, token), 3));
            }

            if (lookahead(st, 3) == "#* ") {
                const type = TokenType.DOUBLE_HASHSTAR;
                const lexeme = "##*";
                const token = createToken(st, type, lexeme);
                return runLexer(advance(addToken(st, token), 3));
            }

            if (lookahead(st, 2) == "# ") {
                const type = TokenType.DOUBLE_HASH;
                const lexeme = "##";
                const token = createToken(st, type, lexeme);
                return runLexer(advance(addToken(st, token), 2));
            }

            if (lookahead(st, 2) == "* ") {
                const type = TokenType.HASHSTAR;
                const lexeme = "#*";
                const token = createToken(st, type, lexeme);
                return runLexer(advance(addToken(st, token), 2));
            }

            if (lookahead(st) == " ") {
                const type = TokenType.HASH;
                const lexeme = "#";
                const token = createToken(st, type, lexeme);
                return runLexer(advance(addToken(st, token)));
            }

            // Not a heading.
            return runLexer(handleOther(st));
        }

        // UL_ITEM
        case "-": {
            // Needs to be at the start of the line and with a
            // space following it.
            if (lookback(st) == "\n" && lookahead(st) == " ") {
                const type = TokenType.UL_ITEM;
                const lexeme = "-";
                const token = createToken(st, type, lexeme);
                return runLexer(advance(addToken(st, token)));
            } else {
                return runLexer(handleOther(st));
            }
        }

        // Comments
        case "%": {
            // Eat everything until a newline.
            const newSt = advanceWhile(st, curSt => curChar(curSt) != "\n");
            // One more advance to move past the \n.
            return runLexer(advance(newSt));
        }

        // AT_DELIM
        case "@": {
            const newSt = advanceWhile(st, (curSt) => {
                const samePosition = curSt.position == st.position;
                const nonWhitespace = /\S/.test(curChar(curSt));

                return samePosition || nonWhitespace;
            });

            // Make sure we actually moved before adding the
            // token, otherwise it's just a lone '@'
            if (newSt.position > st.position) {
                const type = TokenType.AT_DELIM;
                // -1 because the newSt's position is the whitespace
                // char after the @XYZ.
                const lexeme = lookahead(st, newSt.position - 1);
                const token = createToken(st, type, lexeme);

                // Add it to the newSt and move on.
                return runLexer(addToken(newSt, token));
            } else {
                // If it's just a lone @ we go to the default
                // case which will treat it like a WORD (hopefully?)
                return runLexer(handleOther(st));
            }
        }

        // EMPTY_ROW
        case "\n": {
            if (lookahead(st) == "\n") {
                // Eat up all the whitespace.
                const newSt = advanceWhile(st, (curSt) => {
                    return /\s/.test(curChar(curSt));
                });

                const type = TokenType.EMPTY_ROW;
                // Obviously the lexeme might not just be a newline,
                // but we won't be doing anything with this lexeme
                // so it's fine.
                const lexeme = "\n";
                const token = createToken(st, type, lexeme);
                return runLexer(addToken(newSt, token));
            } else {
                // If it's not an empty row then we just ignore the
                // newline and continue on.
                return runLexer(advance(st));
            }
        }

        // DEFAULT CASE
        default: {
            return runLexer(handleOther(st));
        }
    }
}

// The default case for the switch statement, when
// a character doesn't match any special context.
function handleOther(st: State): State {
    const c = curChar(st);

    // OL_ITEM
    if (/\d/.test(c) && lookback(st) == "\n") {
        return handleOrderedList(st);
    }

    // MACRO_DEF
    if (c == "m" && lookback(st) == "\n" && lookahead(st, 5) == "acro ") {
        return handleMacroDef(st);
    }

    // HEREDOC
    if (c == "T" && lookback(st) == "\n" && lookahead(st, 7) == "EX <<< ") {
        return handleHeredoc(st);
    }

    if (/\S/.test(c)) {
        return handleWord(st);
    }

    // Ignore extra whitespace.
    if (/\s/.test(c)) {
        return advance(st);
    }

    // At this point, c is an unrecognized character.
    // TODO: Throw error on unrecognized chars instead of
    // TODO: just ignoring them as we do right now.
    return advance(st);
}

// OL_ITEM
function handleOrderedList(st: State): State {
    // Eat up all the digits.
    const newSt = advanceWhile(st, (curSt: State) => {
        return /\d/.test(curChar(curSt));
    });

    // The numbers need to be followed by a dot and space.
    if (curChar(newSt) == "." && lookahead(newSt) == " ") {
        const type = TokenType.OL_ITEM;
        const lexeme = substringBetweenStates(st, newSt);
        const token = createToken(st, type, lexeme);
        return advance(addToken(newSt, token));
    } else {
        // Otherwise, just treat it as a word.
        return handleWord(st);
    }
}

// TODO: Need to lex this properly...
// TODO: Scan the whole line, actually.
function handleMacroDef(st: State): State {
    const type = TokenType.MACRO_DEF;
    const lexeme = "macro";
    const token = createToken(st, type, lexeme);
    return advance(addToken(st, token), 5);
}

// Eats up the TEX <<< <MARKER> line and all lines until the ending
// <MARKER> line.
// TODO: Testing.
function handleHeredoc(st: State): State {
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
    return advance(addToken(st, token), totalOffset);
}

// Eats up everything until whitespace or one of the following:
// *, **, ~~, __.
function handleWord(st: State): State {
    // Advance while also accounting for escapes.
    const newSt = advanceWhileEscaping(st);
    // Get the raw string with escapes still there.
    const raw = substringBetweenStates(st, newSt);
    // Replace escape sequences with correct chars.
    const escaped = escapeWord(raw);

    const type = TokenType.WORD;
    const lexeme = escaped;
    const token = createToken(st, type, lexeme);
    return advance(addToken(newSt, token));
}

// Starts the lexer and returns the final tokens.
export function lex(src: string): Token[] {
    const st = newState(src);
    const finalState = runLexer(st);
    return finalState.tokens;
}
