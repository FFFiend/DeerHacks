import { Token, LexerState, LexerError } from "../lexer/types.ts";
import { Node } from "./node.ts";

import {
    isRowNode,
    isListNode,
    isLinkOrImage
} from "./helpers.ts";

import {
    AST,
    LeafType,
    BranchType,
    ParserError,
    MacroDefData,
} from "./types.ts";

export class State {
    private tree: AST;
    private stack: Node[];
    private tokens: Token[];
    private position: number;
    private errors: ParserError[];
    private lexErrors: LexerError[];
    private macroDefs: MacroDefData[];

    public constructor(lexerState: LexerState) {
        this.tree = [];
        this.stack = [];
        this.tokens = lexerState.getTokens();
        this.position = 0;
        this.errors = [];
        this.lexErrors = lexerState.getErrors()
        this.macroDefs = [];
    }

    public getPosition(): number {
        return this.position;
    }

    public getAST(): AST {
        return this.tree;
    }

    public getErrors(): (ParserError | LexerError)[] {
        return [...this.lexErrors, ...this.errors];
    }

    public hasTokensLeft(): boolean {
        return this.position < this.tokens.length;
    }

    public attachError(err: ParserError): State {
        this.errors.push(err);
        return this;
    }

    public attachMacroDef(data: MacroDefData): State {
        this.macroDefs.push(data);
        return this;
    }

    public curToken(): Token {
        return this.tokens[this.position];
    }

    public lookahead(n: number = 1): Token[] {
        const start = this.position + 1;
        const end   = this.position + n + 1;
        return this.tokens.slice(start, end);
    }

    public advanceOnce(): State {
        if (this.hasTokensLeft()) this.position++;
        return this;
    }

    public advance(n: number = 1): State {
        while (n > 0) {
            this.advanceOnce();
            n--;
        }

        return this;
    }

    public stackSomeFromBottom(fn: (n: Node) => boolean): boolean {
        return this.stack.some(fn);
    }

    public stackSomeFromTop(fn: (n: Node) => boolean): boolean {
        const result = this.stack.reverse().some(fn);
        this.stack.reverse();
        return result;
    }

    public getCurrentStackBranch(): Node | null {
        if (this.stack.length > 0) {
            return this.stack[this.stack.length - 1]
        } else {
            return null;
        }
    }

    // We check the stack to see if we are inside a
    // branch or not. If so, we add the leaf to the
    // branch node's children. Otherwise, we append
    // the leaf to the AST (although this case will
    // never occur since there's always at least
    // one branch node in the stack).
    public addLeaf(n: Node): State {
        const branch = this.getCurrentStackBranch();

        if (branch !== null) {
            branch.addChild(n);
        } else {
            this.tree.push(n);
        }

        return this;
    }

    // Pushes a branch node to top of stack.
    public pushBranch(node: Node): State {
        this.stack.push(node);
        return this;
    }

    // If the stack length is greater than one, then it
    // pops the last branch node in the stack and pushes
    // that to the children of the second-to-last branch
    // node in the stack. If the stack length is exactly
    // one, it pops the node and pushes it to the AST.
    // If the stack is empty, it does nothing.
    public popBranch(): State {
        const branch = this.stack.pop();

        // Do nothing if there is nothing left in the
        // stack. TODO: Should this be an error?
        if (branch === undefined) return this;

        // If the stack length is now zero, it means the
        // branch we just popped is a top-level node for
        // the AST, so we push it to the AST.
        if (this.stack.length === 0) {
            this.tree.push(branch);
        } else {
            // At this point we know the stack still has
            // branch nodes inside it. We pop the next one,
            // which will be the parent to the branch we
            // popped previously above. Thus, we add it as
            // a child to the parent.
            const parent = this.getCurrentStackBranch() as Node;
            parent.addChild(branch);
        }

        return this;
    }

