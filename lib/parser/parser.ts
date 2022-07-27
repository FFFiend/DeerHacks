import { lex } from "../lexer/lexer.ts";
//import { tokenToString } from "../lexer/helpers.ts";
import { Node } from "./node.ts";
import { State } from "./state.ts";
import { isRowNode } from "./helpers.ts";
import { UnrecognizedTokenError } from "./errors.ts";
import { TokenType, LexerState } from "../lexer/types.ts";

import {
    AST,
    LeafType,
    BranchType,
} from "./types.ts";

import {
    handleLeaf,
    handleRowEnd,
    handleEnclosed,
    extractMacroDefData,
    handleLinkOrImageStart,
    handleLinkOrImageEnd,
    handleRowStart,
    handleListItem,
    handleParStart,
    handleParEnd
} from "./handlers.ts";

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
                handleRowStart(st, BranchType.SUBSUBSECTION);
                break;
            case TokenType.TRIPLE_HASHSTAR:
                handleRowStart(st, BranchType.SUBSUBSECTION_STAR);
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
