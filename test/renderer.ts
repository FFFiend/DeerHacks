import { render } from "../lib/renderer/latex.ts";
import { happyParse } from "../lib/parser/parser.ts";

const sample = Deno.readTextFileSync("./test/sample.txt")
console.time("Took");
const rendered = render(happyParse(sample));
console.timeEnd("Took");

console.log("Output file will be written to ./test/output.txt");
Deno.writeTextFileSync("./test/output.txt", rendered);
