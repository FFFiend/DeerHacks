import { AST, LeafType, BranchType, Node } from "../parser/ast.ts";

// Renders a leaf node.
// TODO: All the other LeafTypes...
function renderLeaf(node: Node): string {
    switch (node.type) {
        case LeafType.WORD: {
            // Data ISN'T null here but since the Node type
            // encompasses both Leaf (which always has data)
            // and Branch (which sometimes has data) nodes,
            // TypeScript thinks data might be null so we have
            // to handle it with || "". AGAIN: FIND A BETTER
            // REPRESENTATION!
            return node.data || "";
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
        case BranchType.BOLD: {
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
            return "\\textbf{" + pieces.join(" ") + "}";
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
