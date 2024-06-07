import {
  IBookBlock,
  IBookBookBlock,
  IEntityBlock,
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
} from '../types/omnibook.types';
import { BookBlock } from './../book-block';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BlockBuilder = (params: any) => BookBlock<IBookBlock>;
export const buildSparkBlock: BlockBuilder = (params: ISparkBlock): BookBlock<ISparkBlock> => new BookBlock<ISparkBlock>(params);

export const buildSectionBlock: BlockBuilder = (params: ISectionBlock): BookBlock<ISectionBlock> => new BookBlock<ISectionBlock>(params);

export const buildTextBlock: BlockBuilder = (params: ITextBlock): BookBlock<ITextBlock> => {
  if (!params.properties?.text && !params.properties.text[0]) {
    throw new Error('Text blocks require text');
  }

  if (!params.format?.text_size) {
    throw new Error('Text blocks require text size');
  }

  return new BookBlock<ITextBlock>(params);
};

export const buildOrderedListBlock: BlockBuilder = (params: IOrderedListBlock): BookBlock<IOrderedListBlock> => new BookBlock<IOrderedListBlock>(params);

export const buildUnorderedListBlock: BlockBuilder = (params: IUnorderedListBlock): BookBlock<IUnorderedListBlock> => new BookBlock<IUnorderedListBlock>(params);

export const buildListItemBlock: BlockBuilder = (params: IListItemBlock): BookBlock<IListItemBlock> => new BookBlock<IListItemBlock>(params);

export const buildFigureBlock: BlockBuilder = (params: IFigureBlock): BookBlock<IFigureBlock> => new BookBlock<IFigureBlock>(params);

export const buildImageBlock: BlockBuilder = (params: IImageBlock): BookBlock<IImageBlock> => {
  if (!params.properties?.source && !params.properties.source[0]) {
    throw new Error('Image block required a source');
  }

  return new BookBlock<IImageBlock>(params);
};

export const buildTableBlock: BlockBuilder = (params: ITableBlock): BookBlock<ITableBlock> => new BookBlock<ITableBlock>(params);

export const buildTableRowBlock: BlockBuilder = (params: ITableRowBlock): BookBlock<ITableRowBlock> => new BookBlock<ITableRowBlock>(params);

export const buildTableCellBlock: BlockBuilder = (params: ITableCellBlock): BookBlock<ITableCellBlock> => new BookBlock<ITableCellBlock>(params);

export const buildBookBookBlock: BlockBuilder = (params: IBookBookBlock) => new BookBlock<IBookBookBlock>(params);

export const buildEntityBlock: BlockBuilder = (params: IEntityBlock) => {
  if (!params.properties?.text && !params.properties.text[0]) {
    throw new Error('Entity block required text');
  }
  return new BookBlock<IEntityBlock>(params);
};
