import { LexerState as State, Snapshot } from "./types.ts";

export class UnrecognizedCharError extends Error {
    private readonly snapshot: Snapshot;

    public readonly name: string;
    public readonly fatal: boolean;

    public constructor(snapshot: Snapshot) {
        super();
        this.snapshot = snapshot;
        this.fatal = true;
        this.name = "UnrecognizedCharError";
    }

    public print(): void {
        console.log("%cUNIMPLEMENTED!", "color: red");
    }
}

export class UnexpectedCharError extends Error {
    private readonly snapshot: Snapshot;

    public readonly expected: string;
    public readonly fatal: boolean;
    public readonly name: string;
    public readonly hint: string;

    public constructor(snapshot: Snapshot, expected: string, hint: string) {
        super();
        this.snapshot = snapshot;

        this.name = "UnexpectedCharError";
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
    private readonly snapshot: Snapshot;
    private readonly hint: string;

    public readonly name: string;
    public readonly description: string;
    public readonly fatal: boolean;

    public constructor(snapshot: Snapshot, expected: string, hint: string) {
        super();
        this.snapshot = snapshot;

        this.name = "UnclosedSequenceError";
        this.expected = expected;
        this.fatal = false;
        this.hint = hint.split("\n").map(s => "Hint: " + s).join("\n")

        const { col, row } = this.snapshot;
        this.message = `LexerError: UnclosedSequenceError at ${row}:${col}`;
        this.description = `Expected a '${this.expected}' to close the sequence started here (line ${row}, column ${col}), but found none.`;
    }

    // TODO: Colors.
    public print(): void {
        const { col, row, source } = this.snapshot;
        const lines = source.split("\n");
        const gutters = getGutters(this.snapshot);

        // Print the message.
        console.log(this.message);
        console.log()

        // Print the source line just before where the error occurred.
        const prevLineSrc = row - 2 >= 0 ? lines[row - 2] : "";
        console.log(gutters[0] + " | " + prevLineSrc);

        // Print the error line.
        const errLineSrc = lines[row - 1];
        console.log(gutters[1] + " | " + errLineSrc);
        // Print the column where error occurred and the error description.
        const gutter = " ".repeat(gutters[1].length) + " | ";
        const padding = " ".repeat(col - 1);
        console.log(gutter + padding + "^ - " + this.description);

        // Print the next line in source.
        const nextLineSrc = row < lines.length ? lines[row] : "";
        console.log(gutters[2] + " | " + nextLineSrc);
        console.log();

        // Print the hint.
        console.log(this.hint);
    }
}

// Helpers
function getGutters(snapshot: Snapshot): string[] {
    const { row, source } = snapshot;

    const lines = source.split("\n");
    const gutterSize = 1 + (row + 1).toString().length;

    const prevRow = row - 1;
    const prevRowLength = prevRow.toString().length;
    const prevLine
        = prevRow < 1
            ? " ".repeat(gutterSize)
            : " ".repeat(gutterSize - prevRowLength) + prevRow.toString();

    const nextRow = row + 1;
    const nextRowLength = nextRow.toString().length;
    const nextLine
        = nextRow > lines.length
            ? " ".repeat(gutterSize)
            : " " + nextRow.toString();

    const errRow = row;
    const errRowLength = errRow.toString().length;
    const errLine
        = errRowLength < nextRowLength
            ? "  " + errRow.toString()
            : " " + errRow.toString();

    return [prevLine, errLine, nextLine];
}
