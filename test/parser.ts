import { happyParse } from "../lib/parser/parser.ts";
import { printNode } from "../lib/parser/helpers.ts";

const sample = Deno.readTextFileSync("./test/sample.txt")
console.time("Took");
const ast = happyParse(sample);
console.timeEnd("Took");
