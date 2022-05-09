// Parse tokens into ...???

import { Token, TokenType } from "../lexer/types.ts"
import { AST, NodeType, LeafType, BranchType, Node } from "./ast.ts"

// TODO: Javascript actually just creates shallow copies
// TODO: pretty much everywhere :(
// TODO: So no need to go through all the hassle of shallow
// TODO: copies, just assign stuff normally.
// TODO: I guess it doesn't matter if I mutate the original
// TODO: state object, then...

// TODO: Need to decide what starts/ends a paragraph. There's
// TODO: no markers for paras besides the EMPTY_ROW token,
// TODO: so i need to handle that carefully. Maybe, headings
// TODO: and EMPTY_ROW end a para, and everything else starts
// TODO: a new para or continues the previous.

// Keep track of parser state.
type State = {
    tokens: Token[],
    position: number,
    tree: AST
}

// Returns a new state object given list of tokens.
function newState(tokens: Token[]): State {
    return {
        tokens: tokens,
        position: 0,
        tree: []
    };
}

// Returns a leaf node object given current state, node type
// and node data.
function createLeaf(state: State, type: LeafType, data: string): Node {
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
function createBranch(state: State, type: BranchType, data: string | null, children: Node[]): Node {
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
function addNode(oldState: State, node: Node): State {
    return {
        tokens: [...oldState.tokens],
        position: oldState.position,
        tree: [...oldState.tree, node]
    };
}

// Advances state onto the next token.
function advanceOnce(oldState: State): State {
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
function advance(oldState: State, n: number = 1): State {
    if (n == 1) return advanceOnce(oldState);
    else return advance(advanceOnce(oldState), n - 1);
}

// Advances state as long as predicate returns true on the
// state at each step and there are still tokens left.
function advanceWhile(oldState: State, fn: (s: State) => boolean): State {
    if (hasTokensLeft(oldState) && fn(oldState)) {
        return advanceWhile(advanceOnce(oldState), fn);
    } else {
        return oldState;
    }
}

// Returns the sub-list between two states' positions,
// including the tokens at each state's current positions.
function subListBetweenStates(stateA: State, stateB: State): Token[] {
    const tokenList = stateA.tokens;
    const posA = stateA.position;
    const posB = stateB.position;

    const start = Math.min(posA, posB);
    const end   = Math.max(posA, posB);

    return tokenList.slice(start, end + 1);
}

// Returns the next n tokens in the list.
function lookahead(state: State, n: number = 1): Token[] {
    const { tokens, position } = state;

    const lookaheadPosition = position + n;
    const bound = tokens.length;

    const start = position + 1;
    const end   = Math.min(lookaheadPosition, bound) + 1;
    return tokens.slice(start, end);
}

// Current token at state position.
function curToken(st: State): Token {
    return st.tokens[st.position];
}

function hasTokensLeft(st: State): boolean {
    return st.position < st.tokens.length;
}

function runParser(st: State): State {
    if (hasTokensLeft(st)) {
        const t = curToken(st);

        switch (t.type) {
            // BOLD
            case TokenType.DOUBLE_STAR: {
                const predicate = (s: State) => {
                    return (
                        // Till we reach a DOUBLE_STAR or if we're at the
                        // same token as st (since the curren is also **)
                        curToken(s).type != TokenType.DOUBLE_STAR
                        || s.position == st.position
                    );
                };

                // Advance till next bold
                const newSt = advanceWhile(st, predicate);
                // Take the sub-list between them and recursively
                // parse that sub-list with a new state.
                const subList = subListBetweenStates(st, newSt);
                // We slice it to exclude the DOUBLE_STAR tokens
                // at the start and end, otherwise it will keep
                // recursing infinitely.
                const subState = newState(subList.slice(1,-1));
                // We parse the stuff inside the DOUBLE_STAR and
                // take the resulting AST.
                const subTree = runParser(subState).tree;

                // Create node
                const type = BranchType.BOLD;
                const data = null;
                const children = subTree;
                const node = createBranch(st, type, data, children);

                // Add the node, and then advance (since the state
                // is currently sitting at the closing DOUBLE_STAR)
                // and continue parsing.
                return runParser(advance(addNode(st, node)));
            }

            // WORD
            case TokenType.WORD: {
                const type = LeafType.WORD
                const data = t.lexeme;
                const node = createLeaf(st, type, data);

                return runParser(advance(addNode(st, node)));
            }

            default: {
                return runParser(advance(st));
            }
        }
    }

    return st;
}

export function parse(tokens: Token[]): AST {
    const state = newState(tokens);
    const finalState = runParser(state);
    return finalState.tree;
}

