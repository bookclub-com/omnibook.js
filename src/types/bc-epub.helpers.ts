import * as convert from 'xml-js';
import { BookBlock } from '../book-block';
import { Omnigraph } from '../omnigraph';
import { ITocElement } from './bc-epub.types';
import {
  BaseBlockTypes,
  BlockTextSizes,
  IBlockTextSize,
  IBookBlock,
  IBookBlockRelationships,
  IBookBlockType,
  IBuildBookBlock,
  IFigureBlock,
  IImageBlock,
  IListItemBlock,
  IOrderedListBlock,
  ISectionBlock,
  ISparkBlock,
  ITableBlock,
  ITableCellBlock,
  ITableRowBlock,
  ITextBlock,
  IUnorderedListBlock,
  SlideTypes,
} from './omnibook.types';
import { makeFilenameSafe } from './utils';

export type IBlockBuilder = (opts: BlockMappingOpts) => BookBlock<IBookBlock>;

const extractSectionBlock: IBlockBuilder = (opts: BlockMappingOpts): BookBlock<ISectionBlock> => {
  const { book_hash, properties, format } = opts;

  const text = opts.element.attributes?.label as string;
  const params: IBuildBookBlock = {
    book_hash,
    properties: {
      ...properties,
      epub_id: opts.element.attributes?.['epub-id'] as string,
      text: text ? [text] : [],
      href: opts.element.attributes?.href as string,
      anchor: opts.element.attributes?.id as string,
      slide_type: opts.element.attributes?.['slide-type'] as SlideTypes,
    },
    format,
    type: BaseBlockTypes.SECTION,
  };

  return BookBlock.buildBlock(params);
};

const getFileNameFromElement = (element: ITocElement, onlyImgSrc = true): string[] => {
  let src: string;
  if (element.attributes?.src) {
    src = element.attributes.src;
  } else if (element.attributes?.href) {
    src = element.attributes.href;
  } else if (element.attributes?.['xlink:href']) {
    src = element.attributes['xlink:href'];
  } else {
    const message = `Unable to find a source path for the image`;
    console.error(message);
    throw new Error(message);
  }

  const parts: string[] = src.split('/').filter((part) => part.length > 0);

  if (onlyImgSrc) {
    return [parts.pop() as string];
  } else {
    return parts;
  }
  // if (parseImageSrc) {
  //   return src.split('/').pop() as string;
  // } else {
  //   return src;
  // }
};

const getTextFromElement = (element: ITocElement): string[] =>
  (element.elements || []).map((el) => {
    if (el.type !== 'text') {
      const message = `element is not text`;
      console.error(message, JSON.stringify(element, null, 2), el);
      throw new Error(message);
    }
    return (el.text || '').replace(/\s+/g, ' ').trim();
  });

const extractTextBlock: IBlockBuilder = (opts: BlockMappingOpts): BookBlock<ITextBlock> => {
  const text = getTextFromElement(opts.element);
  const textSize = getTextSize(opts.element);

  const { book_hash, type } = opts;

  const params: IBuildBookBlock = {
    book_hash,
    type,
    properties: {
      text,
    },
    format: {
      text_size: textSize,
    },
  };
  return BookBlock.buildBlock(params);
};

const extractImageBlock: IBlockBuilder = (opts: BlockMappingOpts): BookBlock<IImageBlock> => {
  const fileName: string[] = getFileNameFromElement(opts.element, opts.onlyImgSrc);
  fileName[fileName.length - 1] = makeFilenameSafe(fileName[fileName.length - 1]);

  const { book_hash, properties, format, type } = opts;

  const params: IBuildBookBlock = {
    type,
    book_hash,
    properties: {
      ...properties,
      source: fileName,
    },
    format,
  };

  return BookBlock.buildBlock(params);
};

const extractOrderedListBlock: IBlockBuilder = (opts: BlockMappingOpts): BookBlock<IOrderedListBlock> => {
  const { book_hash, properties, format, type } = opts;
  const params: IBuildBookBlock = {
    book_hash,
    properties,
    format,
    type,
  };

  return BookBlock.buildBlock(params);
};

