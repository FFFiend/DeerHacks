import { parse } from "../lib/parser.ts";
import { scan } from "../lib/scanner.ts";
import { Node, nodeToStr } from "../lib/ast.ts";

// NOTE: The spaces are important for now since our scanner
// NOTE: still has some bugs that need to be fixed.
const sample = "** bold **"

const ast: Node[] = parse(scan(testStr));

for (const node of ast) {
    console.log(nodeToStr(node));
}
