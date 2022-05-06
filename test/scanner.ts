import { scan } from "../lib/scanner.ts";
import { tokenToStr } from "../lib/token.ts";

const sample = "word1 : word2";

const tokens = scan(sample);

for (const token of tokens) {
    console.log(tokenToStr(token));
}
