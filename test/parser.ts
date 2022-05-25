import { happyLex } from "../lib/lexer/lexer.ts";
import { happyParse } from "../lib/parser/parser.ts";
import { printNode } from "../lib/parser/helpers.ts";

const sample = Deno.readTextFileSync("./test/sample.txt")
const ast = happyParse(happyLex(sample));
ast.forEach(n => printNode(n));
