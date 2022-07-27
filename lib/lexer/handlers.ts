import { TokenType, LexerState as State } from "./types.ts";
import {
    UnexpectedCharError,
    UnclosedSequenceError,
    UnrecognizedCharError,
} from "./errors.ts";

import {
    or,
    and,
    behind,
    createToken,
    isEscapableChar,
    escapeWord,
    onDigit,
    onEndOfLine,
    behindEndOfLine,
} from "./helpers.ts";

export function handleMathDelimiter(st: State, endDelim: string, type: TokenType): void {
    const snap = st.snapshot();
    // Advance until we see the closing delimiter.
    const lexeme = st
            .markPosition()
            .advanceUntil(behind(endDelim))
            // Advance past the closing delimiter.
            .advance(endDelim.length)
            .captureMarkedSubstring();

    // Check to make sure we really did stop at the closing
    // delimiter (instead of the end of the source).
    if (lexeme.endsWith(endDelim)) {
        // If we did, we can create and add the token.
        const rightPad = st.captureRightPad();
        st.addToken(createToken(snap, type, lexeme, rightPad));
    } else {
        // Otherwise it's an error.
        const hint = [
            "If you did not mean to insert a math delimiter,",
            "you should escape the character with a backslash.",
            "For example: '\\$\\$'"
        ].join("\n");

        // We attach the error, backtrack to the marked position,
        // and handle the opening delim as a WORD.
        const err = new UnclosedSequenceError(snap, endDelim, hint);
        handleOther(st.attachError(err).backtrackToMarked());
    }
}

// TODO: Implementation. Currently falls back on handleOther.
export function handleMacroCall(st: State): void {
    handleOther(st);
}

export function handleOther(st: State): void {
    const c = st.curChar();

    // OL_ITEM
    if (/\d/.test(c) && st.isAtStartOfLine()) {
        handleOrderedList(st);
        return;
    }

    // MACRO_DEF
    if (c === "m" && /acro\s/.test(st.lookahead(5)) && st.isAtStartOfLine()) {
        handleMacroDef(st);
        return;
    }

    // HEREDOC
    if (c === "T" && st.lookahead(7) === "EX <<< " && st.isAtStartOfLine()) {
        handleHeredoc(st);
        return;
    }

    // WORD
    if (/\S/.test(c)) {
        handleWord(st);
        return;
    }

    // Ignore extra whitespace (although most of it is already
    // handled as rightPad and EMPTY_ROW).
    if (/\s/.test(c)) {
        st.advance();
        return;
    }

    // At this point, c is an unrecognized character.
    // We create the error, attach it, and move on.
    const snap = st.snapshot();
    const err = new UnrecognizedCharError(snap);
    st.attachError(err).advance();
}

export function handleOrderedList(st: State): void {
    const snap = st.snapshot();

    // Capture the digits.
    const digits = st
        .markPosition()
        .advanceWhile(onDigit)
        .captureMarkedSubstring();

    // Make sure the digits are followed by a dot and a
    // whitespace
    if (st.curChar() === "." && /\s/.test(st.lookahead())) {
        const type = TokenType.OL_ITEM;
        const lexeme = digits + ".";
        const rightPad = st.captureRightPad();
        st.addToken(createToken(snap, type, lexeme, rightPad));
    } else {
        handleWord(st.backtrackToMarked());
    }
}

export function handleMacroDef(st: State): void {
    const snap = st.snapshot();
    const type = TokenType.MACRO_DEF;
    const lexeme = st
        .markPosition()
        .advanceUntil(behindEndOfLine)
        .captureMarkedSubstring();

    // Note there's no rightPad since:
    // - we know the next char is a \n
    // - there's no need for rightPad with MCARO_DEF
    //   tokens since these are not added in the
    //   final document (they're only part of the
    //   preamble)
    st.addToken(createToken(snap, type, lexeme, ""));
}

