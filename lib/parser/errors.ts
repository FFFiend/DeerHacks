import { ParserState as State } from "./types.ts";

export class ParseError extends Error {
    private readonly state: State;

    public constructor(state: State) {
        super();
        this.state = state;
    }

    public print(): void {
        console.log("UNIMPLEMENTED!");
    }
}
