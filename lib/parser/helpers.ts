import { Node } from "./node.ts";
import { LeafType, BranchType } from "./types.ts";
import { constrainString as constrain } from "../lexer/helpers.ts";

export function isRowNode(n: Node): boolean {
    const t = n.type;
    return t === BranchType.SECTION ||
           t === BranchType.SUBSECTION ||
           t === BranchType.SUBSUBSECTION ||
           t === BranchType.SECTION_STAR ||
           t === BranchType.SUBSECTION_STAR ||
           t === BranchType.SUBSUBSECTION_STAR;
}

export function isLinkOrImage(n: Node): boolean {
    const t = n.type;
    return t === BranchType.LINK || t === BranchType.IMAGE;
}

export function isListNode(n: Node): boolean {
    const t = n.type;
    return t === BranchType.ITEMIZE || t == BranchType.ENUMERATE;
}

// So we can index the enum to determine Branch/Leaf type...
type EnumObj = {[index: string | number]: string | number};

export function printNode(node: Node, indent = 2, i = 0): void {
    // The node is a branch node if it has the `children` field.
    const nodeType: EnumObj
        = node.isLeaf
        ? LeafType
        : BranchType;

    // Outer pad for the braces lines.
    let outerPad = " ".repeat(indent * i);
    let innerPad = " ".repeat(indent * (i+1));

    // Node type
    console.log(
        // We need to do an assertion to shut TypeScript up.
        outerPad + `%c${nodeType[node.type as number]}%c {`,
        "color: red", "color: default"
    );

    // Column/row
    console.log(
        innerPad + `C:R = %c${node.col}:${node.row}%c,`,
        "color: blue", "color: default"
    );

    // If it has data
    if (node.getData() !== null) {
        const data = constrain(JSON.stringify(node.getData()));
        console.log(
            innerPad + `Data = %c${data}%c,`,
            "color: green", "color: default"
        );
    }

    // Recursively print child nodes with increased indentation.
    if (node.children) {
        console.log(innerPad + `Children = [`);
        node.children.map(n => printNode(n, indent, i+2));
        console.log(innerPad + "]");
    }

    // Final brace
    console.log(outerPad + "}");
}
