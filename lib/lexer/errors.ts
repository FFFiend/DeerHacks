import { State } from "./types.ts";

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

export class UnclosedSequenceError extends Error {
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
