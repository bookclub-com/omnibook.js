import {
  BNFEntityTypes,
  BaseBlockTypes,
  IBookBlock,
  IBookBlockFormat,
  IBookBlockProperties,
  IBookBlockRelationTypes,
  IBookBlockRelationship,
  IBookBlockRelationshipData,
  IBookBlockType,
  IBuildBookBlock,
  ID,
  OMNIBOOK_VERSION,
} from './types/omnibook.types';
import {
  buildBookBookBlock,
  buildEntityBlock,
  buildFigureBlock,
  buildImageBlock,
  buildListItemBlock,
  buildOrderedListBlock,
  buildSectionBlock,
  buildSparkBlock,
  buildTableBlock,
  buildTableCellBlock,
  buildTableRowBlock,
  buildTextBlock,
  buildUnorderedListBlock,
} from './types/book-block.helpers';
import { isNumeric, uuid } from './types';

export class BookBlock<T extends IBookBlock> {
  private _id: ID;
  private _type: IBookBlockType;
  private _edges: Map<ID, IBookBlockRelationship> = new Map<ID, IBookBlockRelationship>();

  private _version: string;
  private _properties: Partial<IBookBlockProperties>;
  private _book_hash: string;
  private _format: Partial<IBookBlockFormat>;

  constructor({ type, id, edges, version, properties, book_hash, format }: T) {
    this._id = id || uuid();
    this._type = type;
    if (edges) {
      this.addEdges(edges);
    }
    // this._edges = !!edges ?? this.addEdges(edges);
    this._version = version || OMNIBOOK_VERSION;
    this._book_hash = book_hash;
    this._properties = properties || {};
    this._format = format || {};
  }

  hasProperty(key: string, value: unknown): boolean {
    // @ts-expect-error I don't see why I can't subscript by string
    return !!this._properties[key] && this._properties[key] === value;
  }

  static buildBlock(params: IBuildBookBlock): BookBlock<IBookBlock> {
    if (Object.values(BNFEntityTypes).includes(params.type as BNFEntityTypes)) {
      return buildEntityBlock(params);
    }

    // Each of these have a defined function for the block type to ensure the proper data is passed from the client in creating the specific block
    switch (params.type) {
      case BaseBlockTypes.SPARK:
        return buildSparkBlock(params);
      case BaseBlockTypes.TABLE_CELL:
        return buildTableCellBlock(params);
      case BaseBlockTypes.TABLE_ROW:
        return buildTableRowBlock(params);
      case BaseBlockTypes.TABLE:
        return buildTableBlock(params);
      case BaseBlockTypes.FIGURE:
        return buildFigureBlock(params);
      case BaseBlockTypes.IMAGE:
        return buildImageBlock(params);
      case BaseBlockTypes.UNORDERED_LIST:
        return buildUnorderedListBlock(params);
      case BaseBlockTypes.LIST_ITEM:
        return buildListItemBlock(params);
      case BaseBlockTypes.ORDERED_LIST:
        return buildOrderedListBlock(params);
      case BaseBlockTypes.SECTION:
        return buildSectionBlock(params);
      case BaseBlockTypes.TEXT:
        return buildTextBlock(params);
      case BaseBlockTypes.BOOK:
        return buildBookBookBlock(params);
      default:
        // This is throwing an error for no reason I can find. It is defined, and will be defined, but for some reason TS thinks it's not
        // eslint-disable-next-line no-case-declarations
        const msg = `Block type ${params.type} not supported YET`;
        console.error(msg);
        throw new Error(msg);
    }
  }

  static buildRelationship(block_a_id: ID, block_b_id: ID, type: IBookBlockRelationTypes, data: IBookBlockRelationshipData = {}, is_directional = true): IBookBlockRelationship {
    return {
      id: uuid(),
      block_a_id,
      block_b_id,
      type,
      data,
      is_directional,
    };
  }

  addEdge(edge: IBookBlockRelationship): void {
    if (!this._edges.has(edge.id)) {
      this._edges.set(edge.id, edge);
    }
  }

  addEdges(edges: IBookBlockRelationship[]): void {
    edges.forEach((edge) => this.addEdge(edge));
  }

  createEdge(blockBID: ID, type: IBookBlockRelationTypes, is_directional = true, isOrdered = true): void {
    const newEdge: IBookBlockRelationship = {
      is_directional,
      type,
      block_a_id: this.id,
      block_b_id: blockBID,
      // data: {},
      id: uuid(),
    };

    if (isOrdered) {
      const maxOrder = this.edges.reduce((acc: number, edge: IBookBlockRelationship) => (edge.data?.order ? Math.max(acc, edge.data.order) : acc), 0);
      newEdge.data = { order: maxOrder + 1 };
    }

    // this._edges.push(newEdge);
    this.addEdge(newEdge);
  }

  clearEdges(): void {
    this._edges.clear();
    // this.edges.length = 0;
  }

  getPlainText(join = '\n\n'): string {
    const text: string[] = this.getRawBlockText();

    return text.join(join).trim();
  }

  getAllText(_join = '\n\n'): string {
    throw new Error(`Need to fix 'getAllText'`);
  }

  getRawBlockText(): string[] {
    return (this.properties.text as string[]) || [];
  }

  getBlockJSON(): IBookBlock {
    // @ts-expect-error I've been trying to troubleshoot this typescript error for a long time, struggling to figure out why it's only throwing for table row blocks. Can't figure it out yet...going to ignore it for now
    return {
      id: this.id,
      type: this.type,
      edges: this.edges,
      version: this.version,
      properties: this.properties,
      book_hash: this.bookHash,
      // parent_id: this.parentId,
      // tags: this.tags,
      format: this.format,
    };
  }

  getAllBlocks(): IBookBlock[] {
    throw new Error(`Need to fix 'getAllBlocks'`);
  }

  modifyProperties(key: string, value: unknown) {
    // @ts-expect-error I don't see why its unable to subscript by string
    this._properties[key] = value;
  }

  get type(): IBookBlockType {
    return this._type;
  }

  public get properties(): Partial<IBookBlockProperties> {
    return this._properties;
  }

  get id(): ID {
    return this._id;
  }

  get edges(): IBookBlockRelationship[] {
    return [...this._edges.values()].sort((a: IBookBlockRelationship, b: IBookBlockRelationship) =>
      a.data?.order && isNumeric(a.data?.order) && isNumeric(b.data?.order) && b.data?.order ? a.data.order - b.data.order : 0,
    );
  }

  get version(): string {
    return this._version;
  }

  get bookHash(): string {
    return this._book_hash;
  }

  get format(): Partial<IBookBlockFormat> {
    return this._format;
  }
}
