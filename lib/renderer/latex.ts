import { AST, LeafType, BranchType, Node } from "../parser/types.ts";

// TODO: Lots of wet code, DRY it up!
// TODO: -----------------------------

// Renders a leaf node.
function renderLeaf(node: Node): string {
    const data = node.getData();

    switch (node.type) {
        case LeafType.WORD: {
            // Data ISN'T null here but since the Node type
            // encompasses both Leaf (which always has data)
            // and Branch (which sometimes has data) nodes,
            // TypeScript thinks data might be null so we have
            // to handle it with a ternary. AGAIN: FIND A BETTER
            // REPRESENTATION!
            return data !== null ? data.lexeme + data.rightPad : "";
        }

        case LeafType.AT_DELIM: {
            // Wrap around inline math delim \(...\)
            return data !== null
                ? `\\(${data.lexeme}\\)${data.rightPad}`
                : "";
        }

        case LeafType.HEREDOC_TEX: {
            // Split into lines, remove the first/last to get
            // rid of delimiters and join it up again.
            return data !== null
                ? `\n${data.lexeme.split("\n").slice(1,-1).join("\n")}\n`
                : "";
        }

        case LeafType.TEX_INLINE_MATH: {
            return data !== null
                ? `$${data.lexeme}$${data.rightPad}`
                : "";
        }

        case LeafType.TEX_DISPLAY_MATH: {
            return data !== null
                ? `$$${data.lexeme}$$${data.rightPad}`
                : "";
        }

        case LeafType.LATEX_INLINE_MATH: {
            return data !== null
                ? `\\(${data.lexeme}\\)${data.rightPad}`
                : "";
        }

        case LeafType.LATEX_DISPLAY_MATH: {
            return data !== null
                ? `\\[${data.lexeme}\\]${data.rightPad}`
                : "";
        }

        // TODO: Proper Error handling!!!
        // TODO: ------------------------
        default: {
            return `UNIMPLEMENTED: ${Object.keys(node).includes("children") ? BranchType[node.type] : LeafType[node.type]}`;
        }
    }
}

// Renders a branch node and its children
// recursively, returning the resulting
// LaTeX string.
function renderBranch(node: Node): string {
    const data = node.getData();

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

            return "\\section{" + pieces.join("") + "}\n";
        }

        case BranchType.SUBSECTION: {
            const pieces
                = node.children
                ? node.children.map((n: Node) => renderNode(n))
                : [];

            return "\\subsection{" + pieces.join("") + "}\n";
        }

        case BranchType.SUBSUBSECTION: {
            const pieces
                = node.children
                ? node.children.map((n: Node) => renderNode(n))
                : [];

            return "\\subsubsection{" + pieces.join("") + "}\n";
        }

        case BranchType.SECTION_STAR: {
            const pieces
                = node.children
                ? node.children.map((n: Node) => renderNode(n))
                : [];

            return "\\section*{" + pieces.join("") + "}\n";
        }

        case BranchType.SUBSECTION_STAR: {
            const pieces
                = node.children
                ? node.children.map((n: Node) => renderNode(n))
                : [];

            return "\\subsection*{" + pieces.join("") + "}\n";
        }

        case BranchType.SUBSUBSECTION_STAR: {
            const pieces
                = node.children
                ? node.children.map((n: Node) => renderNode(n))
                : [];

            return "\\subsubsection*{" + pieces.join("") + "}\n";
        }

        case BranchType.LINK: {
            const ref = data !== null ? data.lexeme : "";
            const pieces
                = node.children
                ? node.children.map((n: Node) => renderNode(n))
                : [];

            return "\\href{" + ref + "}{" + pieces.join("") + "}"
        }

        case BranchType.IMAGE: {
            const ref = node.getData() || "";
            const pieces
                = node.children
                ? node.children.map((n: Node) => renderNode(n))
                : [];

            const strlist = [
                "\\begin{figure}[htp]",
                "\t\\centering",
                "\t\\includegraphics{" + ref + "}",
                "\t\\caption{" + pieces.join("") + "}",
                "\t\\label{fig:" + ref + "}",
                "\\end{figure}"
            ];

            return strlist.join("\n");
        }

        case BranchType.ITEMIZE: {
            const pieces
                = node.children
                ? node.children.map((n: Node) => renderNode(n))
                : [];

            const items = pieces.map((p: string) => "\t\\item " + p);
            const strlist = [
                "\\begin{itemize}",
                ...items,
                "\\end{itemize}",
            ];

            return strlist.join("\n");
        }

        case BranchType.ENUMERATE: {
            const pieces
                = node.children
                ? node.children.map((n: Node) => renderNode(n))
                : [];

            const items = pieces.map((p: string) => "\t\\item " + p);
            const strlist = [
                "\\begin{enumerate}",
                ...items,
                "\\end{enumerate}",
            ];

            return strlist.join("\n");
        }

        case BranchType.LIST_ITEM: {
            const pieces
                = node.children
                ? node.children.map((n: Node) => renderNode(n))
                : [];

            return pieces.join("");
        }

        case BranchType.PARAGRAPH: {
            // Deal with empty paragraphs.
            // TODO: Find a better way to handle this?
            if (node.children && node.children.length === 0) return "";

            const pieces
                = node.children
                ? node.children.map((n: Node) => renderNode(n))
                : [];

            return "\n\\par " + pieces.join("") + "\n";
        }

        default: {
            return `UNIMPLEMENTED: ${Object.keys(node).includes("children") ? BranchType[node.type] : LeafType[node.type]}`;
        }
    }
}

function renderNode(node: Node): string {
    // Handle branches/leafs separately since
    // we're using separate enums for both which
    // would otherwise mess with the switch cases.
    if (node.isLeaf) {
        return renderLeaf(node);
    } else {
        return renderBranch(node);
    }
}

// Converts AST to LaTeX output string.
export function render(ast: AST): string {
    // The AST is a list of nodes so we map them to
    // their rendered strings and join them.
    const pieces = ast.map((n: Node) => renderNode(n));
    // Also strip extra whitespace at the ends.
    return pieces.join("").trim();
}
