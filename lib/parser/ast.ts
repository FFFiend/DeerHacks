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

