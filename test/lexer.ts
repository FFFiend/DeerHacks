import { happyLex } from "../lib/lexer/lexer.ts";
import { printToken } from "../lib/lexer/helpers.ts";

const sample = Deno.readTextFileSync("./test/sample.txt")
const tokens = happyLex(sample);
tokens.forEach(printToken);