const extractListItemBlock: IBlockBuilder = (opts: BlockMappingOpts): BookBlock<IListItemBlock> => {
  const { book_hash, properties, format, type } = opts;
  const params: IBuildBookBlock = {
    book_hash,
    properties,
    format,
    type,
  };

  return BookBlock.buildBlock(params);
};

const extractFigureBlock: IBlockBuilder = (opts: BlockMappingOpts): BookBlock<IFigureBlock> => {
  const { book_hash, properties, format, type } = opts;
  const params: IBuildBookBlock = {
    book_hash,
    properties,
    format,
    type,
  };

  return BookBlock.buildBlock(params);
};

const extractUnorderedListBlock: IBlockBuilder = (opts: BlockMappingOpts): BookBlock<IUnorderedListBlock> => {
  const { book_hash, properties, format, type } = opts;
  const params: IBuildBookBlock = {
    book_hash,
    properties,
    format,
    type,
  };

  return BookBlock.buildBlock(params);
};

const extractTableBlock: IBlockBuilder = (opts: BlockMappingOpts): BookBlock<ITableBlock> => {
  const { book_hash, properties, format, type } = opts;
  const params: IBuildBookBlock = {
    book_hash,
    properties,
    format,
    type,
  };

  return BookBlock.buildBlock(params);
};

const extractTableRowBlock: IBlockBuilder = (opts: BlockMappingOpts): BookBlock<ITableRowBlock> => {
  const { book_hash, properties, format, type } = opts;
  const params: IBuildBookBlock = {
    book_hash,
    properties,
    format,
    type,
  };

  return BookBlock.buildBlock(params);
};

const extractTableCellBlock: IBlockBuilder = (opts: BlockMappingOpts): BookBlock<ITableCellBlock> => {
  const { book_hash, properties, format, type } = opts;
  const params: IBuildBookBlock = {
    book_hash,
    properties,
    format,
    type,
  };

  return BookBlock.buildBlock(params);
};

const extractSparkBlock: IBlockBuilder = (opts: BlockMappingOpts): BookBlock<ISparkBlock> => {
  const { book_hash, properties, type } = opts;
  const params: IBuildBookBlock = {
    book_hash,
    properties,
    type,
  };

  return BookBlock.buildBlock(params);
};

const extractBookBlock: IBlockBuilder = (opts: BlockMappingOpts): BookBlock<IBookBlock> => {
  const { book_hash, properties, type } = opts;
  const params: IBuildBookBlock = {
    book_hash,
    properties,
    type,
  };

  return BookBlock.buildBlock(params);
};

// // Determines the size of the text block in an element
const getTextSize = (element: ITocElement): IBlockTextSize => {
  if (element?.attributes && element.attributes['text-block-size']) {
    return element.attributes['text-block-size'] as IBlockTextSize;
  } else {
    switch (element.name) {
      case 'h1':
        return BlockTextSizes.HEADER;
      case 'h2':
        return BlockTextSizes.SUB_HEADER;
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        return BlockTextSizes.SUB_SUB_HEADER;
      // If we have elements that only contain text, and we can't identify a specific style, then those elements should be treated as a regular text block
      case 'p':
      case 'body':
      case 'li':
      case 'td':
      case 'caption':
        return BlockTextSizes.TEXT;
      default:
        { const message = `${element.name} is not a text block`;
        console.error(message, JSON.stringify(element, null, 2));
        throw new Error(message); }
    }
  }
};

// export interface BlockMappingOpts {
export type BlockMappingOpts = IBuildBookBlock & {
  // Element being mapped to a block
  element: ITocElement;
  onlyImgSrc?: boolean;
};

const isImgElement = (element: ITocElement): boolean =>
  (element.elements || []).reduce((acc: boolean, child: ITocElement) => {
    if (child.name === 'img' || child.name === 'image') {
      acc = true;
    }
    return acc;
  }, false);

