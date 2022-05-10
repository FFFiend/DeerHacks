import { lex } from "../lib/lexer/lexer.ts";
import { printToken } from "../lib/lexer/helpers.ts";

const sample = "word1 : word2";

const tokens = lex(sample);

for (const token of tokens) {
    printToken(token);
}
