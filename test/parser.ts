import { parse } from "../lib/parser/parser.ts";
import { scan } from "../lib/lexer/lexer.ts";
import { Node, nodeToStr } from "../lib/parser/ast.ts";

// NOTE: The spaces are important for now since our scanner
// NOTE: still has some bugs that need to be fixed.
const sample = "** bold **"

const ast: Node[] = parse(scan(sample));

console.log(ast);

/*
for (const node of ast) {
    console.log(nodeToStr(node));
}
*/
