// import { BookBlock } from "../omnibook/bookblock";
// import { Omnigraph } from "../omnibook";
import { BookBlock } from '../book-block';
import { Omnigraph } from '../omnigraph';
import { INavItem } from './bc-epub.types';

export const OMNIBOOK_VERSION = '0.0.2';

// UUID
export type ID = string;

export interface IISBN {
  type: string;
  value: number;
}

export interface IOmnibookData {
  // Title of the book. If the title has multiple parts, separate as separate strings in the array
  title?: string[];
  // Subtitle for the book. If the subtitle has multiple parts, separate as separate strings in the array
  subtitle?: string[];
  // List of the creators of the book. List them by their full name, with "First Last" format. Each creator should be a separate string in the array
  creators?: string[];
  // Name of the publisher
  publisher?: string;
  // Name of the publisher imprint
  imprint?: string;
  // Brief description of the book, based on the file metadata. Should be "cut and paste" from the book. Do not create one on your own.
  description?: string[];
  // URL of the cover image.
  cover_image?: string;
  // Nav item array that provides insight to the structure of the book
  nav?: INavItem[];
  // Date when the book was created
  creation_date?: string;
  // Array of the ISBN numbers. Sometimes the book has multiple ISBN numbers depending on the format
  isbn?: IISBN[];
  // Library of congress subject headings. Describe the key subjects of the book (no punctuation)
  lcsh?: string[];
  // Description of the book's cover image and theme
  cover_image_theme?: string;
  // Genre of the book
  genre?: string;
}

export interface IOmnibook {
  id?: ID;
  book_blocks?: IBookBlock[];
  book_hash: string;
  data: IOmnibookData;
  enriched_at?: Date;
  exported_booksplanations_at?: Date;
  generated_spark_decks_at?: Date;
  indexed_entities_at?: Date;
  mongo_id?: string;
  omnigraph?: IOmniGraph;
  version: string;
}

export enum BlockTextSizes {
  TEXT = 'text',
  SUB_HEADER = 'sub_header',
  HEADER = 'header',
  SUB_SUB_HEADER = 'sub_sub_header',
}

export enum BaseBlockTypes {
  BOOK = 'book',
  TEXT = 'text',
  LIST_ITEM = 'list_item',
  ORDERED_LIST = 'ordered_list',
  UNORDERED_LIST = 'unordered_list',
  SECTION = 'section',
  FIGURE = 'figure',
  IMAGE = 'image',
  TABLE = 'table',
  TABLE_ROW = 'table_row',
  TABLE_CELL = 'table_cell',
  SPARK = 'spark',
}

export enum BNFEntityTypes {
  CORE_CONCEPT = 'core-concept',
  KEY_IDEA = 'key-idea',
  ANECDOTE = 'anecdote',
  CASE_STUDY = 'case-study',
  APPLICATION = 'application',
  TOOL = 'tool',
}

export enum BNFRelationships {
  // Relationship between a key_idea and a key_idea or core_concept
  SUPPORTS = 'supports',

  // Relationship between an anecdote and a key_idea or core_concept
  ILLUSTRATES = 'illustrates',

  // Relationship between a case_study and a key_idea or core_concept
  DEMONSTRATES = 'demonstrates',

  // Relationship between an application and a key_idea or core_concept
  GUIDES = 'guides',

  // Relationship between a tool and a key_idea or core_concept
  APPLIES = 'applies',
}

export type IBlockTextSize = BlockTextSizes;
export type IBaseBlockTypes = BaseBlockTypes;
export type IBNFEntityTypes = BNFEntityTypes;
export type IBookBlockType = IBaseBlockTypes | IBNFEntityTypes;

export enum SparkTypes {
  BOOKSPLANATION = 'booksplanation',
  DECK = 'deck',
}

export type ISparkType = SparkTypes;

export enum IBookBlockRelationships {
  // Relationship between any base book block and another base book block
  BOOK_HAS_BOOK_BLOCK = 'book_has_book_block',
  // Relationship between a section block and a spark block
  HAS_SPARK = 'has_spark',
  // Relationship between a section or book block and a core concept entity block
  HAS_CORE_CONCEPT = 'has_core_concept',
  // Relationship between an entity block and any book block types
  REFERENCES = 'references',
  // To define the relationship between a section and the entity blocks it is related to
  HAS_ENTITY = 'has_entity',
  // Relationship between any blocks
  HAS_BLOCK = 'has_block',
}

export type IBookBlockRelationTypes = IBookBlockRelationships | BNFRelationships;

export enum ITextStyles {
  BOLD = 'bold',
  ITALIC = 'italic',
  UNDERLINE = 'underline',
}

export interface ITextBlockStyling {
  index: number;
  style: ITextStyles;
}

export interface IBookBlockRelationshipData {
  order?: number;
}

export interface IBookBlockRelationship {
  id: ID;
  block_a_id: ID;
  block_b_id: ID;
  data?: IBookBlockRelationshipData;
  type: IBookBlockRelationTypes;
  // is directional determines where the edge lives. If it is directional, the edge lives with block_a. If it is not directional, the edge lives with both block_a and block_b
  is_directional: boolean;
}

