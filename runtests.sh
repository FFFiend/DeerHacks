echo 'Running test/lexer.ts'
deno run --allow-read test/lexer.ts -- $@
echo ''
echo 'Running test/parser.ts'
deno run --allow-read test/parser.ts -- $@
echo ''
echo 'Running test/renderer.ts'
deno run --allow-read --allow-write test/renderer.ts -- $@
