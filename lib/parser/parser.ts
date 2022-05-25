// Parse tokens into AST.
import { Token, TokenType } from "../lexer/types.ts";
import { UnrecognizedTokenError } from "./errors.ts";

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
    attachError,
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
        // Leaf Types are all basically handled the same way,
        // there's no special parsing for them, EXCEPT for
        // MACRO_DEF which doesn't add any nodes to the AST,
        // just the macro def to the state's list of macroDefs.
        case TokenType.WORD:
            return runParser(handleLeaf(st, LeafType.WORD));

        case TokenType.AT_DELIM:
            return runParser(handleLeaf(st, LeafType.AT_DELIM));

        case TokenType.HEREDOC_BLOCK:
            return runParser(handleLeaf(st, LeafType.RAW_TEX));

        case TokenType.TEX_INLINE_MATH:
            return runParser(handleLeaf(st, LeafType.TEX_INLINE_MATH));

        case TokenType.TEX_DISPLAY_MATH:
            return runParser(handleLeaf(st, LeafType.TEX_DISPLAY_MATH));

        case TokenType.LATEX_INLINE_MATH:
            return runParser(handleLeaf(st, LeafType.LATEX_INLINE_MATH));

        case TokenType.LATEX_DISPLAY_MATH:
            return runParser(handleLeaf(st, LeafType.LATEX_DISPLAY_MATH));

        // MACRO_DEF
        case TokenType.MACRO_DEF: {
            const data = extractMacroDefData(t);
            return runParser(advance(attachMacroData(st, data)));
        }

        // ITALIC
        case TokenType.STAR: {
            return runParser(
                handleEnclosedNode(
                    st,
                    TokenType.STAR,
                    BranchType.ITALIC
                )
            );
        }

        // BOLD
        case TokenType.DOUBLE_STAR: {
            return runParser(
                handleEnclosedNode(
                    st,
                    TokenType.DOUBLE_STAR,
                    BranchType.BOLD
                )
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

        // Each section is also a paragraph boundary, so
        // we handle it as a row node to parse the section
        // itself, and then handle it as a paragraph
        // boundary.

        // SECTION
        case TokenType.HASH: {
            return runParser(
                handleParagraphBoundary(
                    handleRowNode(st, BranchType.SECTION)
                )
            );
        }

        // SUBSECTION
        case TokenType.DOUBLE_HASH: {
            return runParser(
                handleParagraphBoundary(
                    handleRowNode(st, BranchType.SUBSECTION)
                )
            );
        }

        // SUBSUBSECTION
        case TokenType.TRIPLE_HASH: {
            return runParser(
                handleParagraphBoundary(
                    handleRowNode(st, BranchType.SUBSUBSECTION)
                )
            );
        }

        // SECTION_STAR
        case TokenType.HASHSTAR: {
            return runParser(
                handleParagraphBoundary(
                    handleRowNode(st, BranchType.SECTION_STAR)
                )
            );
        }

        // SUBSECTION_STAR
        case TokenType.DOUBLE_HASHSTAR: {
            return runParser(
                handleParagraphBoundary(
                    handleRowNode(st, BranchType.SUBSECTION_STAR)
                )
            );
        }

        // SUBSUBSECTION_STAR
        case TokenType.TRIPLE_HASHSTAR: {
            return runParser(
                handleParagraphBoundary(
                    handleRowNode(st, BranchType.SUBSUBSECTION_STAR)
                )
            );
        }

        // LINK
        case TokenType.LEFT_BRACKET: {
            return runParser(handleLinkOrImage(st, BranchType.LINK));
        }

        // IMAGE
        case TokenType.BANG_BRACKET: {
            return runParser(handleLinkOrImage(st, BranchType.IMAGE));
        }

        // BRACKET_PAREN and RIGHT_PAREN are just
        // treated like WORD tokens if they appear
        // outside the context of a LEFT_BRACKET or
        // BANG_BRACKET (which are handled by
        // handleLinkOrImage).
        case TokenType.RIGHT_PAREN:
        case TokenType.BRACKET_PAREN: {
            const type = LeafType.WORD;
            const data = { lexeme: t.lexeme, rightPad: t.rightPad };
            const node = createLeaf(st, type, data);
            return runParser(advance(addNode(st, node)));
        }

        // ITEMIZE
        case TokenType.UL_ITEM: {
            return runParser(handleList(st, BranchType.ITEMIZE));
        }

        // ENUMERATE
        case TokenType.OL_ITEM: {
            return runParser(handleList(st, BranchType.ENUMERATE));
        }

        // SOF and EMPTY_ROW are both just paragraph
        // boundaries.
        case TokenType.SOF:
        case TokenType.EMPTY_ROW: {
            return runParser(handleParagraphBoundary(st));
        }

        // For EOF we just return the state.
        case TokenType.EOF: {
            return st;
        }

        default: {
            const err = new UnrecognizedTokenError(st);
            return runParser(advance(attachError(st, err)));
        }
    }
}

