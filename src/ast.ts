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

export enum NodeType {
    // Word
    WORD,
    // Paragraph
    PARAGRAPH,
    // SECTIONS
    SECTION, SUBSECTION, SUBSUBSECTION,
    SECTION_STAR, SUBSECTION_STAR, SUBSUBSECTION_STAR,
    // Emphasis
    BOLD, ITALIC, UNDERLINE, STRIKETHROUGH,
    // Links/Images
    LINK_REF, IMAGE,
    // Macros
    MACRO_DEF,
    // Lists
    ITEMIZE, ENUMERATE,
    // @delim
    AT_DELIM,
    // $...$ and $$...$$
    TEX_INLINE, TEX_DISPLAY,
    // \(...\) and \[...\]
    LATEX_INLINE, LATEX_DISPLAY,
    // Raw TeX from heredoc blocks
    RAW_TEX
}

// Define atomics?

type Tree = {
    col: number,
    row: number,
    type: NodeType,
    data?: string,
    children?: Tree[]
}

// The AST is a list of nodes.
export type AST = Tree[]
