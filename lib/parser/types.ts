import { Token } from "../lexer/types.ts";

// Keep track of parser state.
export type State = {
    tokens: Token[],
    position: number,
    tree: AST
}

// These nodes never have any children. Their data
// contains raw strings which will be written to
// the LaTeX files as-is.
export enum LeafType {
    WORD,
    RAW_TEX,
    AT_DELIM,
    MACRO_DEF,
    TEX_INLINE,
    TEX_DISPLAY,
    LATEX_INLINE,
    LATEX_DISPLAY,
}

// These nodes always have children. They may or may
// not contain extra data about the node.
export enum BranchType {
    // Paragraph
    PARAGRAPH,
    // SECTIONS
    SECTION, SUBSECTION, SUBSUBSECTION,
    SECTION_STAR, SUBSECTION_STAR, SUBSUBSECTION_STAR,
    // Emphasis
    BOLD, ITALIC, UNDERLINE, STRIKETHROUGH,
    // Links/Images
    LINK_REF, IMAGE,
    // Lists
    ITEMIZE, ENUMERATE, //LIST_ITEM
}

export type MacroDefData = {
    name: string,
    params: string[],
    body: string
}

export type NodeData = MacroDefData | string | null;

// Each node is either a leaf node or a branch node.
export type NodeType = LeafType | BranchType;

// The tree structure.
export type Node = {
    col: number,
    row: number,
    type: NodeType,
    data: NodeData,
    position: number
    children?: Node[],
};

// The AST is a list of nodes.
export type AST = Node[]
