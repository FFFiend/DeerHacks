import { lex } from "../lexer/lexer.ts";
//import { tokenToString } from "../lexer/helpers.ts";
import { Node } from "./node.ts";
import { State } from "./state.ts";
import { UnrecognizedTokenError } from "./errors.ts";
import { Token, TokenType, LexerState } from "../lexer/types.ts";

import {
    isRowNode,
    isListNode,
    isLinkOrImage,
    printNode
} from "./helpers.ts";

import {
    AST,
    NodeType,
    LeafType,
    BranchType,
    MacroDefData,
    LinkImageData,
    EnclosedNodeData,
} from "./types.ts";

function handleLeaf(st: State, type: NodeType): void {
    const token = st.curToken();
    const node = new Node(st, type, true);
    node.setData({ lexeme: token.lexeme, rightPad: token.rightPad });
    st.addLeaf(node).advance();
}

function handleEnclosed(st: State, type: NodeType): void {
    const branch = st.getCurrentStackBranch();

    // If the current branch is already of the same node type,
    // it means the current token is the closing one, in which
    // case we pop the branch from the stack and add it to the
    // AST. Otherwise, it means the token is the opening one,
    // so we create the branch node and push it to the stack.
    if (branch !== null && branch.type === type) {
        // Before popping, we need to update it's data.
        const data = branch.getData() as EnclosedNodeData;
        data.rightPad = st.curToken().rightPad;
        branch.setData(data);
        st.popBranch();
    } else {
        const node = new Node(st, type)

        // Since we are at the opening token, we need to add the
        // token's rightPad as leftPad to the node's data.
        const data = {
            leftPad: st.curToken().rightPad,
            rightPad: "",
            lexeme: ""
        };

        node.setData(data);
        st.pushBranch(node);
    }

    // Lastly, we advance to move past the token.
    st.advance();
}

