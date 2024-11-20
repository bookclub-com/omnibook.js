import { isNumeric, uuid } from './types/utils';
import {
  BNFEntityTypes,
  BaseBlockTypes,
  IBookBlock,
  IBookBlockRelationTypes,
  IBookBlockRelationship,
  IBookBlockRelationships,
  IBookBlockType,
  ID,
  IOmniGraph,
  IRenderBlock,
} from './types/omnibook.types';
import { BookBlock } from './book-block';

/**
 *  the omnigraph class is intended to manage the relationships between blocks, and make it easier to select the blocks needed for various actions.
 * for instance, if we want to generate a spark, I need to get the spark seed block, and then find all of the blocks related to that particular spark.
 * In the current state, most blocks have pretty simple relationships (i.e. a section block has a bunch of children blocks, but it also has spark blocks related to it). This is about the
 * extend of the complexity that exists. However, there's a future state where sections have multiple sparks associated with them, and other blocks have their own relationships. We're
 * going to want a way to make it easier to separate relationships management from the block content and block content manipulation. I believe the omnigraph class is the
 * way we handle this.
 *
 * CURRENTLY the Omnigraph is pretty tightly coupled with the BookBlock class. After having worked with this a bit, I'm thinking there's a scenario where we may want to decouple it a bit more,
 * and create a more abstracted Node and Edge classes that we can use to manage their properties and relationships a bit more granularly. I looked into two different graphing libraries, but for
 * the current use case, they both seemed like overkill.
 *
 * - Graphology: https://graphology.github.io/. I liked this one, it seemed pretty lightweight. It had some interesting build in graph functions that may prove useful down the line, but currently seemed like too much
 * - Drivine: https://liberation-data.github.io/drivine/. The thing I liked about this one the most was (a) it's written on NestJS, so it has some native compatibility with the current AI Engine implementation and
 * (b) it has native compatibility with Neo4j, which I think is in our future at some point
 *
 */

const deepCopy = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

export class Omnigraph {
  // Blocks are the nodes in the graph
  private _blocks: Map<ID, BookBlock<IBookBlock>> = new Map<ID, BookBlock<IBookBlock>>(); // Edges are the relationships between the blocks

  private _edges: Map<ID, IBookBlockRelationship> = new Map<ID, IBookBlockRelationship>();

  private _entryBlockId?: ID;

  constructor(blocks: BookBlock<IBookBlock>[] = [], entryBlockId?: ID) {
    this.addBlocks(blocks);
    this._entryBlockId = entryBlockId;
  }

  static buildGraph(rawBlocks: Omit<IBookBlock, 'edges'>[], edges: IBookBlockRelationship[], entryBlockId?: ID, requireNodes = true): Omnigraph {
    const graph = new Omnigraph([], entryBlockId);
    const blocks = rawBlocks.map((block) => BookBlock.buildBlock(block));
    graph.addBlocks(blocks);
    graph.addEdges(edges, requireNodes);
    return graph;
  }

  // Creates a new edge (generates a new UUID)
  createEdge(data: Omit<IBookBlockRelationship, 'id'>, requireNodes = true): void {
    const edge: IBookBlockRelationship = {
      id: uuid(),
      ...data,
    };
    this.addEdge(edge, requireNodes);
  }

  // Adds an edge to the graph.
  // Edges cannot be added in isolation, they require the blocks they connect to exist in the graph
  addEdge(edge: IBookBlockRelationship, requireNodes = true): void {
    const idExists = (id: ID): boolean => this._blocks.has(id);
    const relationshipExists = (blockA: ID, blockB: ID, type: IBookBlockRelationTypes): boolean =>
      this.edges.some((edge) => edge.block_a_id === blockA && edge.block_b_id === blockB && edge.type === type);

    if (idExists(edge.id) || relationshipExists(edge.block_a_id, edge.block_b_id, edge.type)) {
      console.warn('Edge already exists, not adding', edge);
    } else {
      if (!this._blocks.has(edge.block_a_id) && requireNodes) {
        const msg = `Block A with id ${edge.block_a_id} does not exist`;
        console.error(msg);
        throw new Error(msg);
      }

      if (!this._blocks.has(edge.block_b_id) && requireNodes) {
        const msg = `Block B with id ${edge.block_b_id} does not exist`;
        console.error(msg);
        throw new Error(msg);
      }

      this._edges.set(edge.id, edge);
    }
  }

