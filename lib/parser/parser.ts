// Parse tokens into AST.
import { Token, TokenType } from "../lexer/types.ts";

import {
    AST,
    ParserState as State,
    LeafType,
    BranchType,
    MacroDefData
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
    attachMacroData,
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

// TODO: Make sure all tokens are handled. Also add the error
// TODO: for the default case.

function runParser(st: State): State {
    // End when no tokens left, just like lexer.
    if (!hasTokensLeft(st)) return st;

    const t = curToken(st);

    switch (t.type) {

        /**************/
        /* Leaf Types */
        /**************/

        // WORD
        case TokenType.WORD: {
            const type = LeafType.WORD;
            // TODO: I'm not sure if joining padding and the
            // TODO: lexeme together here is the "right" way
            // TODO: to solve the whitespace-rendering
            // TODO: problem. Maybe data should be an object
            // TODO: containing the lexeme and the padding?
            // TODO: And then for other nodes it could
            // TODO: possibly contain other stuff too.
            const data = { lexeme: t.lexeme, rightPad: t.rightPad };
            const node = createLeaf(st, type, data);
            return runParser(advance(addNode(st, node)));
        }

        // AT_DELIM
        case TokenType.AT_DELIM: {
            const type = LeafType.AT_DELIM;
            const data = { lexeme: t.lexeme, rightPad: t.rightPad };
            const node = createLeaf(st, type, data);
            return runParser(advance(addNode(st, node)));
        }

        // MACRO_DEF
        case TokenType.MACRO_DEF: {
            const data = extractMacroDefData(t);
            return runParser(advance(attachMacroData(st, data)));
        }

        // RAW_TEX
        case TokenType.HEREDOC_BLOCK: {
            const type = LeafType.RAW_TEX;
            // TODO: The scanner SHOULDN'T slice off the lines.
            // TODO: Keep them in the lexeme, let the renderer
            // TODO: handle it, and add the delimiter to the
            // TODO: data object.
            const data = { lexeme: t.lexeme, rightPad: t.rightPad };
            const node = createLeaf(st, type, data);
            return runParser(advance(addNode(st, node)));
        }

        // TEX_INLINE_MATH
        case TokenType.TEX_INLINE_MATH: {
            const type = LeafType.TEX_INLINE_MATH;
            const data = { lexeme: t.lexeme, rightPad: t.rightPad };
            const node = createLeaf(st, type, data);
            return runParser(advance(addNode(st, node)));
        }

        // TEX_DISPLAY_MATH
        case TokenType.TEX_DISPLAY_MATH: {
            const type = LeafType.TEX_DISPLAY_MATH;
            const data = { lexeme: t.lexeme, rightPad: t.rightPad };
            const node = createLeaf(st, type, data);
            return runParser(advance(addNode(st, node)));
        }

        // LATEX_INLINE_MATH
        case TokenType.LATEX_INLINE_MATH: {
            const type = LeafType.LATEX_INLINE_MATH;
            const data = { lexeme: t.lexeme, rightPad: t.rightPad };
            const node = createLeaf(st, type, data);
            return runParser(advance(addNode(st, node)));
        }

        // LATEX_DISPLAY_MATH
        case TokenType.LATEX_DISPLAY_MATH: {
            const type = LeafType.LATEX_DISPLAY_MATH;
            const data = { lexeme: t.lexeme, rightPad: t.rightPad };
            const node = createLeaf(st, type, data);
            return runParser(advance(addNode(st, node)));
        }

        /****************/
        /* Branch Types */
        /****************/

        // ITALIC
        case TokenType.STAR: {
            return runParser(
                handleEnclosedNode(st, TokenType.STAR, BranchType.ITALIC)
            );
        }

        // BOLD
        case TokenType.DOUBLE_STAR: {
            return runParser(
                handleEnclosedNode(st, TokenType.DOUBLE_STAR, BranchType.BOLD)
            );
        }

        // UNDERLINE
        case TokenType.DOUBLE_UNDERSCORE: {
            return runParser(
                handleEnclosedNode(
                    st,
                    TokenType.DOUBLE_UNDERSCORE,
                    BranchType.UNDERLINE
                )
            );
        }

        // STRIKETHROUGH
        case TokenType.DOUBLE_TILDE: {
            return runParser(
                handleEnclosedNode(
                    st,
                    TokenType.DOUBLE_TILDE,
                    BranchType.STRIKETHROUGH
                )
            );
        }

        // TODO: After handling a section node, also check
        // TODO: if the next node is another section node or
        // TODO: not. If not, then start a new paragraph node.
        //
        // SECTION
        case TokenType.HASH: {
            return runParser(handleRowNode(st, BranchType.SECTION));
        }

        // SUBSECTION
        case TokenType.DOUBLE_HASH: {
            return runParser(handleRowNode(st, BranchType.SUBSECTION));
        }

        // SUBSUBSECTION
        case TokenType.TRIPLE_HASH: {
            return runParser(handleRowNode(st, BranchType.SUBSUBSECTION));
        }

        // SECTION_STAR
        case TokenType.HASHSTAR: {
            return runParser(handleRowNode(st, BranchType.SECTION_STAR));
        }

        // SUBSECTION_STAR
        case TokenType.DOUBLE_HASHSTAR: {
            return runParser(handleRowNode(st, BranchType.SUBSECTION_STAR));
        }

        // SUBSUBSECTION_STAR
        case TokenType.TRIPLE_HASHSTAR: {
            return runParser(handleRowNode(st, BranchType.SUBSUBSECTION_STAR));
        }

        // LINK
        case TokenType.LEFT_BRACKET: {
            return runParser(handleLinkOrImage(st, BranchType.LINK));
        }

        // IMAGE
        case TokenType.BANG_BRACKET: {
            return runParser(handleLinkOrImage(st, BranchType.IMAGE));
        }

        // BRACKET_PAREN is just treated as a WORD
        // if it appears outside the context of a
        // LEFT_BRACKET / BANG_BRACKET
        case TokenType.BRACKET_PAREN: {
            const type = LeafType.WORD;
            const data = { lexeme: t.lexeme, rightPad: t.rightPad };
            const node = createLeaf(st, type, data);
            return runParser(advance(addNode(st, node)));
        }

        // RIGHT_PAREN is treated the same as BRACKET_PAREN.
        case TokenType.RIGHT_PAREN: {
            const type = LeafType.WORD;
            const data = { lexeme: t.lexeme, rightPad: t.rightPad };
            const node = createLeaf(st, type, data);
            return runParser(advance(addNode(st, node)));
        }

        // ITEMIZE
        case TokenType.UL_ITEM: {
            // Advance until next OL_ITEM OR UL_ITEM OR a heading OR a new para.
            // Everything else is part of the item. Or is there anything else?
            // TODO.
        }

        // ENUMERATE
        case TokenType.OL_ITEM: {
            // Advance until next OL_ITEM OR UL_ITEM OR a heading OR a new para.
            // Everything else is part of the item. Or is there anything else?
            // TODO.
        }

        // PARAGRAPH
        case TokenType.SOF: {
            // TODO: Start a paragraph node here.
        }

        case TokenType.EMPTY_ROW: {
            // TODO: End a paragraph here and then check if the next token
            // TODO: is a heading or not. If not, then start a new token.
        }

        // EOF, just return the state.
        case TokenType.EOF: {
            return st;
        }

        default: {
            // TODO: This should be an error.
            return runParser(advance(st));
        }
    }
}

// TODO: Handle errors like empty macro name, empty
// TODO: param names. In these functions, don't do
// TODO: anything, but later in the parser check for
// TODO: these and attach an error.
function extractMacroDefData(t: Token): MacroDefData {
    const re = /macro\s+(.*)\s+=\s+\{(.*)\}/;
    // TODO: Am I supposed to use match here?
    // TODO: Check that the regex and match works
    // TODO: properly. Does it even return an
    // TODO: array?
    const match = t.lexeme.match(re);
    const [head, body] = match != null ? match : [];
    const name = extractMacroName(head);
    const params = extractMacroParams(head);

    return {
        name,
        params,
        body
    };
}

// TODO: Testing. Maybe move to helpers?
function extractMacroName(head: string | undefined): string {
    if (typeof(head) == "undefined") return "";

    const re = /^(.*)[\s\{]/;
    const match = head.match(re);
    // match could be null.
    const result = match && match.length > 0 ? match[0] : "";
    return result;
}

// TODO: Testing. Maybe move to helpers?
function extractMacroParams(head: string | undefined): string[] {
    if (typeof(head) == "undefined") return [];

    const re = /\{(.*)\}/g;
    const matches = head.match(re);
    // match could be null.
    return matches || [];
}

// TODO: Do I actually use this?
// Given two states, takes the sub-list of tokens
// between them and converts everything into one
// large WORD leaf node. Useful for when the parser
// doesn't find the token it expects, and everything
// before it needs to be treated like a word (e.g. when
// parsing LINK and expecting a BRACKET_PAREN but
// not finding it; we need to go back and convert
// everything after the initial LEFT_BRACKET into a
// WORD). The WORD node is added to stateB, and then
// the state is advanced once (since the token it
// currently sits on has also been converted into the
// WORD node) and returned.
function reduceSubStateToWord(stateA: State, stateB: State): State {
    const subList = subListBetweenStates(stateA, stateB);
    const lexemes = subList.map(t => t.lexeme);

    const type = LeafType.WORD;
    const data = lexemes.join("");
    const node = createLeaf(stateA, type, data);
    return advance(addNode(stateB, node));
}

// Handles stuff enclosed within delimiting tokens,
// (in our case, the emphasis nodes like bold/italic).
// The function expects that the state is already ON
// the token that starts the enclosed sequence. The
// second argument is the token type that indicates
// the end of the sequence (i.e the closing token
// type). The last is the type of the node to create
// and add to the AST. Note that this is a BranchType
// since LeafTypes do not have this recursive
// structure. Some "enclosed" LeafTypes like $$ math
// delimiters are handled during lexing and are not
// considered "enclosed" during the parsing stage.
function handleEnclosedNode(st: State, endType: TokenType, nodeType: BranchType): State {
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

// Handles nodes that consist of tokens appearing all
// on the same row (in our case, that's the section
// nodes like SECTION/SUBSECTION etc.). Expects that
// the state is sitting on the symbol that starts the
// sequence (i.e # or ##). Takes everything on the row
// and parses it. `nodeType` is the type of node to
// create and add to the AST.
function handleRowNode(st: State, nodeType: BranchType): State {
    // Advance till the end of the row (i.e we see a token
    // that isn't on the same row as the current st's token).
    const newSt = advanceWhile(st, (curSt) => {
        return lookahead(curSt)[0].row == curToken(st).row;
    });

    // Get the tokens between the states.
    const subList = subListBetweenStates(st, newSt);
    // Create a new state from the sublist, excluding
    // the HASH token at the beginning that st is
    // currently sitting on.
    const subState = newState(subList.slice(1));
    // Get the inner AST.
    const subTree = runParser(subState).tree;

    const type = BranchType.SECTION;
    const data = null;
    const children = subTree;
    const node = createBranch(st, type, data, children);

    // newSt is sitting on the last token on the same row,
    // which we've already parsed, so we advance once
    // and then continue parsing.
    return advance(addNode(newSt, node));
}

// Handles a LINK node or an IMAGE node (both of
// which have almost the same structure).
function handleLinkOrImage(st: State, nodeType: BranchType): State {
    const t = curToken(st);

    // Advance until we find the BRACKET_PAREN, i.e
    // go from '[' to ']('
    const newSt = advanceWhile(st, (curSt) => {
        return curToken(curSt).type != TokenType.BRACKET_PAREN;
    });

    // Check that we really did end up at BRACKET_PAREN
    // instead of advanceWhile finishing because of
    // running out of tokens, in which case this isn't
    // a LINK or IMAGE.
    // TODO: Testing (is there a case where curToken might
    // TODO: cause an out of bound error?)
    // TODO: -------------------------------
    if (curToken(newSt).type == TokenType.EOF) {
        // If we didn't find a BRACKET_PAREN, we go back
        // to the original st state, treat the current
        // token as a WORD and then continue parsing from
        // there.
        const type = LeafType.WORD;
        const data = { lexeme: t.lexeme, rightPad: t.rightPad };
        const node = createLeaf(st, type, data);
        // We add the node to st
        return advance(addNode(st, node));
    }

    // We expect the next token to be a WORD token,
    // whose lexeme is the link/img path. The token
    // after that should be the closing RIGHT_PAREN
    // token.
    const [ref, paren] = lookahead(newSt, 2);

    // Check that ref and paren are not undefined
    // and have the correct token type. If not, then
    // we backtrack to st like above, treating [/![ as
    // a WORD and returning the original state.
    const validRef = ref && (ref.type == TokenType.WORD);
    const validParen = paren && (paren.type == TokenType.RIGHT_PAREN);
    if (!validRef || !validParen) {
        const type = LeafType.WORD;
        const data = { lexeme: t.lexeme, rightPad: t.rightPad };
        const node = createLeaf(st, type, data);
        return advance(addNode(st, node));
    }

    // Otherwise, it's a valid LINK/IMAGE! So we can
    // parse the subList, grab the ref and move on!
    const subList = subListBetweenStates(st, newSt);
    const subState = newState(subList);
    const subTree = runParser(subState).tree;

    // Create, add the node and move on.
    const type = nodeType;
    const data = { lexeme: ref.lexeme, rightPad: ref.rightPad };
    const children = subTree;
    const node = createBranch(st, type, data, children);
    // We advance thrice since newSt is sitting on
    // BRACKET_PAREN and we already parsed the next
    // two tokens (when did lookahead for ref and paren).
    return advance(addNode(newSt, node), 3);
}

export function parse(tokens: Token[]): State {
    const state = newState(tokens);
    const finalState = runParser(state);
    return finalState;
}

export function happyParse(tokens: Token[]): AST {
    const finalState = parse(tokens);
    finalState.errors.forEach(e => e.print());
    return finalState.tree;
}