const shouldFlatten = (element: ITocElement): boolean => {
  // i'm moving this up, as there have been multiple elements that are img elements that are not being caught
  // previously it was sitting under h1, and I've had some h3 as well. Hopefully this logic doesn't break anything
  // if (isImgElement(element)) {
  //   return true;
  // }

  switch (element.name) {
    // These are elements that should be converted to blocks
    case 'p':
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
      if (isImgElement(element)) {
        return true;
      }
    // eslint-disable-next-line no-fallthrough
    case 'h5':
    case 'h6':
    case 'body':
    case 'caption':
    case 'li':
    case 'ol':
    case 'ul':
    case 'figure':
    case 'table':
    case 'colgroup':
    case 'td':
    case 'tr':
    case 'bc-section':
      return false;
    case 'code':
    case 'blockquote':
    case 'i':
    case 'strong':
    case 'small':
    case 'span':
    case 'div':
    case 'a':
    case 'b':
    case 'u':
    case 'figcaption':
    case 'col':
    case 'q':
    case 'tbody':
    case 'th':
    case 'thead':
    case 'em':
    case 'svg':
    case 'sup':
    case 'sub':
    case 'aside':
    case 'section':
    case 'nav':
    case 's':
    case 'header':
    case 'cite':
    case 'dt':
    case 'dd':
    case 'dl':
    case 'big':
    case 'hgroup':
      return true;
    default:
      { const message = `'${element.name}' not implemented to clean and flatten`;
      console.error(message, JSON.stringify(element, null, 2));
      throw new Error(message); }
  }
};

const isLeafElement = (element: ITocElement): boolean => {
  let result = false;
  if (element.type === 'text') {
    result = true;
  }
  if (element.name === 'img' || element.name === 'image') {
    result = true;
  }

  return result;
};

export const convertHtmlToJson = (html: string) => JSON.parse(convert.xml2json(html, { compact: false, spaces: 2 }));

export const cleanAndFlattenJson = (element: ITocElement): ITocElement[] => {
  if (isLeafElement(element)) {
    return [element];
  }

  if (element.elements?.length) {
    const children = element.elements
      // 1. flattens child elements
      .reduce((acc: ITocElement[], child: ITocElement) => {
        const cleaned = cleanAndFlattenJson(child);
        acc.push(...cleaned);
        return acc;
      }, [])
      // 2. combines sibling text elements
      .reduce((acc: ITocElement[], child: ITocElement) => {
        if (acc.length === 0) {
          acc.push(child);
        } else {
          const last = acc[acc.length - 1];
          if (last.type === 'text' && child.type === 'text') {
            const lastText = last.text || '';
            const childText = child.text?.trim();
            // last.text = lastText + child.text;
            last.text = `${lastText} ${childText}`.trim();
            acc[acc.length - 1] = last;
          } else {
            acc.push(child);
          }
        }
        return acc;
      }, []);

    // if there are no children text elements, then the container adds nothing to the tree
    if (children.length === 0) {
      return [];
    }

    element.elements = children;

    if (shouldFlatten(element)) {
      return children;
    } else {
      return [element];
    }
  } else {
    return [];
  }
};

const getBlockType = (element: ITocElement): IBookBlockType => {
  switch (element.name) {
    case 'td':
      return BaseBlockTypes.TABLE_CELL;
    case 'tr':
      return BaseBlockTypes.TABLE_ROW;
    case 'table':
      return BaseBlockTypes.TABLE;
    case 'img':
    case 'image':
      return BaseBlockTypes.IMAGE;
    case 'ol':
      return BaseBlockTypes.ORDERED_LIST;
    case 'li':
      return BaseBlockTypes.LIST_ITEM;
    case 'ul':
      return BaseBlockTypes.UNORDERED_LIST;
    case 'body':
    // with the introduction of the bc-section element, we should no longer have body elements. It's not that we can't handle it, but I've commandeered this element for the bc-section,
    // so if there's a scenario where we need to handle body elements, we're going to need to handle that manually
    // throw new Error('Disallowed block type');
    // eslint-disable-next-line no-fallthrough
    case 'bc-section':
      return BaseBlockTypes.SECTION;
    case 'figure':
      return BaseBlockTypes.FIGURE;
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
    case 'p':
    case 'caption':
      return BaseBlockTypes.TEXT;
    default:
      { const message = `'${element.name}' not a known block type`;
      console.error(message, JSON.stringify(element, null, 2));
      throw new Error(message); }
  }
};

