import { scan } from "../lib/lexer/lexer.ts";
import { tokenToStr } from "../lib/lexer/helpers.ts";

const sample = "word1 : word2";

const tokens = scan(sample);

for (const token of tokens) {
    console.log(tokenToStr(token));
}
