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
            // to handle it with || "". AGAIN: FIND A BETTER
            // REPRESENTATION!
            return typeof(node.data) == "string" ? node.data : "";
        }

        case LeafType.AT_DELIM: {
            // Wrap around inline math delim \(...\)
            return `\\(${node.data}\\)` || "";
        }

        case LeafType.RAW_TEX: {
            // TODO: Should I wrap newlines around this...?
            return `\n${node.data}\n` || "";
        }

        case LeafType.TEX_INLINE_MATH: {
            return `$${node.data}$` || "";
        }

        case LeafType.TEX_DISPLAY_MATH: {
            return `$$${node.data}$$` || "";
        }

        case LeafType.LATEX_INLINE_MATH: {
            return `\\(${node.data}\\)` || "";
        }

        case LeafType.LATEX_DISPLAY_MATH: {
            return `\\[${node.data}\\]` || "";
        }

        // TODO: Proper Error handling!!!
        default: {
            return "UNIMPLEMENTED!";
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

            // TODO: Should I really be joining them with " "?
            // TODO: Need more testing here to make sure
            // TODO: everything renders properly after joining
            // TODO: with " ".
            return "\\textit{" + pieces.join(" ") + "}";
        }

        case BranchType.BOLD: {
            const pieces
                = node.children
                ? node.children.map((n: Node) => renderNode(n))
                : [];

            return "\\textbf{" + pieces.join(" ") + "}";
        }

        case BranchType.UNDERLINE: {
            const pieces
                = node.children
                ? node.children.map((n: Node) => renderNode(n))
                : [];

            return "\\underline{" + pieces.join(" ") + "}";
        }

        case BranchType.STRIKETHROUGH: {
            const pieces
                = node.children
                ? node.children.map((n: Node) => renderNode(n))
                : [];

            // TODO: What's the ulem command for strikethrough?
            return "\\underline{" + pieces.join(" ") + "}";
        }

        case BranchType.SECTION: {
            const pieces
                = node.children
                ? node.children.map((n: Node) => renderNode(n))
                : [];

            return "\\section{" + pieces.join(" ") + "}\n";
        }

        case BranchType.SUBSECTION: {
            const pieces
                = node.children
                ? node.children.map((n: Node) => renderNode(n))
                : [];

            return "\\subsection{" + pieces.join(" ") + "}\n";
        }

        case BranchType.SUBSUBSECTION: {
            const pieces
                = node.children
                ? node.children.map((n: Node) => renderNode(n))
                : [];

            return "\\subsubsection{" + pieces.join(" ") + "}\n";
        }

        case BranchType.SECTION_STAR: {
            const pieces
                = node.children
                ? node.children.map((n: Node) => renderNode(n))
                : [];

            return "\\section*{" + pieces.join(" ") + "}\n";
        }

        case BranchType.SUBSECTION_STAR: {
            const pieces
                = node.children
                ? node.children.map((n: Node) => renderNode(n))
                : [];

            return "\\subsection*{" + pieces.join(" ") + "}\n";
        }

        case BranchType.SUBSUBSECTION_STAR: {
            const pieces
                = node.children
                ? node.children.map((n: Node) => renderNode(n))
                : [];

            return "\\subsubsection*{" + pieces.join(" ") + "}\n";
        }

        case BranchType.LINK: {
            const ref = node.data || "";
            const pieces
                = node.children
                ? node.children.map((n: Node) => renderNode(n))
                : [];

            return "\\href{" + ref + "}{" + pieces.join(" ") + "}"
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
                "    \\caption{" + pieces.join(" ") + "}",
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
            const strlist = ["\\begin{itemize}", ...items, "\\end{itemize}"];

            return strlist.join("\n");
        }

        case BranchType.ENUMERATE: {
            const pieces
                = node.children
                ? node.children.map((n: Node) => renderNode(n))
                : [];

            const items = pieces.map((p: string) => "\item " + p);
            const strlist = [
                "\\begin{enumerate}",
                ...items,
                "\\end{enumerate}"
            ];

            return strlist.join("\n");
        }

        default: {
            return "UNIMPLEMENTED!";
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
