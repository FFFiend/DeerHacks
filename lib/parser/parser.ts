// Parse tokens into AST.
import { Token, TokenType } from "../lexer/types.ts";

import {
    AST,
    Node,
    State,
    NodeType,
    LeafType,
    BranchType
} from "./types.ts";

import {
    addNode,
    advance,
    curToken,
    newState,
    lookahead,
    createLeaf,
    advanceWhile,
    createBranch,
    hasTokensLeft,
    subListBetweenStates
} from "./helpers.ts";

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

function runParser(st: State): State {
    // End when no tokens left, just like lexer.
    if (!hasTokensLeft(st)) return st;

    const t = curToken(st);

    switch (t.type) {
        // ITALIC
        case TokenType.STAR: {
            return runParser(
                handleEnclosed(st, TokenType.STAR, BranchType.ITALIC)
            );
        }

        // BOLD
        case TokenType.DOUBLE_STAR: {
            return runParser(
                handleEnclosed(st, TokenType.DOUBLE_STAR, BranchType.BOLD)
            );
        }

        // STRIKETHROUGH
        case TokenType.DOUBLE_TILDE: {
            return runParser(
                handleEnclosed(
                    st,
                    TokenType.DOUBLE_TILDE,
                    BranchType.STRIKETHROUGH
                )
            );
        }

        // UNDERLINE
        case TokenType.DOUBLE_UNDERSCORE: {
            return runParser(
                handleEnclosed(
                    st,
                    TokenType.DOUBLE_UNDERSCORE,
                    BranchType.UNDERLINE
                )
            );
        }

        // WORD
        case TokenType.WORD: {
            const type = LeafType.WORD
            const data = t.lexeme;
            const node = createLeaf(st, type, data);
            return runParser(advance(addNode(st, node)));
        }

        default: {
            // TODO: This should be an error.
            return runParser(advance(st));
        }
    }
}

// Handles stuff enclosed within delimiters, e.g.
// **bold text** enclosed within DOUBLE_STARS,
// __underlined stuff__ enclosed within
// DOUBLE_UNDERSCORE and so on. The function expects
// that the state is already ON the token that starts
// the enclosed sequence. The second argument is the token
// type that indicates the end of the sequence (i.e the
// closing token type). The last is the type of the node
// to create and add to the AST. Note that this is a
// BranchType since LeafTypes do not have this recursive
// structure. Some "enclosed" LeafTypes like $$ math
// delimiters are handled during lexing and are not
// considered "enclosed" during the parsing stage.
function handleEnclosed(st: State, endType: TokenType, nodeType: BranchType) {
    // Advance till we reach the closing endType or
    // if we're at the same token as st (since it's possible
    // the opening and closing types are the same and
    // we're already sitting on that token which would
    // cause advanceWhile to immediately finish otherwise).
    const newSt = advanceWhile(st, (curSt) => {
        const samePosition = curSt.position == st.position;
        const unclosed = curToken(curSt).type != endType;
        return samePosition || unclosed;
    });

    // Take the inner sub-list of tokens between the open
    // and close tokens and recursively parse that sub-list
    // with a new state, to get the inner AST.
    // We also slice the sub-list exclude the opening and
    // closing tokens at the start and end, otherwise 
    // it will keep recursing infinitely on them.
    const subList = subListBetweenStates(st, newSt);
    const subState = newState(subList.slice(1,-1));
    const subTree = runParser(subState).tree;

    // Create node
    const type = nodeType;
    // We assume there's no data.
    const data = null;
    const children = subTree;
    const node = createBranch(st, type, data, children);

    // Add the node, advance once (since the state
    // is currently sitting at the closing token),
    // and return the state.
    return advance(addNode(newSt, node));
}

export function parse(tokens: Token[]): AST {
    const state = newState(tokens);
    const finalState = runParser(state);
    return finalState.tree;
}
