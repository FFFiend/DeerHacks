import { renderLaTeX } from "../lib/renderer/latex.ts";
import { parse } from "../lib/parser/parser.ts";
import { lex } from "../lib/lexer/lexer.ts";

const sample = "Some non-bold and **some bold** text."

console.log("%c'" + renderLaTeX(parse(lex(sample))) + "'", "color: green");