export interface IBookBlockProperties {
  // If the block has text, array of the text
  // TODO: convert the text property to an object. I think the _text_ format should live with the text, NOT the block format (which is how it works right now)
  text: string[];
  // summary of the branch the block represents
  summary: string;
  // URL of images associated with the block
  source: string[];
  // type of spark
  spark_type: ISparkType;
  // original epub id the block (section) came from
  epub_id: string;
  // section book matter the block came from
  matter: 'front' | 'body' | 'back';

  href: string;

  anchor?: string;

  slide_type?: SlideTypes;
}
export interface IBookBlockFormat {
  text_size: BlockTextSizes;
  styling: ITextBlockStyling[];
}

export interface IBookBlockBase {
  // unique identifier for the block
  id: ID;
  // describes the type of block. Loosely maps back to HTML element types
  type: IBookBlockType;
  // array of relationships associated with other blocks
  edges: IBookBlockRelationship[];
  //omnibook version the block was made under
  version: string;
  // general properties of a block, can be used to store whatever is needed
  properties?: Partial<IBookBlockProperties>;
  // store formatting properties of the final rendered block
  format?: Partial<IBookBlockFormat>;
  // unique hash of the book based on the title
  book_hash: string;
  // ada embedding of the text in the block
  ada_embedding?: number[];
}

export interface BookTag {
  slug: BookBlockTags;
  display: string;
}

export enum BookBlockTags {
  SECTION = 'section',
}
export interface IBookBlockTag {
  // slug: BookBlockTags;
  book_block_id?: ID;
  slug: BookBlockTags;
  value?: string;
}

export interface ISparkBlock extends IBookBlockBase {
  type: BaseBlockTypes.SPARK;
  properties: {
    spark_type: ISparkType;
    source: string[];
    summary: string;
    text: string[];
  };
}

export interface IBookBookBlock extends IBookBlockBase {
  type: BaseBlockTypes.BOOK;
}

export interface ITableBlock extends IBookBlockBase {
  type: BaseBlockTypes.TABLE;
}

export interface ITableRowBlock extends IBookBlockBase {
  type: BaseBlockTypes.TABLE_ROW;
}

export interface ITableCellBlock extends IBookBlockBase {
  type: BaseBlockTypes.TABLE_CELL;
}

export interface IFigureBlock extends IBookBlockBase {
  type: BaseBlockTypes.FIGURE;
  properties: {
    source: string[];
  };
}

export interface IImageBlock extends IBookBlockBase {
  type: BaseBlockTypes.IMAGE;
  properties: {
    source: string[];
  };
}

export enum SlideTypes {
  COVER = 'cover',
  TITLE = 'title',
  QUOTE = 'quote',
  SECTION = 'section',
  HEADER = 'header',
}

// Book section. could be a chapter, part, appendix, etc. anything that contains the other book blocks
export interface ISectionBlock extends IBookBlockBase {
  type: BaseBlockTypes.SECTION;
  properties: {
    text: string[];
    matter: 'front' | 'body' | 'back';
    epub_id?: string;
    href?: string;
    anchor?: string;
    slide_type?: SlideTypes;
  };
}

export interface ITextBlockFormat {
  text_size: BlockTextSizes;
  styling?: ITextBlockStyling[];
}

// Block containing only text
export interface ITextBlock extends IBookBlockBase {
  type: BaseBlockTypes.TEXT;
  properties: {
    text: string[];
  };
  format: ITextBlockFormat;
}

// block that denotes a bunch of list items in an ordered fashio
export interface IOrderedListBlock extends IBookBlockBase {
  type: BaseBlockTypes.ORDERED_LIST;
}

// block that denotes an unordered list of items
export interface IUnorderedListBlock extends IBookBlockBase {
  type: BaseBlockTypes.UNORDERED_LIST;
}

// block that represents a single list item
export interface IListItemBlock extends IBookBlockBase {
  type: BaseBlockTypes.LIST_ITEM;
  properties: {
    text: string[];
  };
}

export interface IEntityBlock extends IBookBlockBase {
  type: BNFEntityTypes;
  properties: {
    text: string[];
    summary: string;
  };
}

export type IBookBlock =
  | IEntityBlock
  | ISparkBlock
  | IBookBookBlock
  | ISectionBlock
  | ITextBlock
  | IListItemBlock
  | IImageBlock
  | IFigureBlock
  | IOrderedListBlock
  | IUnorderedListBlock
  | ITableBlock
  | ITableCellBlock
  | ITableRowBlock;

// export type ISection = INavItem & { block: BookBlock<IBookBlock> };
export interface ISection extends INavItem {
  block: BookBlock<IBookBlock>;
  graph?: Omnigraph;
}

export type IBuildBookBlock = Pick<IBookBlock, 'type' | 'book_hash'> & Partial<Pick<IBookBlock, 'properties' | 'format' | 'id' | 'edges' | 'version'>>;

export interface IRenderBlock {
  block: BookBlock<IBookBlock>;
  children: IRenderBlock[];
  order?: number;
}

export interface IOmniGraph {
  blocks: Omit<IBookBlock, 'edges'>[];
  edges: IBookBlockRelationship[];
  entryBlockId: ID | undefined;
}
