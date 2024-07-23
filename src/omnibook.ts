import { OutputBlockData } from '@editorjs/editorjs';
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
  SlideParts,
  SlideTypes,
  SparkTypes,
} from './types/omnibook.types';
import { CoreConceptVals, INavItem } from './types/bc-epub.types';
import { uuid } from './types/utils';
import { BookBlock } from './book-block';
import { Omnigraph } from './omnigraph';
import { IExportedBooksplanation, IExportedDeck, IExportedDeckSlide } from './booksplanation-export-structure';

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

  // Converts sparks to editorjs
  async exportBooksplanations(supabaseBaseUrl: string): Promise<IExportedBooksplanation[]> {
    const booksplanations: IExportedBooksplanation[] = [];

    for (const sparkBranch of this.getSparkBranches()) {
      switch (sparkBranch.sparkType) {
        case SparkTypes.BOOKSPLANATION:
          { if (!sparkBranch.entryBlockId) continue;

          const renderBlock = this.omnigraph.getRenderBlocks(sparkBranch.entryBlockId);
          if (renderBlock.children.length === 0) continue;

          const blocks: OutputBlockData[] = [];

          for (const child of renderBlock.children) {
            const newBlocks = child.block.toBooksplanationEditorJS();
            if (newBlocks) {
              blocks.push(...newBlocks);
            }
          }

          const sparkImageFileName = this.omnigraph.getBlockById(sparkBranch.entryBlockId)?.properties.source?.[0];

          booksplanations.push({
            bookCoverImageUrl: this.data.cover_image
              ? `${supabaseBaseUrl}/storage/v1/object/public/book_data/${this.bookHash}/${this.data.cover_image}`
              : undefined,
            bookHash: this.bookHash,
            sparkBranchId: sparkBranch.entryBlockId,
            data: {
              cover_image_theme: this.data.cover_image_theme,
              cover_image: this.data.cover_image,
              creation_date: this.data.creation_date,
              creators: this.data.creators,
              description: this.data.description,
              imprint: this.data.imprint,
              isbn: this.data.isbn,
              lcsh: this.data.lcsh,
              publisher: this.data.publisher,
              subtitle: this.data.subtitle,
              title: this.data.title,
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            description: (renderBlock.block.properties as any).summary,
            editorJS: {
              time: new Date().getTime(),
              version: '2.29.0', // How to get this from the package?
              blocks,
            },
            bookclubAiSparkImageUrl: sparkImageFileName ? `${supabaseBaseUrl}/storage/v1/object/public/spark_images/${sparkImageFileName}` : undefined,
            title: (renderBlock.block.properties.text || [])[0],
          }); 
          break;
        }
        default:
          break; // Do nothing
      }
    }
    return booksplanations;
  }

  // Converts decks to editorjs
  exportDecks = async (supabaseBaseUrl: string): Promise<IExportedDeck[]> => {
    const decks: IExportedDeck[] = [];

    this.omnigraph.rawBookBlocksWithEdges;
    for (const sparkBranch of this.getSparkBranches()) {
      if (sparkBranch.sparkType !== SparkTypes.DECK) continue;
      if (!sparkBranch.entryBlockId) continue;

      console.log("sparkBranch.entryBlockId", sparkBranch.entryBlockId);

      // This infinate loops and I can't figure out how this is different from the sparks table. It goes infinately deep looking up the same ~20 ids
      const render = this.omnigraph.getRenderBlocks(sparkBranch.entryBlockId!);
      if (render.children.length === 0) continue;

      let slides: IExportedDeckSlide[] = []
      render.children.forEach((rawSlide) => {
        const slidePart = rawSlide.block.properties.slide_part;
        if (!slidePart) {
          console.log("no slidePart for", rawSlide);
          return;
        }

        // const slideType = rawSlide.block.properties.slide_type;
        // console.log("rawSlide", rawSlide, "for", rawSlide.block.properties.slide_part, slideType)
        // if (!slideType) {
        //   console.log("no slideType for", rawSlide);
        //   return;
        // }

        const blocks = rawSlide.children.flatMap((child) => child.block.toDeckEditorJS(supabaseBaseUrl, child.children));
        if (!blocks.length) {
          console.log("no blocks for", rawSlide);
          return;
        }

        slides.push({
          slideData: {
            time: new Date().getTime(),
            version: '2.29.0', // How to get this from the package?
            blocks,
          },
          slidePart,
          slideType: SlideTypes.CONTENT,
        })
      })
      slides = slides.filter((slide) => slide) as IExportedDeckSlide[];

      console.log("turned onto slides", slides.length, slides)
      if (!slides.length) {
        console.log("Deck with no slides", sparkBranch.entryBlockId);
        continue;
      }

      // const sparkImageFileName = this.omnigraph.getBlockById(sparkBranch.entryBlockId)?.properties.source?.[0];

      decks.push({
        bookCoverImageUrl: this.data.cover_image
          ? `${supabaseBaseUrl}/storage/v1/object/public/book_data/${this.bookHash}/${this.data.cover_image}`
          : undefined,
        bookHash: this.bookHash,
        sparkBranchId: sparkBranch.entryBlockId,
        data: {
          cover_image_theme: this.data.cover_image_theme,
          cover_image: this.data.cover_image,
          creation_date: this.data.creation_date,
          creators: this.data.creators,
          description: this.data.description,
          imprint: this.data.imprint,
          isbn: this.data.isbn,
          lcsh: this.data.lcsh,
          publisher: this.data.publisher,
          subtitle: this.data.subtitle,
          title: this.data.title,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        description: (render.block.properties as any).summary,
        slides: [
          {
            slideData: {
              time: new Date().getTime(),
              version: '2.29.0', // How to get this from the package?
              blocks: [],
            },
            slidePart: SlideParts.INTRODUCTION,
            slideType: SlideTypes.COVER,
          },
          ...slides,
        ],
        // bookclubAiSparkImageUrl: sparkImageFileName ? `${supabaseBaseUrl}/storage/v1/object/public/spark_images/${sparkImageFileName}` : undefined,
        title: (render.block.properties.text || [])[0],
      });
    }
    return decks;
  };
}
