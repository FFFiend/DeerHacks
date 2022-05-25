import { Token } from "../lexer/types.ts";
import { constrainLexeme } from "../lexer/helpers.ts";
import {
    Node,
    NodeData,
    LeafType,
    BranchType,
    ParserError,
    MacroDefData,
    ParserState as State,
} from "./types.ts";

// Returns a new parser state object given list of tokens.
export function newState(tokens: Token[]): State {
    return {
        tokens: tokens,
        position: 0,
        tree: [],
        macroDefs: [],
        errors: []
    };
}

export function attachError(oldState: State, err: ParserError): State {
    return {
        tokens: [...oldState.tokens],
        position: oldState.position,
        tree: [...oldState.tree],
        macroDefs: [...oldState.macroDefs],
        errors: [...oldState.errors, err]
    }
}

export function attachMacroData(oldState: State, data: MacroDefData): State {
    return {
        tokens: [...oldState.tokens],
        position: oldState.position,
        tree: [...oldState.tree],
        macroDefs: [...oldState.macroDefs, data],
        errors: [...oldState.errors]
    };
}

// Returns a leaf node object given current state, node type
// and node data.
export function createLeaf(state: State, type: LeafType, data: NodeData): Node {
    return {
        col: curToken(state).col,
        row: curToken(state).row,
        position: state.position,
        type,
        data
    };
}

// Returns a branch node object given state, type, data (possibly null)
// and children.
export function createBranch(state: State, type: BranchType, data: NodeData, children: Node[]): Node {
    return {
        col: curToken(state).col,
        row: curToken(state).row,
        position: state.position,
        type,
        data,
        children
    };
}

// Returns a new copy of the state with the given node
// added to the AST tree.
export function addNode(oldState: State, node: Node): State {
    return {
        tokens: [...oldState.tokens],
        position: oldState.position,
        tree: [...oldState.tree, node],
        macroDefs: [...oldState.macroDefs],
        errors: [...oldState.errors]
    };
}

// Advances state onto the next token.
export function advanceOnce(oldState: State): State {
    if (hasTokensLeft(oldState)) {
        return {
            tokens: [...oldState.tokens],
            position: oldState.position + 1,
            tree: [...oldState.tree],
            macroDefs: [...oldState.macroDefs],
            errors: [...oldState.errors]
        };
    } else {
        return oldState;
    }
}

// Advances the state `n` times, defaults to once.
export function advance(oldState: State, n: number = 1): State {
    if (n == 1) return advanceOnce(oldState);
    else return advance(advanceOnce(oldState), n - 1);
}

// Advances state as long as predicate returns true on the
// state at each step and there are still tokens left.
export function advanceWhile(oldState: State, fn: (s: State) => boolean): State {
    if (hasTokensLeft(oldState) && fn(oldState)) {
        return advanceWhile(advanceOnce(oldState), fn);
    } else {
        return oldState;
    }
}

// Returns the sub-list between two states' positions,
// including the tokens at each state's current positions.
export function subListBetweenStates(stateA: State, stateB: State): Token[] {
    const tokenList = stateA.tokens;
    const posA = stateA.position;
    const posB = stateB.position;

    const start = Math.min(posA, posB);
    const end   = Math.max(posA, posB);

    return tokenList.slice(start, end + 1);
}

// Returns the next n tokens in the list.
export function lookahead(state: State, n: number = 1): Token[] {
    const { tokens, position } = state;

    const lookaheadPosition = position + n;
    const bound = tokens.length;

    const start = position + 1;
    const end   = Math.min(lookaheadPosition, bound) + 1;
    return tokens.slice(start, end);
}

// Current token at state position.
// NOTE: This is *not* a safe function, it does
// NOTE: not check if there are tokens left in
// NOTE: the state or not. If not, it could
// NOTE: result in a range error.
export function curToken(st: State): Token {
    return st.tokens[st.position];
}

export function hasTokensLeft(st: State): boolean {
    return st.position < st.tokens.length;
}

// So we can index the enum to determine Branch/Leaf type...
type EnumObj = {[index: string | number]: string | number};

export function printNode(node: Node, indent = 2, i = 0): void {
    // The node is a branch node if it has the `children` field.
    const nodeType: EnumObj
        = Object.keys(node).includes("children")
        ? BranchType
        : LeafType;

    // Outer pad for the braces lines.
    let outerPad = " ".repeat(indent * i);
    let innerPad = " ".repeat(indent * (i+1));

    // Node type
    console.log(
        // We need to do an assertion to shut TypeScript up.
        outerPad + `%c${nodeType[node.type as number]}%c {`,
        "color: red", "color: default"
    );

    // Column/row
    console.log(
        innerPad + `C:R = %c${node.col}:${node.row}%c,`,
        "color: blue", "color: default"
    );

    // If it has data
    if (node.data) {
        const data = constrainLexeme(JSON.stringify(node.data));
        console.log(
            innerPad + `Data = %c${data}%c,`,
            "color: green", "color: default"
        );
    }

    // Recursively print child nodes with increased indentation.
    if (node.children) {
        console.log(innerPad + `Children = [`);
        node.children.map(n => printNode(n, indent, i+2));
        console.log(innerPad + "]");
    }

    // Final brace
    console.log(outerPad + "}");
}
