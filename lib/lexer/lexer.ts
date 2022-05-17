import { Token, TokenType, LexerState as State, LexerError } from "./types.ts";
import {
    UnrecognizedCharError,
    UnexpectedCharError
} from "./errors.ts";

import {
    advance,
    curChar,
    newState,
    addToken,
    lookback,
    lookahead,
    escapeWord,
    attachError,
    createToken,
    advanceWhile,
    hasSourceLeft,
    advanceWhileEscaping,
    substringBetweenStates
} from "./helpers.ts";

// TODO: Change lexer so that lexemes also include the whitespace
// TODO: that follows them (excluding newlines). For example, for
// TODO: "word1 word2", the first lexeme should be "word1 " (with
// TODO: the space at the end) and the second should be "word2"
// TODO: (no space). The idea is that after lexing, if I take all
// TODO: the tokens and join their lexemes together again, the
// TODO: resulting string should match with the original source.
// TODO: Maybe I can include the whitespace in the lexeme but NOT
// TODO: actually advance the state over that whitespace, since a
// TODO: lot of stuff like advance depends on this whitespace to
// TODO: determine position/structure/etc.

// TODO: Make sure all TokenTypes are added. Some like TEX/LATEX
// TODO: math delimiters are missing.

// TODO: Add SOF/EOF tokens.

// TODO: Errors.

// TODO: Add a new "advanceUntil" helper and use that wherever it
// TODO: helps readability.

// Recursively scan the source.
function runLexer(st: State): State {
    // Base case, no more source left to scan.
    // We just insert the EOF token and then
    // return the state we have.
    if (!hasSourceLeft(st)) {
        return st;
    }

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
        case "#": {
            // Headings need to be at the start of a new line.
            // We also check for an empty lookback since
            // headings could be at the very start of a file
            // (which means no characters to look back at, which
            // means empty lookback string).
            if (lookback(st) != "\n" || lookback(st) != "") {
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

    // WORD
    if (/\S/.test(c)) {
        return handleWord(st);
    }

    // Ignore extra whitespace.
    if (/\s/.test(c)) {
        return advance(st);
    }

    // At this point, c is an unrecognized character.
    const err = new UnrecognizedCharError(st);
    // Attach error to state.
    const newSt = attachError(st, err);
    // Continue on.
    return advance(newSt);
}

// OL_ITEM
function handleOrderedList(st: State): State {
    // Eat up all the digits.
    const newSt = advanceWhile(st, (curSt => {
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
// TODO: Testing. Apparently goes into an infinite loop somewhere.
function handleHeredoc(st: State): State {
    // Advance until we reach a newline.
    const newSt = advanceWhile(st, (curSt) => {
        return curChar(curSt) != "\n";
    });

    // Get the line string and use regex to get the
    // delimiting identifier.
    const line = substringBetweenStates(st, newSt);
    const match = line.match(/^TEX <<< (.*)\n$/);

    // If the match fails, we attach an error to original
    // st and continue parsing stuff as a WORD.
    if (match === null) {
        const expected = "delimiting identifier";
        const hint = ([
            "A delimiting identifier is needed to mark the",
            "beginning and end of the raw tex code in the",
            "heredoc block. For example, the identifiers 'EOF'",
            "and 'END' are common, like so:",
            "    TEX <<< END",
            "    % Here goes your TeX code.",
            "    END",
            ""
        ]).join("\n")
        // We use newSt to CREATE the error because the error class
        // takes newSt's cur position (a newline in this case) when
        // showing "Expected ..., got: '\n'". The original st on the
        // other hand is sitting at T(EX) so we can't use that.
        const err = new UnexpectedCharError(newSt, expected, hint);
        // Then we attach the error to the original st and let it
        // continue from the T(EX) position, parsing everything as a
        // word. I guess this isn't a fatal error, then?
        return handleWord(attachError(st, err));
    }

    // Get the captured identifier.
    const marker = match[1];
    // We keep advancing until we see the identifier appear
    // on a new line.
    const newSt2 = advanceWhile(newSt, (curSt) => {
        // Get lookahead for marker length + 1 to make sure
        // its on its own line and nothing else is there.
        const str = lookahead(curSt, marker.length + 1);
        return !(
            // First make sure the current character is a new
            // line, so we know the marker afterwards is at the
            // start of a new line.
            curChar(curSt) == "\n" &&
            // Now check that the lookahead equals marker + newline,
            // which means nothing else appears after it on the line.
            // However, if the marker appears the end of a file, it
            // could be on its own line but still not have the \n
            // char at the end since its the last line of the file.
            // In this case, the lookahead would just return a string
            // of the same length as the marker (so it would ignore
            // the + 1 we did), which means we just need to do a simple
            // str == marker check to cover that case.
            ((str == marker + "\n") || (str == marker))
        );
    });

    // Check that we really did see the marker in the lookahead
    // instead of advanceWhile finishing because of running out
    // of source, in which case it's an error.
    if (!hasSourceLeft(newSt2)) {
        // Same logic as above, but with newSt2.
        const expected = "delimiting identifier";
        const hint = ([
            "A delimiting identifier is needed to mark the",
            "beginning and end of the raw tex code in the",
            "heredoc block. For example, the identifiers 'EOF'",
            "and 'END' are common, like so:",
            "    TEX <<< END",
            "    % Here goes your TeX code.",
            "    END",
            ""
        ]).join("\n")
        const err = new UnexpectedCharError(newSt2, expected, hint);
        return handleWord(attachError(st, err));
    }

    // At this point we know we matched a proper heredoc block.
    // We advance newSt2 to cover the closing delimiting marker
    // (since its currently at the end of the previous line).
    // We also advance newSt2 once first since it's already
    // sitting on a \n char, if you go check above.
    const newSt3 = advanceWhile(advance(newSt2), (curSt) => {
        return curChar(curSt) != "\n";
    })

    // newSt is at the end of the opening heredoc delimiter
    // line, and newSt2 was at the end of line before the
    // closing delimiter line, so the substring between them
    // contains all the raw tex code (including some extra
    // \n's around it which we slice off).
    const innerStr = substringBetweenStates(newSt, newSt2).slice(1,-1);

    const type = TokenType.HEREDOC_BLOCK;
    const lexeme = innerStr;
    const token = createToken(st, type, lexeme);
    return addToken(newSt3, token);
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
    // TODO: Am I supposed to advance here?
    return advance(addToken(newSt, token));
}

// Starts the lexer and returns the final tokens.
export function lex(src: string): Token[] {
    const st = newState(src);

    // We insert the SOF token first before running the lexer.
    const sofType = TokenType.SOF;
    const sofLexeme = "";
    const sofToken = createToken(st, sofType, sofLexeme);
    const newSt = runLexer(addToken(st, sofToken));

    // We insert the EOF token at the end after lexing.
    const eofType = TokenType.EOF;
    const eofLexeme = "";
    const eofToken = createToken(newSt, eofType, eofLexeme);
    const finalState = addToken(newSt, eofToken);

    // TODO: We shouldn't be printing or doing any IO
    // TODO: inside lex, since we don't know where
    // TODO: this is function is being used (i.e could
    // TODO: be the terminal or could be on the web).
    // Print errors if any.
    if (finalState.errors.length > 0) {
        finalState.errors.forEach((e: LexerError) => e.print());
    }

    // Check if any errors were fatal. If so,
    // we don't return any tokens.
    if (finalState.errors.some((e: LexerError) => e.fatal)) {
        return [];
    }

    // TODO: Should I just return the final state itself
    // TODO: instead of just the tokens?
    return finalState.tokens;
}