function handleLeaf(st: State, type: LeafType): State {
    const t = curToken(st);
    const data = { lexeme: t.lexeme, rightPad: t.rightPad };
    const node = createLeaf(st, type, data);
    return advance(addNode(st, node));
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

// Check if the given token is a section token i.e
// HASH and its variants.
function isAtSectionToken(st: State): boolean {
    const t = curToken(st).type;
    return t == TokenType.HASH ||
           t == TokenType.DOUBLE_HASH ||
           t == TokenType.TRIPLE_HASH ||
           t == TokenType.HASHSTAR ||
           t == TokenType.DOUBLE_HASHSTAR ||
           t == TokenType.TRIPLE_HASHSTAR;
}

function isAtParagraphBoundary(st: State): boolean {
    const emptyRow = curToken(st).type == TokenType.EMPTY_ROW;
    const eof      = curToken(st).type == TokenType.EOF;
    return isAtSectionToken(st) || emptyRow || eof;
}

// Returns state with list item nodes.
function handleListItems(st: State, isOrderedList: boolean): State {
    const tokenType = isOrderedList ? TokenType.OL_ITEM : TokenType.UL_ITEM;

    // Currently we know curToken(st) is UL_ITEM or OL_ITEM,
    // since that's why this function was called. So we advance
    // once on st before calling advanceWhile on it.
    const newSt = advanceWhile(advance(st), (curSt) => {
        // Advance as long as we aren't at a boundary, start of
        // next list item or end of file.
        const isAtNextItem = curToken(curSt).type === tokenType;
        return !isAtParagraphBoundary(curSt) && !isAtNextItem;
    });

    // We slice off the list item token that st is sitting on,
    // and the boundary that newSt ends on (a list item token or
    // empty row or section etc.) before parsing the sublist
    // (since we don't need them + the list item tokens would
    // result in infinite recursion).
    const subList = subListBetweenStates(st, newSt).slice(1,-1);
    const subState = newState(subList);
    const subTree = runParser(subState).tree;

    const type = BranchType.LIST_ITEM;
    const children = subTree;
    const node = createBranch(st, type, null, children);

    const finalState = addNode(newSt, node);

    // If we stopped at the start of a new list item, recurse and
    // parse that too. Also need to do a tokens left check in case
    // we ran out in the advanceWhile.
    if (hasTokensLeft(newSt) && curToken(newSt).type === tokenType) {
        return handleListItems(finalState, isOrderedList);
    } else {
        // Otherwise if we stopped at a boundary, we return
        // the final state.
        return finalState;
    }
}

function handleList(st: State, nodeType: BranchType): State {
    // Get to the list boundary (which is the same as a paragraph
    // boundary in our case).
    const newSt = advanceWhile(st, (curSt) => {
        return !isAtParagraphBoundary(curSt);
    });

    const isOrderedList = nodeType === BranchType.ENUMERATE;

    const subList = subListBetweenStates(st, newSt);
    const subState = newState(subList);
    const subTree = handleListItems(subState, isOrderedList).tree;

    const type = nodeType;
    const children = subTree;
    const node = createBranch(st, type, null, children);
    return addNode(newSt, node);
}

function handleParagraphBoundary(st: State): State {
    // TODO: While this does fix bugs with st sometimes
    // TODO: running out of tokens and this function being
    // TODO: called which leads to errors with createBranch
    // TODO: since there's no tokens left, I SHOULDN'T be
    // TODO: having to do tokenLeft checks here, they should
    // TODO: be handled properly by the helper functions.
    if (!hasTokensLeft(st)) return st;
    // If the next token is a section/heading, we DON'T
    // start a new paragraph, since sections are not part
    // of paragraphs. We just advance and move on from SOF.
    // Since we're calling advance early, we also need to
    // check if there are tokens left, otherwise isAtSectionToken
    // could result in a runtime error (since curToken is not safe).
    if (hasTokensLeft(advance(st)) && isAtSectionToken(advance(st))) return advance(st);

    // Otherwise, we advance on until the next paragraph
    // boundary and recursively parse that as usual.
    const newSt = advanceWhile(st, (curSt) => !isAtParagraphBoundary(curSt));

    // Exclude the SOF token and the paragraph boundary token
    // from the sublist to prevent infinite recursion.
    const subList = subListBetweenStates(st, newSt).slice(1,-1);
    const subState = newState(subList);
    const subTree = runParser(subState).tree

    const type = BranchType.PARAGRAPH;
    const data = null;
    const children = subTree;
    const node = createBranch(st, type, data, children);

    return advance(addNode(newSt, node));
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
        // Get the lookahead list (it's a list not a token object!)
        const la = lookahead(curSt);
        // Need to do a bounds check first - the list would be
        // empty if we've consumed all the tokens, which would
        // raise a range error with la[0].
        return la.length > 0 && la[0].row == curToken(st).row;
    });

    // Get the tokens between the states.
    const subList = subListBetweenStates(st, newSt);
    // Create a new state from the sublist, excluding
    // the HASH token at the beginning that st is
    // currently sitting on.
    const subState = newState(subList.slice(1));
    // Get the inner AST.
    const subTree = runParser(subState).tree;

    const type = nodeType;
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
