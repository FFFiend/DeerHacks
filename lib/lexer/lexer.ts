import { Token, TokenType, LexerState as State, LexerError } from "./types.ts";
import {
    UnexpectedCharError,
    UnrecognizedCharError,
    UnclosedSequenceError
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
    isAtStartOfLine,
    captureRightPad,
    advanceWhileEscaping,
    substringBetweenStates
} from "./helpers.ts";

// TODO: Implement errors.
// TODO: --------------------------------------------------------

// TODO: Add a new "advanceUntil" helper and use that wherever it
// TODO: helps readability.
// TODO: --------------------------------------------------------

// TODO: Could speed up the lexer ever so slightly by having the
// TODO: captureRightPad function be one that returns a state
// TODO: that's advance up to the next token's char. This way I
// TODO: needlessly advance the same state multiple times when
// TODO: capturing right padding (first in captureRightPad, and
// TODO: then again in the parser itself since the return line
// TODO: uses the original state that's still positioned behind
// TODO: the padding.)
// TODO: --------------------------------------------------------

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
        // TEX_INLINE_MATH, TEX_DISPLAY_MATH
        case "$": {
            // Check if it's a double $$ for display math.
            if (lookahead(st) == "$") {
                return runLexer(handleMathDelimiter(
                    st,
                    "$$",
                    TokenType.TEX_DISPLAY_MATH
                ));
            }

            // If not, lex it as inline math.
            return runLexer(handleMathDelimiter(
                st,
                "$",
                TokenType.TEX_INLINE_MATH
            ));
        }

        // LATEX_DISPLAY_MATH, LATEX_INLINE_MATH
        case "\\": {
            // Check if it's \[ for LaTeX display math.
            if (lookahead(st) == "[") {
                return runLexer(handleMathDelimiter(
                    st,
                    "\\]",
                    TokenType.LATEX_DISPLAY_MATH
                ));
            }

            // Of if it's a \( for inline math.
            if (lookahead(st) == "(") {
                return runLexer(handleMathDelimiter(
                    st,
                    "\\)",
                    TokenType.LATEX_INLINE_MATH
                ));
            }

            // If it's neither, then we handle it as a macro call.
            return runLexer(handleMacroCall(st));
        }

        // STAR, DOUBLE_STAR *, **
        case "*": {
            if (lookahead(st) == "*") {
                const type = TokenType.DOUBLE_STAR;
                const lexeme = "**";
                // We advance st once because right now it's at
                // the first *, and we know the next char is
                // another * so we need to start capturing from
                // there.
                const rightPad = captureRightPad(advance(st));
                const token = createToken(st, type, lexeme, rightPad);

                // Add token, advance twice, continue lexing.
                return runLexer(advance(addToken(st, token), 2));
            } else {
                const type = TokenType.STAR;
                const lexeme = "*";
                const rightPad = captureRightPad(st);
                const token = createToken(st, type, lexeme, rightPad);

                // Advance once since STAR has length one.
                return runLexer(advance(addToken(st, token)));
            }
        }

        // DOUBLE_UNDERSCORE __
        case "_": {
            if (lookahead(st) == "_") {
                const type = TokenType.DOUBLE_UNDERSCORE;
                const lexeme = "__";
                const rightPad = captureRightPad(advance(st));
                const token = createToken(st, type, lexeme, rightPad);
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
                const rightPad = captureRightPad(advance(st));
                const token = createToken(st, type, lexeme, rightPad);
                return runLexer(advance(addToken(st, token), 2));
            } else {
                return runLexer(handleOther(st));
            }
        }

        // LEFT_BRACKET [
        case "[": {
            const type = TokenType.LEFT_BRACKET;
            const lexeme = "[";
            const rightPad = captureRightPad(st);
            const token = createToken(st, type, lexeme, rightPad);
            return runLexer(advance(addToken(st, token)));
        }

        // BANG_BRACKET ![
        case "!": {
            if (lookahead(st) == "[") {
                const type = TokenType.BANG_BRACKET;
                const lexeme = "![";
                const rightPad = captureRightPad(advance(st));
                const token = createToken(st, type, lexeme, rightPad);
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
                const rightPad = captureRightPad(advance(st));
                const token = createToken(st, type, lexeme, rightPad);
                return runLexer(advance(addToken(st, token), 2));
            } else {
                return runLexer(handleOther(st));
            }
        }

        // RIGHT_PAREN
        case ")": {
            const type = TokenType.RIGHT_PAREN;
            const lexeme = ")";
            const rightPad = captureRightPad(st);
            const token = createToken(st, type, lexeme, rightPad);
            return runLexer(advance(addToken(st, token)));
        }

        // HASH, HASHSTAR (DOUBLE/TRIPLE)
        case "#": {
            // Headings need to be at the start of a new line.
            // We also check for an empty lookback since
            // headings could be at the very start of a file
            // (which means no characters to look back at, which
            // means empty lookback string).
            if (!isAtStartOfLine(st)) {
                return runLexer(handleOther(st));
            }

            // Headings also need to be followed by a space
            // character.
            if (lookahead(st, 4) == "##* ") {
                const type = TokenType.TRIPLE_HASHSTAR;
                const lexeme = "###*";
                const rightPad = captureRightPad(advance(st, 3));
                const token = createToken(st, type, lexeme, rightPad);
                return runLexer(advance(addToken(st, token), 4));
            }

            if (lookahead(st, 3) == "## ") {
                const type = TokenType.TRIPLE_HASH;
                const lexeme = "###";
                const rightPad = captureRightPad(advance(st, 2));
                const token = createToken(st, type, lexeme, rightPad);
                return runLexer(advance(addToken(st, token), 3));
            }

            if (lookahead(st, 3) == "#* ") {
                const type = TokenType.DOUBLE_HASHSTAR;
                const lexeme = "##*";
                const rightPad = captureRightPad(advance(st, 2));
                const token = createToken(st, type, lexeme, rightPad);
                return runLexer(advance(addToken(st, token), 3));
            }

            if (lookahead(st, 2) == "# ") {
                const type = TokenType.DOUBLE_HASH;
                const lexeme = "##";
                const rightPad = captureRightPad(advance(st));
                const token = createToken(st, type, lexeme, rightPad);
                return runLexer(advance(addToken(st, token), 2));
            }

            if (lookahead(st, 2) == "* ") {
                const type = TokenType.HASHSTAR;
                const lexeme = "#*";
                const rightPad = captureRightPad(advance(st));
                const token = createToken(st, type, lexeme, rightPad);
                return runLexer(advance(addToken(st, token), 2));
            }

            if (lookahead(st) == " ") {
                const type = TokenType.HASH;
                const lexeme = "#";
                const rightPad = captureRightPad(st);
                const token = createToken(st, type, lexeme, rightPad);
                return runLexer(advance(addToken(st, token)));
            }

            // Not a heading.
            return runLexer(handleOther(st));
        }

        // UL_ITEM
        case "-": {
            // Needs to be at the start of the line and with a
            // space following it.
            if (isAtStartOfLine(st) && lookahead(st) == " ") {
                const type = TokenType.UL_ITEM;
                const lexeme = "-";
                const rightPad = captureRightPad(st);
                const token = createToken(st, type, lexeme, rightPad);
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
                const nonWhitespace = /\S/.test(lookahead(curSt));

                return samePosition || nonWhitespace;
            });

            // Make sure we actually moved before adding the
            // token, otherwise it's just a lone '@'
            if (newSt.position > st.position) {
                const type = TokenType.AT_DELIM;
                // -1 because the newSt's position is the whitespace
                // char after the @XYZ.
                const lexeme = substringBetweenStates(st, newSt);
                const rightPad = captureRightPad(newSt);
                const token = createToken(st, type, lexeme, rightPad);

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
                // Note for EMPTY_ROW we don't keep any rightPad since
                // it's not really relevant here.
                const token = createToken(st, type, lexeme, "");
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

function handleMathDelimiter(st: State, closeDelim: string, tokenType: TokenType): State {
    // TODO: Change this to an advanceUntil.
    const newSt = advanceWhile(st, (curSt) => {
        // Advance until we see the closing delimiter.
        return lookahead(curSt, closeDelim.length) != closeDelim;
    });

    // Check that we actually found the closing $$
    // instead of advanceWhile finishing because of
    // running out of source.
    if (lookahead(newSt, closeDelim.length) != closeDelim) {
        const hint = [
            "If you did not mean to insert a math delimiter,",
            "you should escape the character with a backslash.",
            "For example: '\\$\\$'"
        ].join("\n");

        const err = new UnclosedSequenceError(st, closeDelim, hint);
        // Attach error, backtrack to `st`, handling the
        // opening delimiter as a WORD, and move on.
        return handleOther(attachError(st, err));
    }

    // Advance twice since we're currently on the
    // character right before the closing delim sequence.
    const newSt2 = advance(newSt, closeDelim.length);
    const substring = substringBetweenStates(st, newSt2);
    const type = tokenType;
    const lexeme = substring;
    const rightPad = captureRightPad(newSt2);
    const token = createToken(st, type, lexeme, rightPad);

    return advance(addToken(newSt2, token));
}

// TODO: Handle macro calls here. Markup doesn't (shouldnt?)
// TODO: work inside macro params? Not sure...
function handleMacroCall(st: State): State {
    return handleOther(st);
}

// The default case for the switch statement, when
// a character doesn't match any special context.
function handleOther(st: State): State {
    const c = curChar(st);

    // OL_ITEM
    if (/\d/.test(c) && isAtStartOfLine(st)) {
        return handleOrderedList(st);
    }

    // MACRO_DEF
    if (c == "m" && lookahead(st, 5) == "acro " && isAtStartOfLine(st)) {
        return handleMacroDef(st);
    }

    // HEREDOC
    if (c == "T" && lookahead(st, 7) == "EX <<< " && isAtStartOfLine(st)) {
        return handleHeredoc(st);
    }

    // WORD
    if (/\S/.test(c)) {
        return handleWord(st);
    }

    // Ignore extra whitespace. Even though most
    // whitespace is consumed as rightPad after
    // lexing tokens, there's still extra newlines
    // and possibly other whitespace chars that we
    // can just ignore.
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
    const newSt = advanceWhile(st, (curSt) => {
        return /\d/.test(curChar(curSt));
    });

    // The numbers need to be followed by a dot and space.
    if (curChar(newSt) == "." && lookahead(newSt) == " ") {
        const type = TokenType.OL_ITEM;
        const lexeme = substringBetweenStates(st, newSt);
        const rightPad = captureRightPad(newSt);
        const token = createToken(st, type, lexeme, rightPad);
        return advance(addToken(newSt, token));
    } else {
        // Otherwise, just treat it as a word.
        return handleWord(st);
    }
}

// MACRO_DEF
// TODO: Currently limited to only a single line.
// TODO: Eventually, we want users to be able to
// TODO: define macros spanning multiple lines
// TODO: as well.
function handleMacroDef(st: State): State {
    const newSt = advanceWhile(st, (curSt) => {
        return lookahead(curSt) != "\n";
    });

    const type = TokenType.MACRO_DEF;
    const lexeme = substringBetweenStates(st, newSt);
    // The rightPad is an empty string since we just ate an
    // entire line, so there's no significant padding here.
    const token = createToken(st, type, lexeme, "");
    return advance(addToken(newSt, token));
}

// Eats up the TEX <<< <MARKER> line and all lines until the ending
// <MARKER> line.
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

    // Collect the lexeme, from the TEX <<< EOF line to the
    // ending EOF delimiter (excluding the \n at the end).
    const innerStr = substringBetweenStates(st, newSt3).slice(0,-1);

    const type = TokenType.HEREDOC_BLOCK;
    const lexeme = innerStr;
    // No significant padding here either.
    const token = createToken(st, type, lexeme, "");

    // NOTE: We do NOT want to advance here because we don't
    // NOTE: want to skip the \n at the end (if we do so, we
    // NOTE: might end up missing an EMPTY_ROW token that
    // NOTE: the user would expect to start a new para).
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
    const rightPad = captureRightPad(newSt);
    const token = createToken(st, type, lexeme, rightPad);
    return advance(addToken(newSt, token));
}

/**
* Starts the lexer and returns the final state object.
* @param {string} src The source string to lex.
* @returns {State} The final state after lexing the entire source string.
*/
export function lex(src: string): State {
    const st = newState(src);

    // We insert the SOF token first before running the lexer.
    const sofType = TokenType.SOF;
    const sofLexeme = "";
    // No padding for SOF or EOF of course.
    const sofToken = createToken(st, sofType, sofLexeme, "");
    const newSt = runLexer(addToken(st, sofToken));

    // We insert the EOF token at the end after lexing.
    const eofType = TokenType.EOF;
    const eofLexeme = "";
    const eofToken = createToken(newSt, eofType, eofLexeme, "");
    const finalState = addToken(newSt, eofToken);

    return finalState
}

/**
* Runs the lexer on the source and returns the final list of
* tokens. Lexer errors, if any, are printed to the console.
* @param {string} src - The source string to lex.
* @returns {Token[]} List of scanned token objects.
*/
export function happyLex(src: string): Token[] {
    const finalState = lex(src);
    finalState.errors.forEach(e => e.print());
    return finalState.tokens;
}
