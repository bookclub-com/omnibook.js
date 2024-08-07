import {
  BaseBlockTypes,
  IBookBlock,
  IBookBlockRelationTypes,
  IBookBlockRelationships,
  ID,
  IOmnibook,
  IOmnibookData,
  ISection,
  ISectionBlock,
} from './types/omnibook.types';
import { CoreConceptVals, INavItem } from './types/bc-epub.types';
import { uuid } from './types/utils';
import { BookBlock } from './book-block';
import { Omnigraph } from './omnigraph';

const isSectionBlock = (block: IBookBlock): block is ISectionBlock => block.type === BaseBlockTypes.SECTION;

export class Omnibook {
  private _id: ID;
  private _book_hash: string;
  private _version: string;
  private _data: IOmnibookData;
  private _omnigraph: Omnigraph;
  private _book_block_id: ID;

  constructor({ id, book_hash, version, data, book_blocks, omnigraph }: IOmnibook) {
    this._id = id || uuid();
    this._book_hash = book_hash;
    this._version = version;
    this._data = data;

    // ID of the Book block (note capital "B"). This is the seed block that omnibooks require for instantiation
    const bookBlockId = (book_blocks || []).find((block) => block.type === BaseBlockTypes.BOOK)?.id;

    if (!bookBlockId)
      throw new Error('Book block required for Omnibook instantiation. None found in the provided data.');

    this._book_block_id = bookBlockId;

    if (omnigraph) {
      this._omnigraph = Omnigraph.buildGraph(omnigraph.blocks, omnigraph.edges, omnigraph.entryBlockId);
    } else {
      const blocks: BookBlock<IBookBlock>[] = (book_blocks || []).map((block: IBookBlock) => BookBlock.buildBlock(block));

      // I'm testing out this new Omnigraph class as a way to manage blocks and their relationships without having to instantiate an omnibook.
      // There are scenarios where we want to create blocks and manage their relationships, but we don't need to create an omnibook—for instance, when generating sparks
      // Sparks don't need the full omnibook, but we do want to manage the relationship between the spark book blocks.
      this._omnigraph = new Omnigraph(blocks, bookBlockId);
    }
  }

  // Public interface to convert to db storable object
  toJSON(): IOmnibook {
    return this.json;
  }

  getSparkBranches(): Omnigraph[] {
    const ids = this.omnigraph.blocks.filter((block) => block.type === BaseBlockTypes.SPARK).map((block) => block.id);
    const branches = ids.map((id: ID) => this.omnigraph.getOmnigraphBranch(id, [IBookBlockRelationships.HAS_BLOCK]));

    return branches;
  }

  getOmnigraphBranch(id: ID, edgeTypes: IBookBlockRelationTypes[] = []): Omnigraph {
    return this.omnigraph.getOmnigraphBranch(id, edgeTypes);
  }

  getSections(): ISection[] {
    if (!this.nav) {
      console.warn('No nav data found, unable to retrieve Omnibook sections');
      return [];
    }

    return this.nav.map((navItem: INavItem) => {
      const anchor = navItem.anchor;
      let block: BookBlock<IBookBlock>;
      let msg: string | undefined;

      if (anchor) {
        block = this.omnigraph.findBlock('anchor', anchor) as BookBlock<IBookBlock>;
        if (!block) {
          msg = `Could not find block with anchor "${anchor}"`;
        }
      } else {
        const epubId = navItem.epub_id;
        if (!epubId) {
          throw new Error(`No epub_id found for nav item ${navItem.title}`);
        }

        block = this.omnigraph.findBlock('epub_id', epubId) as BookBlock<IBookBlock>;

        if (!block) {
          msg = `Could not find block with epub_id "${epubId}"`;
        }
      }

      if (msg) {
        console.error(msg);
        throw new Error(msg);
      }

      return {
        ...navItem,
        block,
      };
    });
  }

  // Returns a plain text string of the entire text of the book
  getPlainText(join = '\n\n'): string {
    // find the starting point
    const bookBlockID = this.omnigraph.getBlocks(BaseBlockTypes.BOOK, true)[0]?.id;
    return this.omnigraph.getPlainText(bookBlockID, join);
    // const sortedBlocks = this.omnigraph.getBranchBlocks(bookBlock.id);

    // return sortedBlocks
    //   .filter((block) => block.type === BaseBlockTypes.TEXT)
    //   .map((block) => block.getPlainText(join)).join(join).trim();
  }

