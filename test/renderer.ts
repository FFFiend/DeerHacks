import { render } from "../lib/renderer/latex.ts";
import { happyParse } from "../lib/parser/parser.ts";
import { happyLex } from "../lib/lexer/lexer.ts";

const sample = Deno.readTextFileSync("./test/sample.txt")
const rendered = render(happyParse(happyLex(sample)));
console.log("%c" + rendered + "\n", "color: green");
