import { State, LeafType, BranchType, Node } from "./types.ts";
import { Token } from "../lexer/types.ts";
import { constrainLexeme } from "../lexer/helpers.ts";

// Returns a new parser state object given list of tokens.
export function newState(tokens: Token[]): State {
    return {
        tokens: tokens,
        position: 0,
        tree: []
    };
}

// Returns a leaf node object given current state, node type
// and node data.
export function createLeaf(state: State, type: LeafType, data: string): Node {
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
export function createBranch(state: State, type: BranchType, data: string | null, children: Node[]): Node {
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
        tree: [...oldState.tree, node]
    };
}

// Advances state onto the next token.
export function advanceOnce(oldState: State): State {
    if (hasTokensLeft(oldState)) {
        return {
            tokens: [...oldState.tokens],
            position: oldState.position + 1,
            tree: [...oldState.tree]
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
export function curToken(st: State): Token {
    return st.tokens[st.position];
}

export function hasTokensLeft(st: State): boolean {
    return st.position < st.tokens.length;
}

// So we can index the enum to determine Branch/Leaf type...
type EnumObj = {[index: string | number]: string | number};

// Node to String.
// TODO: What a mess!
export function nodeToStr(node: Node, indent = 2, i = 0): string {
    // The node is a branch node if it has the `children` field.
    const nodeType: EnumObj
        = Object.keys(node).includes("children")
        ? BranchType
        : LeafType;

    // Outer pad for the braces lines.
    let outerPad = " ".repeat(indent * i);
    let innerPad = " ".repeat(indent * (i+1));
    let str = "";

    // We need to do an assertion to shut TypeScript up.
    str = str + outerPad + `${nodeType[node.type as number]} {` + "\n";

    str = str + innerPad + `Col: ${node.col},` + "\n";
    str = str + innerPad + `Row: ${node.row},` + "\n";
    str = str + innerPad + `Data: ${constrainLexeme(JSON.stringify(node.data))},` + "\n";
    str = str + innerPad + `Children: [\n`;
    str = str + (
        node.children ? node.children.map(n => nodeToStr(n, indent, i+2)).join("\n") : (" ".repeat(indent * (i+2)) + "NONE")
    ) + "\n";
    str = str + innerPad + "]\n"
    str = str + outerPad + "}"

    return str;
}
