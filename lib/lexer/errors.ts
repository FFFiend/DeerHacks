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
        console.log("UNIMPLEMENTED!");
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
