import { ParserState as State } from "./types.ts";

export class UnrecognizedTokenError extends Error {
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