    public collapseStackTo(node: Node): State {
        const index = this.stack.indexOf(node);
        // Remove everything in the stack after the row node.
        const extraNodes = this.stack.splice(index + 1);

        const acc = [];
        for (const extraNode of extraNodes) {
            // We need to change state's position
            // to that of the extra node, so that
            // Node's constructor still has the
            // correct row/col information (otherwise
            // it'll mess up error messages).
            const curPosition = this.position;
            this.position = extraNode.position;
            const word = new Node(this, LeafType.WORD);
            word.setData(extraNode.getData());
            // We've converted the extra node into a word.
            // So now we add it and it's children to the acc.
            acc.push(word);
            acc.concat(extraNode.children);
            // We need to reset the state's position to what
            // it was before.
            this.position = curPosition;
        }

        node.addChildren(...acc);
        return this;
    }

    // Collapses the top stack to the one right
    // below it. If there is only one node in the
    // stack, collapses it to a paragraph. If the
    // stack is empty, does nothing.
    public collapseStackToPrevious(): State {
        if (this.stack.length === 0) return this;

        if (this.stack.length === 1) {
            this.collapseStackToParNode();
        }

        const node = this.stack[this.stack.length - 2];
        this.collapseStackTo(node);
        return this;
    }

    public collapseStackToRowNode(): State {
        const branch = this.getCurrentStackBranch();

        // If the stack is empty or the top of the stack
        // is already a row node, we don't need to collapse
        // anything.
        if (branch === null || isRowNode(branch)) return this;

        // Otherwise, if the stack has a row node, we find
        // it's index and collapse every branch above it.
        // Collapsing means every branch above the row node
        // is flattened by one level, and the branch's own
        // lexeme is converted to a WORD node, and then
        // they are all added as children to the row node
        // we are collapsing to. Moreover, if there are
        // multiple row nodes in the branch (highly unlikely,
        // if even possible), we collapse to the "lowest"
        // one, i.e the one with the lowest index.
        if (this.stackSomeFromBottom(isRowNode)) {
            // The row node we will collapse everything into.
            const row = this.stack.find(isRowNode) as Node;
            this.collapseStackTo(row);
        }

        return this;
    }

    public collapseStackToParNode(): State {
        // We don't do anything if the stack is empty.
        if (this.stack.length === 0) return this;

        // We also don't do anything if the stack has only
        // one branch and it's already a paragraph (i.e it's
        // already in a collapsed state).
        const branch = this.getCurrentStackBranch() as Node;
        if (this.stack.length === 1 && branch.type === BranchType.PARAGRAPH) {
            return this;
        }

        // Otherwise, we collapse EVERYTHING in the stack
        // into a single paragraph node. To do this, we first
        // create a new paragraph node using the position of
        // the "lowest" (first) node in the stack. Then we
        // insert this paragraph node at the bottom of the
        // stack (beginning of the list). Then, we collapse
        // everything to that node.
        const first = this.stack[0];
        // Store current position so we can restore it later.
        const curPosition = this.position;
        this.position = first.position;
        // Create par node.
        const parNode = new Node(this, BranchType.PARAGRAPH);
        // Restore original position.
        this.position = curPosition;
        // Insert par node at the bottom of the stack.
        this.stack.unshift(parNode);
        // Collapse to the par node.
        this.collapseStackTo(parNode);

        return this;
    }

    public collapseStackToLinkOrImage(): State {
        const branch = this.getCurrentStackBranch();
        if (branch === null || isLinkOrImage(branch)) return this;

        // Find the top-most link/image in the stack.
        const node = this.stack.reduce((acc, cur) => {
            if (isLinkOrImage(cur)) return cur;
            else return acc;
        });

        this.collapseStackTo(node);
        return this;
    }

    public collapseStackToListItem(): State {
        const branch = this.getCurrentStackBranch();
        if (branch === null || branch.type == BranchType.LIST_ITEM) return this;

        // Find the bottom-most list item and collapse to it
        // (although it's unlikely there will ever be multiple
        // list item nodes in the stack).
        const node = this.stack.find(n => n.type === BranchType.LIST_ITEM);
        if (node === undefined) return this;

        this.collapseStackTo(node);
        return this;
    }

    public collapseStackToList(): State {
        const branch = this.getCurrentStackBranch();
        if (branch === null || isListNode(branch)) return this;

        const node = this.stack.find(isListNode);
        if (node === undefined) return this;

        this.collapseStackTo(node);
        return this;
    }
}
