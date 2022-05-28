import { happyLex } from "../lib/lexer/lexer.ts";
import { tokenToString } from "../lib/lexer/helpers.ts";

const sample = Deno.readTextFileSync("./test/sample.txt")
console.time("Took");
const tokens = happyLex(sample);
console.timeEnd("Took");