  addEdges(edges: IBookBlockRelationship[], requireNodes = true): void {
    edges.forEach((edge) => this.addEdge(edge, requireNodes));
  }

  // Adds a block to the graph. Blocks in the graph should not have edges directly attached to them.
  private _addBlock(block: BookBlock<IBookBlock>): void {
    if (this._blocks.has(block.id)) {
      console.warn('Block already exists, not adding');
    } else {
      block.clearEdges();
      this._blocks.set(block.id, block);
    }
  }

  // Adds multiple blocks to the graph
  addBlocks(blocks: BookBlock<IBookBlock>[]): void {
    const allEdges: IBookBlockRelationship[] = blocks.reduce((acc: IBookBlockRelationship[], block: BookBlock<IBookBlock>) => {
      if (block.edges) {
        try {
          const edges = deepCopy<IBookBlockRelationship[]>(block.edges);
          acc.push(...edges);
        } catch (e) {
          console.error(e);
        }
      }
      this._addBlock(block);
      return acc;
    }, []);
    this.addEdges(allEdges);
  }

  findBlock(key: string, value: string | number): BookBlock<IBookBlock> | undefined {
    return this.blocks.find((block) => block.hasProperty(key, value));
  }

  // returns an array of the blocks of a specific type. the specific use cases i'm building for right now are 1) "spark", 2) "book" and 3) "section" (chapters are the only section right now...)
  getBlocks(type: BaseBlockTypes, includeEdges = false): BookBlock<IBookBlock>[] {
    const blocks = this.blocks.filter((block) => block.type === type);

    if (!includeEdges) return blocks;

    return this._addEdgesToBlocks(blocks);
  }

  getAllBlocks(): BookBlock<IBookBlock>[] {
    return this.blocks.map((block) => this._addEdgesToBlock(block));
  }

  private _addEdgesToBlocks(blocks: BookBlock<IBookBlock>[]): BookBlock<IBookBlock>[] {
    return blocks.map((block) => this._addEdgesToBlock(block));
  }

  private _addEdgesToBlock(block: BookBlock<IBookBlock>): BookBlock<IBookBlock> {
    // I'm dealing with some memory location reference v. value issues here.
    // This is working for my current use case, but it may create unforeseen consequences.
    // The current use case is I'm trying to create the branch of the tree, and in the process it keeps adding the edges to the blocks when i retrieve them.
    // Keep an eye on this.
    const blockJSON = block.getBlockJSON();
    blockJSON.edges = this.getBlockEdges(block.id);
    return new BookBlock<IBookBlock>(blockJSON);
  }

  // returns an array of all the blocks in a specific branch
  // This currently doesn't discriminate by edges at all. For instance, it assumes the edge type doesn't matter, and that the branches are all directional.
  getOmnigraphBranch(id: ID, edgeTypes: IBookBlockRelationTypes[] = []): Omnigraph {
    const travelTree = (branchId: ID, blocks: BookBlock<IBookBlock>[] = [], depth = 0): BookBlock<IBookBlock>[] => {
      const block = this.getBlockById(branchId, edgeTypes);

      if (!block) return [];

      const idx = blocks.findIndex((b) => b.id === block.id);
      if (idx > -1) {
        return blocks;
      }
      blocks.push(block);
      return block.edges.reduce((acc: BookBlock<IBookBlock>[], edge) => travelTree(edge.block_b_id, acc, depth + 1), blocks);
    };

    const blocks = travelTree(id);
    const branch = new Omnigraph(blocks, id);
    return branch;
  }

  getRenderBlocks(id: ID, edgeTypes: IBookBlockRelationTypes[] = [], order = 0, { pastIds }: { pastIds?: string[] } = {}): IRenderBlock {
    const block = this.getBlockById(id, edgeTypes) as BookBlock<IBookBlock>;
    // Deck export is infinite looping on the same block. This is a temporary fix to prevent that. I don't know why it's happening in deck export but not on the blocks table.
    pastIds ||= [];
    if (pastIds.includes(block.id)) {
      return {
        block,
        children: [],
        order,
      };
    }

    pastIds.push(block.id);
    const children = block.edges.map((edge: IBookBlockRelationship) => this.getRenderBlocks(edge.block_b_id, edgeTypes, order++, { pastIds }));
    return {
      block,
      children,
      order,
    };
  }