const extractBlock = (opts: BlockMappingOpts): BookBlock<IBookBlock> => {
  switch (opts.type) {
    case BaseBlockTypes.TEXT:
      return extractTextBlock(opts);
    case BaseBlockTypes.SECTION:
      return extractSectionBlock(opts);
    case BaseBlockTypes.IMAGE:
      return extractImageBlock(opts);
    case BaseBlockTypes.ORDERED_LIST:
      return extractOrderedListBlock(opts);
    case BaseBlockTypes.LIST_ITEM:
      return extractListItemBlock(opts);
    case BaseBlockTypes.FIGURE:
      return extractFigureBlock(opts);
    case BaseBlockTypes.UNORDERED_LIST:
      return extractUnorderedListBlock(opts);
    case BaseBlockTypes.TABLE:
      return extractTableBlock(opts);
    case BaseBlockTypes.TABLE_ROW:
      return extractTableRowBlock(opts);
    case BaseBlockTypes.TABLE_CELL:
      return extractTableCellBlock(opts);
    case BaseBlockTypes.SPARK:
      return extractSparkBlock(opts);
    case BaseBlockTypes.BOOK:
      return extractBookBlock(opts);
    default:
      { const message = `'${opts.type}' block extraction not yet implemented`;
      console.error(message);
      throw new Error(message); }
  }
};

const mapChildElementToBlocks = (opts: BlockMappingOpts, graph: Omnigraph, defaultRelationship = IBookBlockRelationships.BOOK_HAS_BOOK_BLOCK): BookBlock<IBookBlock>[] => {
  const { book_hash } = opts;

  return (opts.element?.elements || []).reduce((blocks: BookBlock<IBookBlock>[], child: ITocElement, _idx: number) => {
    let options: BlockMappingOpts;
    if (child.type === 'text') {
      options = {
        type: BaseBlockTypes.TEXT,
        book_hash,
        // need to recreate what a parent element for the text could look like
        element: {
          type: 'element',
          attributes: {
            'text-block-size': BlockTextSizes.TEXT,
          },
          elements: [child],
        },
        onlyImgSrc: opts.onlyImgSrc,
      };
    } else {
      options = {
        type: getBlockType(child),
        book_hash,
        element: child,
        onlyImgSrc: opts.onlyImgSrc,
      };
    }
    const block = mapElementToBlock(options, graph, defaultRelationship);

    if (block) {
      blocks.push(block);
    }
    return blocks;
  }, []);
};

export const createBookBlockBlockEdges = (
  mainBlock: BookBlock<IBookBlock>,
  blocks: BookBlock<IBookBlock>[],
  omni: Omnigraph,
  defaultRelationship = IBookBlockRelationships.BOOK_HAS_BOOK_BLOCK,
): void => {
  for (let i = 0; i < blocks.length; i++) {
    omni.createEdge({
      block_a_id: mainBlock.id,
      block_b_id: blocks[i].id,
      type: defaultRelationship,
      is_directional: true,
      data: {
        order: i,
      },
    });
  }
};

export const mapElementToBlock = (opts: BlockMappingOpts, omni: Omnigraph, defaultRelationship = IBookBlockRelationships.BOOK_HAS_BOOK_BLOCK): BookBlock<IBookBlock> => {
  const block: BookBlock<IBookBlock> = extractBlock(opts);
  omni.addBlocks([block]);

  let blocks: BookBlock<IBookBlock>[];
  if (opts.type !== BaseBlockTypes.TEXT) {
    blocks = mapChildElementToBlocks(opts, omni, defaultRelationship);
    createBookBlockBlockEdges(block, blocks, omni, defaultRelationship);
  }

  return block;
};
