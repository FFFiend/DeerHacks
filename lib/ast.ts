/*
So something like:
[
    PREAMBLE {
        col/row: ...,
        type: NodeType.PREAMBLE,
        data: path,
    }

    SectionStar {
        col/row: ...,
        type: NodeType.SECTION_STAR,
        children: [
            WORD {
                col/row: ...,
                type: NodeType.WORD
                data: "lexeme"
            },
            BOLD {
                col/row: ...,
                children: [
                    WORD {
                        col/row: ...,
                        data: "lexeme"
                    },

                    UNDERLINE {
                        WORD {
                            col/row: ...,
                            data: [
                                ...
                            ]
                        }
                    }
                ]
            }
        ]
    }

    Paragraph {
        col/row: ...,
        data: [
            WORD {
                col/row: ...,
                data: "lexeme"
            }
        ]
    }
]

*/

// Define atomics?

// These nodes never have any children. Their data
// contains raw strings which will be written to
// the LaTeX files as-is.
export enum LeafType {
    WORD,
    RAW_TEX,
    AT_DELIM,
    TEX_INLINE,
    TEX_DISPLAY,
    LATEX_INLINE,
    LATEX_DISPLAY,
    MACRO_DEFINITION
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
    ITEMIZE, ENUMERATE,
}

// Each node is either a leaf node or a branch node.
export type NodeType = LeafType | BranchType;

// The tree structure.
export type Node = {
    col: number,
    row: number,
    type: NodeType,
    data: string | null,
    position: number
    children?: Node[],
};

// The AST is a list of nodes.
export type AST = Node[]