  removeBlock(id: ID): void {
    this._blocks.delete(id);
    // find edges with the block id and remove them
    this._edges.forEach((edge) => {
      if (edge.block_a_id === id || edge.block_b_id === id) {
        this._edges.delete(edge.id);
      }
    });
  }

  removeEdge(id: ID): void {
    this._edges.delete(id);
  }

  // takes a block, traverses up the tree to where the current parent is, backs off one layer, and then maps that block to the new parent
  remapParent(blockId: ID, currentParentId: ID, newParentId: ID): void {
    // Recursive function to find the immediate parent block that directly points to the current parent
    const findAndUpdateParent = (id: ID, parentId: ID) => {
      const edges = this.getBlockEdges(blockId, [], false).filter((edge) => edge.block_b_id === blockId);
      for (const edge of edges) {
        if (edge.block_b_id === id && edge.is_directional) {
          if (edge.block_a_id === parentId) {
            // Found the direct parent that needs to be changed
            edge.block_a_id = newParentId;

            return true;
          }
          // Recursive call to move up the parent chain
          if (findAndUpdateParent(edge.block_a_id, parentId)) {
            return true;
          }
        }
      }
      return false;
    };

    // Start the recursive search from the current block
    if (!findAndUpdateParent(blockId, currentParentId)) {
      // console.error('No parent relationship found for the specified current parent ID');
    }
  }

  updateEdge(id: ID, edge: IBookBlockRelationship): void {
    if (!this._edges.has(id)) {
      throw new Error(`Edge with id ${id} does not exist—unable to update`);
    }

    this._edges.set(id, edge);
  }

  getEntityBlocks(): BookBlock<IBookBlock>[] {
    const isBNFEntity = (type: IBookBlockType): boolean => Object.values(BNFEntityTypes).includes(type as BNFEntityTypes);
    const entityBlocks = this.blocks.filter((b: BookBlock<IBookBlock>) => isBNFEntity(b.type));

    return entityBlocks;
    // console.log(entityBlocks);

    // return [];
  }

  // returns a specific block when provided an ID
  getBlockById(id: ID, includeEdges: boolean | IBookBlockRelationTypes[] = false): BookBlock<IBookBlock> | undefined {
    const block = this._blocks.get(id);
    if (!block) {
      throw new Error(`Could not find block with id ${id}`);
    }

    if (typeof includeEdges === 'boolean' && !includeEdges) return block;

    const edges = this.getBlockEdges(block.id, includeEdges);
    block.addEdges(edges);

    return block;
  }

  updateBlock(block: BookBlock<IBookBlock>): void {
    if (!this._blocks.has(block.id)) {
      throw new Error(`Block with id ${block.id} does not exist—unable to update`);
    }

    if (block.edges) {
      block.clearEdges();
    }

    this._blocks.set(block.id, block);
  }

  // includeEdges. These are the edges that should be included in the response. If no value is provided, then all edges are included.
  getBlockEdges(id: ID, includeEdges: boolean | IBookBlockRelationTypes[] = [], onlyDirectional = true): IBookBlockRelationship[] {
    return (
      this.edges
        // check if the edge type is included to be filtered
        .filter((edge) => (Array.isArray(includeEdges) && includeEdges.length > 0 ? includeEdges.includes(edge.type) : true))
        // find edges that relate to the block in question
        .filter((edge) => edge.block_a_id === id || edge.block_b_id === id)
        // check if the edges are directional
        .filter((edge) => {
          if (edge.is_directional && onlyDirectional) {
            return edge.block_a_id === id;
          }

          return true;
        })
        .sort((a: IBookBlockRelationship, b: IBookBlockRelationship) => {
          if (a.data && isNumeric(a.data?.order) && b.data && isNumeric(b.data?.order)) {
            return Number(a.data.order) - Number(b.data.order);
          }
          return 0;
        })
    );
  }

