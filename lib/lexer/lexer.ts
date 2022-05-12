// Scans raw source to a list of tokens.

// TODO: Some patterns repeat (e.g MACRO and AT_DELIM)
// TODO: and are basically the same, the logic could be
// TODO: pulled out into it's own func.

// TODO: pull stuff out of switch statements into its
// TODO: own function.

// TODO: lots of it could be shortened with regexes, so
// TODO: use them wherever possible.

// TODO: Handle escaping properly, both inside the WORD case
// TODO: and when encountering a "\\", so that we don't need
// TODO: to worry about escaping in other chars' cases.
// TODO: The idea is that we encounter a the escape char \ before
// TODO: the char being escaped, so we can handle the escape
// TODO: early instead of using lookback in other chars' cases.
// TODO: Eventually, I shouldn't need lookback at all.

// TODO: Maybe for cases that fail (i.e ~ but no ~~), I can just
// TODO: have them branch to a handleDefault() that will take
// TODO: care of them. Then I can do
// TODO: `return runLexer(handleDefault(c))` in the branch.

import { Token, TokenType, State } from "./types.ts";

import {
    advance,
    curChar,
    newState,
    addToken,
    lookback,
    lookahead,
    createToken,
    charAtOffset,
    advanceWhile,
    hasSourceLeft,
    substringBetweenStates
} from "./helpers.ts";

// Recursively scan the source.
function runLexer(st: State): State {
    // Base case, no more source left to scan.
    if (hasSourceLeft(st)) {
        const c = curChar(st);

        switch (c) {
            // STAR, DOUBLE_STAR *, **
            case "*":
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

            // DOUBLE_UNDERSCORE __
            case "_":
                if (lookahead(st) == "_") {
                    const type = TokenType.DOUBLE_UNDERSCORE;
                    const lexeme = "__";
                    const token = createToken(st, type, lexeme);
                    return runLexer(advance(addToken(st, token), 2));
                } else {
                    return runLexer(handleOther(st));
                }

            // DOUBLE_TILDE ~~
            case "~":
                if (lookahead(st) == "~") {
                    const type = TokenType.DOUBLE_TILDE;
                    const lexeme = "~~";
                    const token = createToken(st, type, lexeme);
                    return runLexer(advance(addToken(st, token), 2));
                } else {
                    return runLexer(handleOther(st));
                }

            // LEFT_BRACKET [
            case "[": {
                const type = TokenType.LEFT_BRACKET;
                const lexeme = "[";
                const token = createToken(st, type, lexeme);
                return runLexer(advance(addToken(st, token)));
            }

            // BANG_BRACKET ![
            case "!":
                if (lookahead(st) == "[") {
                    const type = TokenType.BANG_BRACKET;
                    const lexeme = "![";
                    const token = createToken(st, type, lexeme);
                    return runLexer(advance(addToken(st, token), 2));
                } else {
                    return runLexer(handleOther(st));
                }

            // BRACKET_PAREN ])
            case "]":
                if (lookahead(st) == "(") {
                    const type = TokenType.BRACKET_PAREN;
                    const lexeme = "](";
                    const token = createToken(st, type, lexeme);
                    return runLexer(advance(addToken(st, token), 2));
                } else {
                    return runLexer(handleOther(st));
                }

            // RIGHT_PAREN
            case ")": {
                const type = TokenType.RIGHT_PAREN;
                const lexeme = ")";
                const token = createToken(st, type, lexeme);
                return runLexer(advance(addToken(st, token)));
            }

            // LEFT_BRACE
            // TODO: Why do we parse braces again? Just for macros?
            // TODO: Can't I just eat up the whole line for macro
            // TODO: definitions and then parse it properly in the
            // TODO: parser stage?
            case "{": {
                const type = TokenType.LEFT_BRACE;
                const lexeme = "{";
                const token = createToken(st, type, lexeme);
                return runLexer(advance(addToken(st, token)));
            }

            // RIGHT_BRACE
            case "}": {
                const type = TokenType.RIGHT_BRACE;
                const lexeme = "}";
                const token = createToken(st, type, lexeme);
                return runLexer(advance(addToken(st, token)));
            }

            // HASH, HASHSTAR (DOUBLE/TRIPLE)
            // TODO: Newline checks. Also space-after-token check.
            case "#":
                if (lookahead(st, 3) == "##*") {
                    const type = TokenType.TRIPLE_HASHSTAR;
                    const lexeme = "###*";
                    const token = createToken(st, type, lexeme);
                    return runLexer(advance(addToken(st, token), 4));
                }

                if (lookahead(st, 2) == "##") {
                    const type = TokenType.TRIPLE_HASH;
                    const lexeme = "###";
                    const token = createToken(st, type, lexeme);
                    return runLexer(advance(addToken(st, token), 3));
                }

                if (lookahead(st, 2) == "#*") {
                    const type = TokenType.DOUBLE_HASHSTAR;
                    const lexeme = "##*";
                    const token = createToken(st, type, lexeme);
                    return runLexer(advance(addToken(st, token), 3));
                }

                if (lookahead(st) == "#") {
                    const type = TokenType.DOUBLE_HASH;
                    const lexeme = "##";
                    const token = createToken(st, type, lexeme);
                    return runLexer(advance(addToken(st, token), 2));
                }

                if (lookahead(st) == "*") {
                    const type = TokenType.HASHSTAR;
                    const lexeme = "#*";
                    const token = createToken(st, type, lexeme);
                    return runLexer(advance(addToken(st, token), 2));
                }

                // Again, extra braces to create scope.
                {
                    const type = TokenType.HASH;
                    const lexeme = "#";
                    const token = createToken(st, type, lexeme);
                    return runLexer(advance(addToken(st, token)));
                }

            // HYPHEN
            // TODO: Do a lookback here for \n to make sure
            // TODO: it's for a list. Same for N_DOT.
            case "-": {
                const type = TokenType.HYPHEN;
                const lexeme = "-";
                const token = createToken(st, type, lexeme);
                return runLexer(advance(addToken(st, token)));
            }

/*
            // MACRO
            // TODO: Actually, there can be spaces inside the macro's
            // TODO: param as well. E.g. \textit{a b c}. So I need to
            // TODO: check for braces as well, before space.
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
                    return runLexer(advance(addToken(st, token), i));
                }
*/

            // Comments
            case "%": {
                const newSt = advanceWhile(st, (curSt) => {
                    return curChar(curSt) != "\n";
                });

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
            case "\n":
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

            // DEFAULT CASE
            default:
                return runLexer(handleOther(st));
        }
    }

    // If there's no source left, we just return the
    // state we have.
    return st;
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
    // Chars like *, **, __, ~~ shouldn't be included in
    // the WORD, and should signal the end of the WORD.
    const newSt = advanceWhile(st, (curSt) => {
        // WORD ends when next char is whitespace.
        const A = /\s/.test(lookahead(curSt));
        // WORD ends when next char is * (italic) or
        // % (comment) and isn't escaped (i.e follows a \)
        const B = /[*%]/.test(lookahead(curSt)) && curChar(curSt) != "\\";
        // WORD ends when next 2 chars are ~~ (strikethrough) or
        // __ (underline) and aren't escaped (i.e follow a \)
        const C = lookahead(curSt, 2) == "~~" && curChar(curSt) != "\\";
        const D = lookahead(curSt, 2) == "__" && curChar(curSt) != "\\";

        if (A || B || C || D) return false;
        else return true;
    });

    // Escape the word.
    const raw = substringBetweenStates(st, newSt);
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
