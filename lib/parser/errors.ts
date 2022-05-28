import { State } from "./state.ts";

export class UnrecognizedTokenError extends Error {
    private readonly col: number;

    public constructor(st: State) {
        super();
        this.col = st.curToken().col;
    }

    public print() {
        console.log("UNIMPLEMENTED!");
    }
}
