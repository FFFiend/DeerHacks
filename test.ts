import { scan } from "./scanner.ts"
import { tokenToStr } from "./token.ts"

const sample = "word1 : word2";
// other test includes "word1 ! @ # $ % ^ & * word2" <- for debugging purposes.


const sup = scan(sample)

for (var i=0; i< sup.length; i++){
    console.log(tokenToStr(sup[i]));
}
