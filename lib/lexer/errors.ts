import { LexerState as State } from "./types.ts";

export class UnrecognizedCharError extends Error {
    private readonly state: State;

    public readonly fatal: boolean;

    public constructor(state: State) {
        super();
        this.state = state;
        this.fatal = true;
    }

    public print(): void {
        console.log("%cUNIMPLEMENTED!", "color: red");
    }
}

export class UnexpectedCharError extends Error {
    private readonly state: State;

    public readonly expected: string;
    public readonly fatal: boolean;
    public readonly hint: string;

    public constructor(state: State, expected: string, hint: string) {
        super();
        this.state = state;

        this.expected = expected;
        this.fatal = false;
        this.hint = hint;
    }

    public print(): void {
        console.log("UNIMPLEMENTED!");
    }
}

export class UnclosedSequenceError extends Error {
    private readonly expected: string;
    private readonly state: State;
    private readonly hint: string;

    public readonly description: string;
    public readonly fatal: boolean;

    public constructor(state: State, expected: string, hint: string) {
        super();
        this.state = state;

        this.expected = expected;
        this.fatal = false;
        this.hint = hint.split("\n").map(s => "Hint: " + s).join("\n")

        const st = this.state;
        this.message = `LexerError: UnclosedSequenceError at ${st.row}:${st.col}`;
        this.description = `Expected a '${this.expected}' to close the sequence started here (line ${st.row}, column ${st.col}), but found none.`;
    }

    // TODO: Colors.
    public print(): void {
        const st = this.state;
        const lines = st.source.split("\n");
        const gutters = getGutters(st);

        // Print the message.
        console.log(this.message);
        console.log()

        // Print the source line just before where the error occurred.
        const prevLineSrc = st.row - 2 >= 0 ? lines[st.row - 2] : "";
        console.log(gutters[0] + " | " + prevLineSrc);

        // Print the error line.
        const errLineSrc = lines[st.row - 1];
        console.log(gutters[1] + " | " + errLineSrc);
        // Print the column where error occurred and the error description.
        const gutter = " ".repeat(gutters[1].length) + " | ";
        const padding = " ".repeat(st.col - 1);
        console.log(gutter + padding + "^ - " + this.description);

        // Print the next line in source.
        const nextLineSrc = st.row < lines.length ? lines[st.row] : "";
        console.log(gutters[2] + " | " + nextLineSrc);
        console.log();

        // Print the hint.
        console.log(this.hint);
    }
}

// Helpers
function getGutters(st: State): string[] {
    const lines = st.source.split("\n");
    const gutterSize = 1 + (st.row + 1).toString().length;

    const prevRow = st.row - 1;
    const prevRowLength = prevRow.toString().length;
    const prevLine
        = prevRow < 1
            ? " ".repeat(gutterSize)
            : " ".repeat(gutterSize - prevRowLength) + prevRow.toString();

    const nextRow = st.row + 1;
    const nextRowLength = nextRow.toString().length;
    const nextLine
        = nextRow > lines.length
            ? " ".repeat(gutterSize)
            : " " + nextRow.toString();

    const errRow = st.row;
    const errRowLength = errRow.toString().length;
    const errLine
        = errRowLength < nextRowLength
            ? "  " + errRow.toString()
            : " " + errRow.toString();

    return [prevLine, errLine, nextLine];
}