  setData(data: IOmnibookData): void {
    this._data = { ...data };
  }

  getBlockById(id: ID): BookBlock<IBookBlock> | undefined {
    return this.omnigraph.getBlockById(id);
  }

  updateBlock(block: BookBlock<IBookBlock>): void {
    this.omnigraph.updateBlock(block);
  }

  getCoreConcepts(): { navItem: INavItem; omnigraph: Omnigraph }[] {
    return this.nav
      .filter((item) => item.isCoreConcept === CoreConceptVals.YES)
      .map((navItem) => {
        return {
          navItem,
          omnigraph: this.getCoreConcept(navItem.order),
        };
      });
  }

  // takes the "order" number of a nav item as an input and returns the Omnigraph of the core concept
  getCoreConcept(order: number): Omnigraph {
    const index = this.nav.findIndex((item) => item.order === order);

    if (index === -1) {
      throw new Error(`Nav item order "${order}" not found`);
    }

    if (this.nav[index].isCoreConcept !== CoreConceptVals.YES) {
      throw new Error(`Nav item "${order}" is "${this.nav[index].isCoreConcept}", not a core concept`);
    }

    let continueLoop = true;
    let i = index;
    const conceptGroup: INavItem[] = [this.nav[index]];
    while (continueLoop && !!this.nav[i + 1]) {
      const nextItem = this.nav[i + 1];

      switch (nextItem.isCoreConcept) {
        case CoreConceptVals.YES:
          continueLoop = false;
          break;
        case CoreConceptVals.INHERIT:
          conceptGroup.push(nextItem);
          i++;
          break;
        case CoreConceptVals.IGNORE:
          i++;
          break;
      }
    }

    const navBlocks = conceptGroup.map((item) => this.getNavBlock(item));
    const branches = navBlocks.map((block: IBookBlock) => this.omnigraph.getOmnigraphBranch(block.id, [IBookBlockRelationships.BOOK_HAS_BOOK_BLOCK]));
    const omnigraph = branches.reduce((graph: Omnigraph | undefined, branch: Omnigraph) => {
      // console.log(index, graph);
      if (!graph) {
        return branch;
      }

      const blocks = graph.getBranchBlocks(graph.entryBlockId as string);
      const last = blocks[blocks.length - 1];
      graph.mergeBranch(branch, { id: last.id, relationship: IBookBlockRelationships.BOOK_HAS_BOOK_BLOCK, addOrder: true });
      return graph;
    }, undefined) as Omnigraph;

    return omnigraph;
  }

  getNavBlock(navItem: INavItem): IBookBlock {
    const anchor = navItem.anchor;
    const epubId = navItem.epub_id;
    const block = this.rawBookBlocks.find((b) => {
      if (isSectionBlock(b)) {
        if (anchor && epubId) {
          return b.properties?.anchor === anchor && b.properties.epub_id === epubId;
        } else {
          return b.properties.epub_id === epubId && !b.properties.anchor;
        }
      }
    });

    if (!block) {
      // this sholdn't happen, but if it does, I want to troubleshoot why
      throw new Error('Nav block not found');
    }

    return block;
  }

  getNavBlockByOrder(order: number): IBookBlock {
    const navItem = this.nav.find((item) => item.order === order);
    if (!navItem) {
      throw new Error(`Nav item with order "${order}" not found`);
    }

    return this.getNavBlock(navItem);
  }

  get rawBookBlocks(): IBookBlock[] {
    return this.omnigraph.rawBookBlocks as IBookBlock[];
  }

  get bookHash(): string {
    return this._book_hash;
  }

  get data(): IOmnibookData {
    return this._data;
  }

  get id(): ID {
    return this._id;
  }

  get version(): string {
    return this._version;
  }

  get omnigraph(): Omnigraph {
    return this._omnigraph;
  }

  get bookBlockId(): ID {
    return this._book_block_id;
  }

  get nav(): INavItem[] {
    return this.data.nav || [];
  }

  get json(): IOmnibook {
    return {
      id: this.id,
      book_hash: this.bookHash,
      version: this.version,
      data: this.data,
      book_blocks: this.rawBookBlocks,
      omnigraph: this.omnigraph.rawGraph,
    };
  }
}