// TODO: Handle errors like empty macro name, empty
// TODO: param names. In these functions, don't do
// TODO: anything, but later in the parser check for
// TODO: these and attach an error.
// TODO: ---------------------------------------------
function extractMacroDefData(t: Token): MacroDefData {
    const re = /macro\s+(.*)\s+=\s+\{(.*)\}/;
    // TODO: Am I supposed to use match here?
    // TODO: Check that the regex and match works
    // TODO: properly. Does it even return an
    // TODO: array?
    // TODO: -----------------------------------
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

function extractMacroName(head: string | undefined): string {
    if (typeof(head) == "undefined") return "";

    const re = /^(.*)[\s\{]/;
    const match = head.match(re);
    // match could be null.
    const result = match && match.length > 0 ? match[0] : "";
    return result;
}

function extractMacroParams(head: string | undefined): string[] {
    if (typeof(head) == "undefined") return [];

    const re = /\{(.*)\}/g;
    const matches = head.match(re);
    // match could be null.
    return matches || [];
}

// Handles the start of a row node (section/heading).
function handleRowStart(st: State, type: NodeType): void {
    // Before the row starts, we need to end the
    // previous paragraph.
    handleParEnd(st);
    // Here, we only push the node onto the stack.
    // Popping the branch is done by handleRowEnd.
    st.pushBranch(new Node(st, type)).advance();
}

// Handles the end of a row (i.e when we detect that
// we've moved to a new line).
function handleRowEnd(st: State): void {
    // We force the stack into a row node. For correctly
    // formatted markup, this will just pop the top node
    // from the stack (which will be a row node) and add
    // it to the stack. But for ill-formatted markup, it
    // will force extra branches on top of the row branch
    // into WORD nodes and push them into the row node.
    // This is to handle stuff like:
    //     # Hello, **World!
    // where the bold formatting isn't closed properly.
    // Then we can safely pop the branch knowing that it's
    // a row node. Collapse will do nothing if there are
    // no row nodes in the stack.
    const branch = st.collapseStackToRowNode().getCurrentStackBranch();

    // We need to make sure the branch really is a row
    // node, because it's possible there was no row node
    // in the stack (i.e when we move to a new line inside
    // a paragraph).
    if (branch !== null && isRowNode(branch)) {
        st.popBranch();
        // After handling the row, we also handle the paragraph
        // boundary since we've reached the end of the row, which
        // means the start of a new paragraph.
        handleParStart(st);
    }
}

function handleParStart(st: State): void {
    st.pushBranch(new Node(st, BranchType.PARAGRAPH));
}

function handleParEnd(st: State): void {
    // The end of paragraphs is also where lists end,
    // so we handle that first.
    handleListEnd(st);

    // We collapse and then immediately pop the branch
    // because collapsing to a paragraph node *always*
    // results in the stack containing just one node,
    // which is the paragraph node that we then pop.
    // We collapse everything to a single paragraph node
    // in the stack because we want to make sure paragraphs
    // are always a top-level node.
    st.collapseStackToParNode().popBranch();
}

function handleLinkOrImageStart(st: State, type: BranchType): void {
    // We don't allow nested link/images, so if there already
    // IS a link/image in the stack, then we handle the current
    // token as a WORD. Note we don't allow nesting links in links
    // or images in images, but it is possible to nest a link in
    // an image or an image in a link (though LaTeX might not
    // accept that!)
    if (st.stackSomeFromBottom((n: Node) => n.type === type)) {
        handleLeaf(st, LeafType.WORD);
    } else {
        const node = new Node(st, type);
        node.setData({
            leftPad: st.curToken().rightPad,
            lexeme: "",
            rightPad: ""
        });

        st.pushBranch(node);
    }
}

function handleLinkOrImageEnd(st: State): void {
    // We need to make sure the stack has a link/image
    // node in the first place.
    if (st.stackSomeFromTop(isLinkOrImage)) {
        // If it does, we collapse the stack to link/image.
        st.collapseStackToLinkOrImage();

        // And then also parse the next two tokens since we
        // can expect them to be a single WORD (the ref) and
        // a RIGHT_PAREN token.
        const [ref, paren] = st.lookahead(2);
        const areDefined = ref !== undefined && paren !== undefined;
        const validRef = ref.type === TokenType.WORD;
        const validParen = paren.type === TokenType.RIGHT_PAREN;

        if (areDefined && validRef && validParen) {
            // Get the link/image node we collapsed the stack to.
            const node = st.getCurrentStackBranch() as Node;
            // Update its data.
            const data = node.getData() as LinkImageData;
            data.ref = ref.lexeme;
            data.rightPad = paren.rightPad;
            // Pop it from stack.
            st.popBranch();
        } else {
            // If not the next two tokens aren't what we expect,
            // it means this is not a well-formatted link/image,
            // so we instead collapse the stack to the PREVIOUS
            // branch (if there is one, otherwise to a paragraph),
            // so that the token that started the link/image (a
            // ![ or [) is treated as a word. Then we treat the
            // current token (a BRACKET_PAREN) as a word as well.
            st.collapseStackToPrevious();
            handleLeaf(st, LeafType.WORD);
        }
    } else {
        // If not, then we handle the current BRACKET_PAREN
        // as a WORD.
        handleLeaf(st, LeafType.WORD);
    }
}

function handleListItem(st: State, type: BranchType): void {
    // Check if there's a list node already in the stack.
    // If so, then we are at the end of the previous list
    // item node, and the start of a new list item node.
    if (st.stackSomeFromBottom(n => n.type === type)) {
        handleListItemEnd(st);
        handleListItemStart(st);
    } else {
        // Otherwise, it's the start of a new list entirely,
        // and also a new list item.
        handleListStart(st, type);
        handleListItemStart(st);
    }
}

function handleListItemEnd(st: State): void {
    const node = st.collapseStackToListItem().getCurrentStackBranch();
    if (node !== null && node.type == BranchType.LIST_ITEM) {
        st.popBranch();
    }
}

function handleListItemStart(st: State): void {
    const node = new Node(st, BranchType.LIST_ITEM);
    st.pushBranch(node).advance();
}

function handleListStart(st: State, type: BranchType): void {
    const node = new Node(st, type);
    st.pushBranch(node);
}

function handleListEnd(st: State): void {
    handleListItemEnd(st);
    const node = st.collapseStackToList().getCurrentStackBranch();
    if (node !== null && isListNode(node)) {
        st.popBranch();
    }
}

function runParser(st: State): void {
    while (st.hasTokensLeft()) {
        const t = st.curToken();

        // We before matching token types, we also
        // check to see if we've reached the end of
        // the row. If so, we need to end possible
        // row nodes.
        if ((st.lookahead().length > 0) && (st.lookahead()[0].row > t.row)) {
            if (st.stackSomeFromBottom(isRowNode)) handleRowEnd(st);
        }

        switch (t.type) {

            /**************/
            /* Leaf Nodes */
            /**************/

            case TokenType.WORD:
                handleLeaf(st, LeafType.WORD); break;
            case TokenType.AT_DELIM:
                handleLeaf(st, LeafType.AT_DELIM); break;
            case TokenType.HEREDOC_TEX:
                handleLeaf(st, LeafType.HEREDOC_TEX); break;
            case TokenType.TEX_INLINE_MATH:
                handleLeaf(st, LeafType.TEX_INLINE_MATH); break;
            case TokenType.TEX_DISPLAY_MATH:
                handleLeaf(st, LeafType.TEX_DISPLAY_MATH); break;
            case TokenType.LATEX_INLINE_MATH:
                handleLeaf(st, LeafType.LATEX_INLINE_MATH); break;
            case TokenType.LATEX_DISPLAY_MATH:
                handleLeaf(st, LeafType.LATEX_DISPLAY_MATH); break;

            /************/
            /* MACRO_DEF *
            /************/

            case TokenType.MACRO_DEF: {
                const data = extractMacroDefData(t);
                st.attachMacroDef(data).advance();
                break;
            }

            /******************/
            /* Enclosed Nodes */
            /******************/

            case TokenType.STAR:
                handleEnclosed(st, BranchType.ITALIC); break;
            case TokenType.DOUBLE_STAR:
                handleEnclosed(st, BranchType.BOLD); break;
            case TokenType.DOUBLE_UNDERSCORE:
                handleEnclosed(st, BranchType.UNDERLINE); break;
            case TokenType.DOUBLE_TILDE:
                handleEnclosed(st, BranchType.STRIKETHROUGH); break;

            /*************/
            /* Row Nodes */
            /*************/

            case TokenType.HASH:
                handleRowStart(st, BranchType.SECTION);
                break;
            case TokenType.HASHSTAR:
                handleRowStart(st, BranchType.SECTION_STAR); 
                break;
            case TokenType.DOUBLE_HASH:
                handleRowStart(st, BranchType.SUBSECTION); 
                break;
            case TokenType.DOUBLE_HASHSTAR:
                handleRowStart(st, BranchType.SUBSECTION_STAR); 
                break;
            case TokenType.TRIPLE_HASH:
                handleRowStart(st, BranchType.SECTION); 
                break;
            case TokenType.TRIPLE_HASHSTAR:
                handleRowStart(st, BranchType.SECTION_STAR); 
                break;

            /*****************/
            /* Link or Image */
            /*****************/

            case TokenType.LEFT_BRACKET:
                handleLinkOrImageStart(st, BranchType.LINK);
                break;
            case TokenType.BANG_BRACKET:
                handleLinkOrImageStart(st, BranchType.IMAGE);
                break;
            case TokenType.BRACKET_PAREN:
                // Here I can lookahead for a WORD and a RIGHT_PAREN
                // immediately and parse them as well.
                // If they appear outside that context, I can parse
                // the right paren as a word.
                handleLinkOrImageEnd(st);
                break;
            case TokenType.RIGHT_PAREN:
                const word = new Node(st, LeafType.WORD);
                word.setData({ lexeme: t.lexeme, rightPad: t.rightPad });
                st.addLeaf(word).advance();
                break;

            /*********/
            /* LISTS */
            /*********/

            case TokenType.UL_ITEM:
                handleListItem(st, BranchType.ITEMIZE);
                break;
            case TokenType.OL_ITEM:
                handleListItem(st, BranchType.ENUMERATE);
                break;

            /*********/
            /* Misc. */
            /*********/

            case TokenType.SOF:
                handleParStart(st);
                st.advance();
                break;
            case TokenType.EMPTY_ROW:
                handleParEnd(st);
                handleParStart(st);
                st.advance();
                break;
            case TokenType.EOF:
                handleParEnd(st);
                return;

            default: {
                const err = new UnrecognizedTokenError(st);
                st.attachError(err).advance();
            }
        }
    }
}

export function parse(lexerState: LexerState): State {
    const state = new State(lexerState);
    runParser(state);
    return state;
}

export function parseSource(src: string): State {
    return parse(lex(src));
}

export function happyParse(src: string): AST {
    const state = parseSource(src);
    state.getErrors().forEach(e => e.print());
    return state.getAST();
}
