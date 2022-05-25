import { AST, LeafType, BranchType, Node } from "../parser/types.ts";

// TODO: Lots of wet code, DRY it up!

// Renders a leaf node.
function renderLeaf(node: Node): string {
    switch (node.type) {
        case LeafType.WORD: {
            // Data ISN'T null here but since the Node type
            // encompasses both Leaf (which always has data)
            // and Branch (which sometimes has data) nodes,
            // TypeScript thinks data might be null so we have
            // to handle it with a ternary. AGAIN: FIND A BETTER
            // REPRESENTATION!
            return node.data ? node.data.lexeme + node.data.rightPad : "";
        }

        case LeafType.AT_DELIM: {
            // Wrap around inline math delim \(...\)
            return node.data
                ? `\\(${node.data.lexeme}\\)${node.data.rightPad}`
                : "";
        }

        case LeafType.RAW_TEX: {
            // Split into lines, remove the first/last to get
            // rid of delimiters and join it up again.
            return node.data
                ? `\n${node.data.lexeme.split("\n").slice(1,-1).join("\n")}\n`
                : "";
        }

        case LeafType.TEX_INLINE_MATH: {
            return node.data
                ? `$${node.data.lexeme}$${node.data.rightPad}`
                : "";
        }

        case LeafType.TEX_DISPLAY_MATH: {
            return node.data
                ? `$$${node.data.lexeme}$$${node.data.rightPad}`
                : "";
        }

        case LeafType.LATEX_INLINE_MATH: {
            return node.data
                ? `\\(${node.data.lexeme}\\)${node.data.rightPad}`
                : "";
        }

        case LeafType.LATEX_DISPLAY_MATH: {
            return node.data
                ? `\\[${node.data.lexeme}\\]${node.data.rightPad}`
                : "";
        }

        // TODO: Proper Error handling!!!
        default: {
            return `UNIMPLEMENTED: ${Object.keys(node).includes("children") ? BranchType[node.type] : LeafType[node.type]}`;
        }
    }
}

// Renders a branch node and its children
// recursively, returning the resulting
// LaTeX string.
// TODO: All the other BranchTypes...
function renderBranch(node: Node): string {
    switch (node.type) {
        case BranchType.ITALIC: {
            // AGAIN: TypeScript doesn't know children ISN'T null so
            // we have to handle that case to keep TS happy.
            const pieces
                = node.children
                ? node.children.map((n: Node) => renderNode(n))
                : [];

            return "\\textit{" + pieces.join("") + "}";
        }

        case BranchType.BOLD: {
            const pieces
                = node.children
                ? node.children.map((n: Node) => renderNode(n))
                : [];

            return "\\textbf{" + pieces.join("") + "}";
        }

        case BranchType.UNDERLINE: {
            const pieces
                = node.children
                ? node.children.map((n: Node) => renderNode(n))
                : [];

            return "\\underline{" + pieces.join("") + "}";
        }

        case BranchType.STRIKETHROUGH: {
            const pieces
                = node.children
                ? node.children.map((n: Node) => renderNode(n))
                : [];

            return "\\sout{" + pieces.join("") + "}";
        }

        case BranchType.SECTION: {
            const pieces
                = node.children
                ? node.children.map((n: Node) => renderNode(n))
                : [];

            return "\\section{" + pieces.join("") + "}\n\n";
        }

        case BranchType.SUBSECTION: {
            const pieces
                = node.children
                ? node.children.map((n: Node) => renderNode(n))
                : [];

            return "\\subsection{" + pieces.join("") + "}\n\n";
        }

        case BranchType.SUBSUBSECTION: {
            const pieces
                = node.children
                ? node.children.map((n: Node) => renderNode(n))
                : [];

            return "\\subsubsection{" + pieces.join("") + "}\n\n";
        }

        case BranchType.SECTION_STAR: {
            const pieces
                = node.children
                ? node.children.map((n: Node) => renderNode(n))
                : [];

            return "\\section*{" + pieces.join("") + "}\n\n";
        }

        case BranchType.SUBSECTION_STAR: {
            const pieces
                = node.children
                ? node.children.map((n: Node) => renderNode(n))
                : [];

            return "\\subsection*{" + pieces.join("") + "}\n\n";
        }

        case BranchType.SUBSUBSECTION_STAR: {
            const pieces
                = node.children
                ? node.children.map((n: Node) => renderNode(n))
                : [];

            return "\\subsubsection*{" + pieces.join("") + "}\n\n";
        }

        case BranchType.LINK: {
            const ref = node.data ? node.data.lexeme : "";
            const pieces
                = node.children
                ? node.children.map((n: Node) => renderNode(n))
                : [];

            return "\\href{" + ref + "}{" + pieces.join("") + "}"
        }

        case BranchType.IMAGE: {
            const ref = node.data || "";
            const pieces
                = node.children
                ? node.children.map((n: Node) => renderNode(n))
                : [];

            const strlist = [
                "\\begin{figure}[htp]",
                "    \\centering",
                "    \\includegraphics{" + ref + "}",
                "    \\caption{" + pieces.join("") + "}",
                "    \\label{fig:" + ref + "}",
                "\\end{figure}"
            ];

            return strlist.join("\n");
        }

        // TODO: No idea if the whitespace between them is consistent
        // TODO: or not, needs testing.
        case BranchType.ITEMIZE: {
            const pieces
                = node.children
                ? node.children.map((n: Node) => renderNode(n))
                : [];

            const items = pieces.map((p: string) => "\item " + p);
            const strlist = [
                "",
                "\\begin{itemize}",
                ...items,
                "\\end{itemize}",
                ""
            ];

            return strlist.join("\n");
        }

        case BranchType.ENUMERATE: {
            const pieces
                = node.children
                ? node.children.map((n: Node) => renderNode(n))
                : [];

            const items = pieces.map((p: string) => "\item " + p);
            const strlist = [
                "",
                "\\begin{enumerate}",
                ...items,
                "\\end{enumerate}",
                ""
            ];

            return strlist.join("\n");
        }

        default: {
            return `UNIMPLEMENTED: ${Object.keys(node).includes("children") ? BranchType[node.type] : LeafType[node.type]}`;
        }
    }
}

// TODO: I still don't like how leaf/branch nodes
// TODO: are handled here, and the Object.keys way
// TODO: of checking their type feels hacky. Maybe
// TODO: there's a better way to represent them and
// TODO: also distinguish between them?
function renderNode(node: Node): string {
    // Handle branches/leafs separately since
    // we're using separate enums for both which
    // would otherwise mess with the switch cases.
    if (Object.keys(node).includes("children")) {
        return renderBranch(node);
    } else {
        return renderLeaf(node);
    }
}

// Converts AST to LaTeX output string.
export function renderLaTeX(ast: AST): string {
    // The AST is a list of nodes so we map them to
    // their rendered strings and join them.
    const pieces = ast.map((n: Node) => renderNode(n));
    return pieces.join(" ");
}
