import { LexerError, Snapshot, StatePredicate } from "./types.ts";
import { Token } from "./types.ts";
import {
    and,
    not,
    constrainList,
    tokenToString,
    behindEndOfLine,
    constrainString,
    behindWhitespace,
    onEndOfLine,
    onWhitespace
} from "./helpers.ts";

// TODO: Move to types (not for lex/parse/render, just the general one).
type Colorer = (str: string, color: string) => string

export class State {
    private row: number;
    private col: number;
//    private config: Config;
    private source: string;
    private tokens: Token[];
    private errors: LexerError[];
    private position: number;
    private markedPosition: number;

    constructor(source: string) {
        this.row = 1;
        this.col = 1;
//        this.config = {};
        this.source = source;
        this.tokens = [];
        this.errors = [];
        this.position = 0;
        this.markedPosition = 0;
    }

    public getTokens(): Token[] {
        return this.tokens;
    }

    public getErrors(): LexerError[] {
        return this.errors;
    }

    public hasSourceLeft(): boolean {
        return this.position < this.source.length;
    }

    public attachError(err: LexerError): State {
        this.errors.push(err);
        return this;
    }

    public addToken(t: Token): State {
        this.tokens.push(t);
        return this;
    }

    public isAtStartOfLine(): boolean {
        return this.col === 1;
    }

    public curChar(): string {
        return this.source[this.position];
    }

    public snapshot(): Snapshot {
        return {
            source: this.source,
            position: this.position,
            col: this.col,
            row: this.row
        };
    }

    public lookahead(n: number = 1): string {
        // `start` is inclusive, so we increment it otherwise
        // the current character would also be included in the
        // lookahead. `end` is exclusive, so again we add one
        // to make sure we return `n` and not `n - 1` chars
        // in the lookahead. Also, if `n` is greater than the
        // number of chars left in the source, it will simply
        // return whatever is left, or an empty string if
        // nothing is left.
        const start = this.position + 1;
        const end   = this.position + n + 1;
        return this.source.slice(start, end);
    }

    public lookback(n: number = 1): string {
        // `start` is inclusive so no need for minus one.
        const start = this.position - n;
        // `end` is exclusive so it already excludes the
        // current char from the slice, exactly as we want.
        const end = this.position;
        return this.source.slice(start, end);
    }

    public advanceOnce(): State {
        if (this.hasSourceLeft()) {
            const endOfLine = this.curChar() === "\n";

            this.position += 1;
            this.col = endOfLine ? 1 : this.col + 1;
            this.row = endOfLine ? this.row + 1 : this.row;
        }

        return this;
    }

    public advance(n: number = 1): State {
        while (n > 0) {
            this.advanceOnce();
            n--;
        }

        return this;
    }

    public advanceWhile(fn: StatePredicate): State {
        while (this.hasSourceLeft() && fn(this)) {
            this.advanceOnce();
        }

        return this;
    }

    public advanceUntil(fn: StatePredicate): State {
        // advanceUntil is really just the same as
        // advanceWhile, but with the predicate negated.
        return this.advanceWhile(not(fn));
    }

    public markPosition(): State {
        this.markedPosition = this.position;
        return this;
    }

    public backtrackToMarked(): State {
        this.position = this.markedPosition;
        return this;
    }

    public backtrackToSnapshot(snap: Snapshot): State {
        this.position = snap.position;
        return this;
    }

    public captureMarkedSubstring(): string {
        const start = this.markedPosition;
        const end = this.position + 1;
        return this.source.slice(start, end);
    }

    public captureRightPad(): string {
        // Keep advancing if we're on whitespace, EXCEPT
        // for newlines, which we handle differently.
        const advanceFn = and(onWhitespace, not(onEndOfLine));

        const rightPad = this
            // We're currently on the last char of the
            // token that was just scanned when this
            // function was called, so we move past
            // that first.
            .advance()
            .markPosition()
            .advanceWhile(advanceFn)
            .captureMarkedSubstring();

        // If we DID happen to stop behind a newline, then
        // we add that as part of the rightPad, WITHOUT
        // actually advancing state. This is so that we
        // capture newlines properly in the padding, without
        // consuming the newline so that the lexer can still
        // see it and handle EMPTY_ROWs. We also slice away
        // the LAST char from the captured rightPad string
        // because captureMarkedSubstring is inclusive and
        // so it also captures the nonwhitespace char (or
        // the newline char) that we stopped on.
        if (this.lookahead() === "\n") {
            return rightPad.slice(0, rightPad.length - 1) + "\n";
        } else {
            return rightPad.slice(0, rightPad.length - 1);
        }
    }

    // Pretty string representation, can take a colorer function
    // to use for wrapping parts of the string in nice colors.
    public toString(colorer?: Colorer) {
        const color = colorer !== undefined
                    ? colorer
                    : (str: string, _color: string) => str;

        const r = (str: string) => color(str, "red");
        const g = (str: string) => color(str, "green");
        const b = (str: string) => color(str, "blue");

        const col = this.col.toString();
        const row = this.row.toString();

        // Constrain number of tokens so we don't print too many.
        const tokens = constrainList(this.tokens, 10)
            // Convert to strings
            .map(t => tokenToString(t, color))
            // Add indentation.
            .map(s => "    " + s);

        const startTokens = tokens.slice(0, 5);
        const endTokens   = tokens.slice(5, 10);

        return [
            r("State") + " {",
            "  Source   = '" + g(constrainString(this.source)) + "'",
            "  Position = " + this.position,
            "  C:R      = " + b(col) + ":" + b(row),
            "  Errors   = " + b(this.errors.length.toString()),
            "  Tokens   = ",
            startTokens.join("\n") + (this.tokens.length > 10 ? "\n    ..." : ""),
            endTokens.join("\n"),
            "}"
        ].join("\n")
    }

    public print() {
        console.log(this.toString());
    }
}