  getPlainText(id: ID, join = '\n\n'): string {
    const sortedBlocks = this.getBranchBlocks(id);

    return sortedBlocks
      .filter((block) => block.type === BaseBlockTypes.TEXT)
      .map((block) => block.getPlainText(join))
      .join(join)
      .trim();
  }

  // find the branch of a tree that starts with the provided block ID. Retrieves all the related blocks, and sorts them by their order property
  getBranchBlocks(id: ID): BookBlock<IBookBlock>[] {
    const branch = this.getOmnigraphBranch(id);

    // recursive function to sort the blocks. Maybe make this a static method on the omnigraph class?
    const sortGraph = (graphId: ID, graph: Omnigraph, result: BookBlock<IBookBlock>[] = []): BookBlock<IBookBlock>[] => {
      const block = graph.getBlockById(graphId, true);
      if (!block) {
        return [];
      }
      result.push(block);
      return block.edges.reduce((acc: BookBlock<IBookBlock>[], edge: IBookBlockRelationship) => sortGraph(edge.block_b_id, graph, acc), result);
    };

    // sort the branch
    const sortedGraph = sortGraph(id, branch);

    return sortedGraph;
  }

  getNumberedTextBlocks(blockId: ID): { text: string; index: number; blockId: ID }[] {
    const branch = this.getOmnigraphBranch(blockId, [IBookBlockRelationships.BOOK_HAS_BOOK_BLOCK]);
    const numberedBlocks = branch
      .getBranchBlocks(blockId)
      .filter((block) => block.getPlainText().length > 0)
      .map((block: BookBlock<IBookBlock>, index: number) => ({
        text: block.getPlainText(),
        blockId: block.id,
        index,
      }));
    return numberedBlocks;
  }

  // Merges a branch into the current graph. If a rootBlock is provided, a relationship will be established between the entry block of the incoming branch and the rootBlock in the current graph
  mergeBranch(branch: Omnigraph, rootBlock?: { id: ID; relationship: IBookBlockRelationships; addOrder: boolean }): void {
    const entryBlock = branch.entryBlockId;

    if (rootBlock && !entryBlock) {
      throw new Error('Cannot set a root block if the incoming branch does not include an entryBlock');
    }

    const blocks = branch.blocks;
    const edges = branch.edges;

    this.addBlocks(blocks);
    this.addEdges(edges);

    if (rootBlock && entryBlock) {
      const edge: Omit<IBookBlockRelationship, 'id'> = {
        block_a_id: rootBlock.id,
        block_b_id: entryBlock as ID,
        type: rootBlock.relationship,
        is_directional: true,
      };

      if (rootBlock.addOrder) {
        edge.data = {
          order: this._getLastOrderValue(rootBlock.id) + 1,
        };
      }

      this.createEdge(edge);
    }
  }

  private _getLastOrderValue(id: ID): number {
    const edges = this.getBlockEdges(id, [IBookBlockRelationships.BOOK_HAS_BOOK_BLOCK]);
    return edges.reduce((acc, edge) => {
      if (edge.data && isNumeric(edge.data.order)) {
        return Math.max(acc, edge?.data.order as number);
      }
      return acc;
    }, 0);
  }

  // Returns a collection of JSON IBookBlocks with their edges attached
  get rawBookBlocksWithEdges(): IBookBlock[] {
    // @ts-expect-error i've spent way too long trying to figure this out. ignoring for the time being.
    return this.rawBookBlocks.map((block) => {
      const edges = this.getBlockEdges(block.id);
      return {
        ...block,
        edges,
      };
    });
  }

  get rawBookBlocks(): Omit<IBookBlock, 'edges'>[] {
    return this.blocks.map((block) => block.getBlockJSON());
  }

  // Returns an array of BookBlock objects
  get blocks(): BookBlock<IBookBlock>[] {
    const blocks = this._blocks.values();
    return [...blocks];
  }

  get edges(): IBookBlockRelationship[] {
    return [...this._edges.values()];
  }

  get entryBlockId(): ID | undefined {
    return this._entryBlockId;
  }

  get sparkType(): string | undefined {
    return this.getBlockById(this.entryBlockId as string)?.properties.spark_type;
  }

  get rawGraph(): IOmniGraph {
    return {
      blocks: this.rawBookBlocks,
      edges: this.edges,
      entryBlockId: this.entryBlockId,
    };
  }
}
