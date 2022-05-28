import { NodeData, NodeType } from "./types.ts";
import { State } from "./state.ts";

export class Node {
    /* column, row in the SOURCE file */
    public readonly col: number;
    public readonly row: number;
    /* type of node */
    public readonly type: NodeType;
    /* whether it's a leaf node or not */
    public readonly isLeaf: boolean;
    /* child nodes */
    public readonly children: Node[];
    /* position in the list of tokens in the parser */
    public readonly position: number;

    // data for node, usually leafs, may be null
    // we won't have the data when the node is
    // created, so we need to use getter/setters
    // to safely allow adding the data when it is
    // available.
    private data: NodeData;

    public constructor(st: State, type: NodeType, isLeaf: boolean = false) {
        const token = st.curToken();
        this.col = token.col;
        this.row = token.row;
        this.type = type;
        this.isLeaf = isLeaf;
        this.children = [];
        this.position = st.getPosition();

        this.data = null;
    }

    public addChild(node: Node): Node {
        this.children.push(node);
        return this;
    }

    public addChildren(...nodes: Node[]): Node {
        for (const node of nodes) this.addChild(node);
        return this;
    }

    public setData(data: NodeData): Node {
        this.data = data;
        return this;
    }

    public getData(): NodeData {
        return this.data;
    }

    public toString(): string {
        return JSON.stringify(this);
    }
}
