# Markup Spec

### Italics, bold, underline, strikethrough

`*Italics*`

`**Bold**`

`__Underlined__`

`~~Strikethrough~~`

### Sections/subsections

Numbered sections use `#`:

`# Section`
`## Subsection`
`### Subsubsection`

For unnumbered sections, append an `*` at the end (similar to LaTeX):

`#* Section`
`##* Subsection`
`###* Subsubsection`

`#` and `*` must appear at the very beginning of the line, and must be followed by a space before the section name.

### Lists

For numbered lists:
1. Item one
2. Item three
3. Item four
4. ...

There must not be any empty lines between consecutive items of the list (empty lines signal the start of a new paragraph). Moreover, the actual numbers in the source file are ignored, so:
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
would be rendered as the exact same lists (starting at 1. and ending at 3.).

For unnumbered lists:
- Item a
- Item b
- Item c

As with numbered lists, there should not be any empty lines between consecutive items of the list.

Note that as of now, nested lists are not supported.

### Links

The familiar markdown syntax for links is supported:
```
[text](https://text.com)
```

Note that for links to be rendered properly, the hyperref package is required.

### Images

Images are also supported with the familiar markdown syntax:
```
![Caption text](./path/to/img.png)
```

Note that the `graphicx` package is required for this.

### Macros

The syntax for defining macros is:
```
macro name{param1}{param2}{...}{paramN} = {body}
```

For example:
```
macro fn{A}{B} = {f : A \to B}
```

Parameters do not need to be single letters.

Besides `macro`, you may also wish to use `mathmacro` for defining macros in the same manner. The difference is that with `mathmacros`, the program will ensure that they are always placed inside a math environment. For example:
```
macro fun{A}{B} = {f : A \to B}
mathmacro map{A}{B} = {f : A \to B}
```

Using `\fun{A}{B}` outside a math environment will throw an error since the command `\to` can only be used inside math environments. However, if you use `\map{A}{B}` outside a math environment, the program will automatically insert math delimiters around it to ensure that it renders properly and no errors are thrown.

### `@` delimiter shorthand

If you need to insert a single "token" into a math environment, you would need to put delimiters around it everytime. For example:
```
We say that $f$ is continuous at $c$ if the limit of $f$ as $x$ approaches $c$ is equal to $f(c)$.
```
However, you can instead use the shorthand `@` syntax that will wrap everything following the `@` symbol until the next whitespace character inside `$`, so that the above can be written as:
```
We say that @f is continuous at @c if the limit of @f as @x approaches @c is equal to @f(c).
```

### Including TeX

If you need to include raw latex inside, you can do so using heredox syntax:
```
# Introduction

This is a paragraph written in the markup format. However, now I need to do something that is not supported by the markup format. What do I do?

TEX <<< EOF
\begin{enum}
    \item That's right!
    \item I just use the heredoc syntax for including tex directly into the markup document!
    \item Cool!
\end{enum}
EOF
```

### Comments

Comments are still the same as in TeX, i.e everything after the `%` symbol is ignored.

### Preamble

Currently, preambles need to be written in a separate file and then included into the document using `\preamble{./path/to/preamble.tex}` This is a special reserved command and can be placed anywhere in the document. The program will read the preamble file and include it into the rendered document appropriately.
