# Markup Spec

### Emphasis

Wrap text within single asterisks ('\*') for `*italics*`, double asterisks ('\*\*') for `**bold**`, as in Markdown. Use double underscores ('\_\_') for `\_\_underlined\_\_` and double tilde signs ('~~') for `~~strikethrough~~` text.

> Note that strikethrough text will require the `ulem` package to be available in your LaTeX distribution.

### Sections

Numbered sections use `#`:
```markdown
# Section
## Subsection
### Subsubsection
```

For unnumbered sections, append an `*` at the end (similar to LaTeX):
```markdown
#* Section
##* Subsection
###* Subsubsection
```

Note that these must be at the beginning of the line, and followed by a whitespace character before the section name.

### Lists

Numbered lists are the same as in markdown:
```markdown
1. Item one
2. Item three
3. Item four
```

Note there must not be any empty lines between consecutive items of the list (empty lines signal the start of a new paragraph). Moreover, as in markdown, the actual numbers for the list items are ignored, so:
```markdown
1. Item one
2. Item two
3. Item three
```
and
```markdown
9. Item one
6. Item two
3. Item three
```
would both be rendered as the exact same lists (starting at 1 and ending at 3).

For unnumbered lists:
```markdown
- Item a
- Item b
- Item c
```

As with numbered lists, there should not be any empty lines between consecutive items of the list.

> Note that as of now, nested lists are not supported.

### Links

The familiar markdown syntax for links is supported:
```
[text](https://text.com)
```

> Note that the hyperref package is required for links.

### Images

Images are also supported with the familiar markdown syntax:
```
![Caption text](./path/to/img.png)
```

> Note that the `graphicx` package is required for images.

### Macros

The syntax for defining macros is:
```
macro name{param1}{param2}{...}{paramN} = {body}
```

For example:
```
macro fn{A}{B} = {f : A \to B}
```
defines a macro and can be used just as you would in LaTeX:
```latex
Define $\fn{\mathbb{R}}{\mathbb{R}}$ as $f(x) = x^2$.
```

> Parameters do not need to be single letters! Think of them just as function parameters in programming languages.

<!--
Besides `macro`, you may also wish to use `mathmacro` for defining macros in the same manner. The difference is that with `mathmacros`, the program will ensure that they are always placed inside a math environment. For example:
```
macro fun{A}{B} = {f : A \to B}
mathmacro map{A}{B} = {f : A \to B}
```

Using `\fun{A}{B}` outside a math environment will throw an error since the command `\to` can only be used inside math environments. However, if you use `\map{A}{B}` outside a math environment, the program will automatically insert math delimiters around it to ensure that it renders properly and no errors are thrown.
-->

<!--
### `@` delimiter shorthand

If you need to insert a single "token" into a math environment, you would need to put delimiters around it everytime. For example:
```
We say that $f$ is continuous at $c$ if the limit of $f$ as $x$ approaches $c$ is equal to $f(c)$.
```
However, you can instead use the shorthand `@` syntax that will wrap everything following the `@` symbol until the next whitespace character inside `$`, so that the above can be written as:
```
We say that @f is continuous at @c if the limit of @f as @x approaches @c is equal to @f(c).
```
-->

### Including TeX

If you need to include raw latex inside, you can do so using heredox syntax:
```
# Introduction

This is a paragraph written in the markup format. However, now I need to do something that is not supported by the markup format. What do I do?

TEX <<< EOF
\begin{enum}
    \item That's right!
    \item I just use the heredoc syntax for including tex directly into the markup document!
    \item So cool!
\end{enum}
EOF
```

### Comments

Comments are still the same as in TeX, that is, everything following the `%` symbol up to the end of the line is ignored.

### Preamble

<!--
Currently, preambles need to be written in a separate file and then included into the document using `\preamble{./path/to/preamble.tex}` This is a special reserved command and can be placed anywhere in the document. The program will read the preamble file and include it into the rendered document appropriately.
-->

For now, the preamble needs to be written in a separate file and then included into the document using the special `PREAMBLE: /path/to/preamble.tex` directive. This must be placed at the beginning of the file, on it's own line.
