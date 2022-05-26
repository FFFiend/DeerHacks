import { State } from "./state.ts";
import { Token, TokenType } from "./types.ts";

import {
    handleOther,
    handleMacroCall,
    handleMathDelimiter
} from "./handlers.ts";

import {
    not,
    createToken,
    onEndOfLine,
    isEscapableChar,
    behindWhitespace,
} from "./helpers.ts";

function runLexer(st: State): void {
    while (st.hasSourceLeft()) {
        const c = st.curChar();
        // We store the snapshot right now, since we'll
        // need it when creating tokens later.
        const snap = st.snapshot();

        switch (c) {
            case "$": {
                if (st.lookahead() == "$") {
                    handleMathDelimiter(st, "$$", TokenType.TEX_DISPLAY_MATH);
                } else {
                    handleMathDelimiter(st, "$", TokenType.TEX_INLINE_MATH);
                }

                break;
            }

            case "\\": {
                if (st.lookahead() == "[") {
                    handleMathDelimiter(st, "\\]", TokenType.LATEX_DISPLAY_MATH);
                    break;
                }

                if (st.lookahead() == "(") {
                    handleMathDelimiter(st, "\\)", TokenType.LATEX_INLINE_MATH);
                    break;
                }

                // If it's an escapable, we skip over the \ and handle
                // the char as a WORD so it's inserted in the document.
                if (isEscapableChar(st.lookahead())) {
                    handleOther(st.advance());
                    break;
                }

                // Otherwise, we default to assuming the \ is the start
                // of some TeX/LaTeX command/macro and handle it as such.
                handleMacroCall(st);
                break;
            }

            case "*": {
                if (st.lookahead() == "*") {
                    const type = TokenType.DOUBLE_STAR;
                    const lexeme = "**";
                    const rightPad = st.advance().captureRightPad();
                    st.addToken(createToken(snap, type, lexeme, rightPad));
                } else {
                    const type = TokenType.STAR;
                    const lexeme = "*";
                    const rightPad = st.captureRightPad();
                    st.addToken(createToken(snap, type, lexeme, rightPad));
                }

                break;
            }

            case "_": {
                if (st.lookahead() == "_") {
                    const type = TokenType.DOUBLE_UNDERSCORE;
                    const lexeme = "__";
                    const rightPad = st.advance().captureRightPad();
                    st.addToken(createToken(snap, type, lexeme, rightPad));
                } else {
                    handleOther(st);
                }

                break;
            }

            case "~": {
                if (st.lookahead() == "~") {
                    const type = TokenType.DOUBLE_TILDE;
                    const lexeme = "~~";
                    const rightPad = st.advance().captureRightPad();
                    st.addToken(createToken(snap, type, lexeme, rightPad));
                } else {
                    handleOther(st);
                }

                break;
            }

            case "[": {
                const type = TokenType.LEFT_BRACKET;
                const lexeme = "[";
                const rightPad = st.captureRightPad();
                st.addToken(createToken(snap, type, lexeme, rightPad));
                break;
            }

            case "!": {
                if (st.lookahead() == "[") {
                    const type = TokenType.BANG_BRACKET;
                    const lexeme = "![";
                    const rightPad = st.advance().captureRightPad();
                    st.addToken(createToken(snap, type, lexeme, rightPad));
                } else {
                    handleOther(st);
                }

                break;
            }

            case "]": {
                if (st.lookahead() == "(") {
                    const type = TokenType.BRACKET_PAREN;
                    const lexeme = "](";
                    const rightPad = st.advance().captureRightPad();
                    st.addToken(createToken(snap, type, lexeme, rightPad));
                } else {
                    handleOther(st);
                }

                break;
            }

            case ")": {
                const type = TokenType.RIGHT_PAREN;
                const lexeme = ")";
                const rightPad = st.captureRightPad();
                st.addToken(createToken(snap, type, lexeme, rightPad));
                break;
            }

            case "#": {
                // We only treat # as a section/heading if
                // it's at the start of a line.
                if (!st.isAtStartOfLine()) {
                    handleOther(st);
                    break;
                }

                if (st.lookahead(4) === "##* ") {
                    const type = TokenType.TRIPLE_HASHSTAR;
                    const lexeme = "###*";
                    const rightPad = st.advance(3).captureRightPad();
                    st.addToken(createToken(snap, type, lexeme, rightPad));
                    break;
                }

                if (st.lookahead(3) === "## ") {
                    const type = TokenType.TRIPLE_HASH;
                    const lexeme = "###";
                    const rightPad = st.advance(2).captureRightPad();
                    st.addToken(createToken(snap, type, lexeme, rightPad));
                    break;
                }

                if (st.lookahead(3) === "#* ") {
                    const type = TokenType.DOUBLE_HASHSTAR;
                    const lexeme = "##*";
                    const rightPad = st.advance(2).captureRightPad();
                    st.addToken(createToken(snap, type, lexeme, rightPad));
                    break;
                }

                if (st.lookahead(2) === "# ") {
                    const type = TokenType.DOUBLE_HASH;
                    const lexeme = "##";
                    const rightPad = st.advance().captureRightPad();
                    st.addToken(createToken(snap, type, lexeme, rightPad));
                    break;
                }

                if (st.lookahead(2) === "* ") {
                    const type = TokenType.HASHSTAR;
                    const lexeme = "#*";
                    const rightPad = st.advance().captureRightPad();
                    st.addToken(createToken(snap, type, lexeme, rightPad));
                    break;
                }

                if (st.lookahead() === " ") {
                    const type = TokenType.HASH;
                    const lexeme = "#";
                    const rightPad = st.captureRightPad();
                    st.addToken(createToken(snap, type, lexeme, rightPad));
                    break;
                }

                handleOther(st);
                break;
            }

            case "-": {
                if (st.isAtStartOfLine() && st.lookahead() === " ") {
                    const type = TokenType.UL_ITEM;
                    const lexeme = "-";
                    const rightPad = st.captureRightPad();
                    st.addToken(createToken(snap, type, lexeme, rightPad));
                } else {
                    handleOther(st);
                }

                break;
            }

            case "%": {
                // Skip to the end of the line, and then once more
                // to get past the \n.
                st.advanceUntil(onEndOfLine).advance();
                break;
            }

            case "@": {
                const lexeme = st
                    .markPosition()
                    .advanceUntil(behindWhitespace)
                    .captureMarkedSubstring();

                // Before adding this as a token, check that we
                // actually did capture something after the @,
                // otherwise it means the @ appeared on its own
                // in which case we just handle it as a WORD.
                if (lexeme.length > 1) {
                    const type = TokenType.AT_DELIM;
                    const rightPad = st.captureRightPad();
                    st.addToken(createToken(snap, type, lexeme, rightPad));
                } else {
                    handleOther(st);
                }

                break;
            }

            case "\n": {
                if (st.lookahead() === "\n") {
                    const type = TokenType.EMPTY_ROW;
                    const lexeme = st
                        .markPosition()
                        .advanceUntil(not(behindWhitespace))
                        .captureMarkedSubstring();

                    // Note no rightPad for EMPTY_ROW since it's
                    // already just a bunch of whitespace.
                    st.addToken(createToken(snap, type, lexeme, ""));
                } else {
                    // Skip newlines otherwise.
                    st.advance();
                }

                break;
            }

            default: {
                handleOther(st);
            }
        }
    }
}

export function lex(src: string): State {
    const state = new State(src);

    const nullSnap = { position: 0, col: 0, row: 0, source: src };
    // Add EOF token to the beginning.
    state.addToken(
        createToken(
            nullSnap,
            TokenType.SOF,
            "",
            ""
        )
    );

    // Run the lexer.
    runLexer(state);

    // Add the EOF token to the end.
    state.addToken(
        createToken(
            nullSnap,
            TokenType.EOF,
            "",
            ""
        )
    );

    return state;
}

export function happyLex(src: string): Token[] {
    const state = lex(src);
    state.getErrors().forEach(e => e.print());
    return state.getTokens();
}