export function handleHeredoc(st: State): void {
    const snap = st.snapshot();

    const openDelim = st
        .markPosition()
        .advanceUntil(onEndOfLine)
        .captureMarkedSubstring();

    const match = openDelim.match(/^TEX <<< (.+)\n$/);
    if (match === null) {
        const expected = "delimited identifier";
        const hint = [
            "A delimiting identifier is needed to mark the",
            "beginning and end of the raw tex code in the",
            "heredoc block. For example, the identifiers 'EOF'",
            "and 'END' are common, like so:",
            "    TEX <<< END",
            "    % Here goes your TeX code.",
            "    END",
            ""
        ].join("\n");

        const err = new UnexpectedCharError(snap, expected, hint);
        handleWord(st.attachError(err).backtrackToSnapshot(snap));
        return;
    }

    // Get the delimiter from the regex match.
    const delimiter = match[1];

    // We now advance until we see the delimiter on its own
    // on a new line i.e surrounded by \n, or at the end
    // of the file, which also counts as being on its own
    // line. To check for end of file, we check the length of
    // the string returned by lookahead.
    const endOfFile = (st: State) =>
        // lookahead(k) only returns whatever is left if k is greater
        // than the number of chars left in source. This means if it
        // returns a string of length less than k, then we're near the
        // end of the file.
        st.lookahead(delimiter.length + 2).length === delimiter.length + 1;
    const behindDelimAndNewline = behind("\n" + delimiter + "\n");
    const behindDelimAndEOF = and(behind("\n" + delimiter), endOfFile);
    const advanceFn = or(behindDelimAndEOF, behindDelimAndNewline);

    // Capture everything until the closing delim is
    // found by our advanceFn.
    const contents = st
        // We also need to advance first before marking the
        // position because right now the state is at the \n
        // of the opening delim, which we ALREADY captured
        // so we don't want to capture the same \n twice.
        .advance()
        .markPosition()
        .advanceUntil(advanceFn)
        // Advance once more so we can also capture the \n
        // that comes BEFORE the closing delimiter.
        .advance()
        .captureMarkedSubstring();

    // Check that we really did end before the delimiter (it's
    // possible that the state stopped advancing due to running
    // out of tokens, which is an error).
    if (st.lookahead(delimiter.length) !== delimiter) {
        const hint = ([
            "A delimiting identifier is needed to mark the",
            "beginning and end of the raw tex code in the",
            "heredoc block. For example, the identifiers 'EOF'",
            "and 'END' are common, like so:",
            "",
            "    TEX <<< END",
            "    % Here goes your TeX code.",
            "    END",
            ""
        ]).join("\n")

        const err = new UnclosedSequenceError(snap, delimiter, hint);
        handleWord(st.attachError(err).backtrackToSnapshot(snap));
        return;
    }

    // At this point we know everything up to the next \n
    // is part of the closing delimiter.
    const closeDelim = st
        // The last advanceFn stopped on a newline, so we need
        // to advance once here to get past that newline (otherwise
        // we'll end up capturing the same \n twice).
        .advance()
        .markPosition()
        // Capture everything up to the next end of line. If
        // there's no end of line (i.e we're near the end of
        // the file), the function will just eat everything
        // remaining.
        .advanceUntil(behindEndOfLine)
        .captureMarkedSubstring();

    const type = TokenType.HEREDOC_TEX;
    const lexeme = openDelim + contents + closeDelim;
    // Note no rightPad is needed for HEREDOCs
    // We also advance since right now we're on the last char
    // of the closing delimiter (i.e behind the final end of line).
    // We advance so we don't end up capturing the last char as
    // another WORD.
    st.addToken(createToken(snap, type, lexeme, "")).advance();
}

export function handleWord(st: State): void {
    const predicate = (st: State) => {
        // Always stop when we see a whitespace.
        if (/\s/.test(st.lookahead())) return true;

        // If we see a backslash \, check if the next
        // char after it is escapable. if so, we advance
        // twice to include them in the WORD and continue
        // onwards. Otherwise, we stop, so that the \ is
        // then handled appropriately by the lexer (i.e as
        // a LaTeX math delimiter maybe or a macro call).
        if (st.lookahead() === "\\") {
            if (isEscapableChar(st.lookahead(2)[1])) {
                st.advance(2);
                return false;
            } else {
                return true;
            }
        }

        // If we see one of the special double-char sequences
        // that are meaningful, we stop.
        if (["~~", "__", "](", "!["].includes(st.lookahead(2))) return true;
        // Or if we see the first char of a single- or
        // single-or-double-char sequence that is meaningful,
        // we stop.
        if (/[%\[@\)*$]/.test(st.lookahead())) return true;

        // Otherwise, we advance through everything else.
        return false;
    }

    const snap = st.snapshot();
    const raw = st
        .markPosition()
        .advanceUntil(predicate)
        .captureMarkedSubstring();

    const type = TokenType.WORD;
    const lexeme = escapeWord(raw);
    const rightPad = st.captureRightPad();
    st.addToken(createToken(snap, type, lexeme, rightPad));
}
