import { SlideParts, SlideTypes } from './omnibook.types';

export type HtmlElements =
  | 'navLabel'
  | 'content'
  | 'text'
  | 'navPoint'
  | 'navMap'
  | 'rootfile'
  | 'metadata'
  | 'meta'
  | 'item'
  | 'li'
  | 'ol'
  | 'ul'
  | 'blockquote'
  | 'a'
  | 'div'
  | 'b'
  | 'q'
  | 'strong'
  | 'i'
  | 'small'
  | 'p'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'body'
  | 'figcaption'
  | 'figure'
  | 'img'
  | 'image'
  | 'svg'
  | 'table'
  | 'col'
  | 'colgroup'
  | 'td'
  | 'tr'
  | 'th'
  | 'tbody'
  | 'thead'
  | 'code'
  | 'em'
  | 'sup'
  | 'sub'
  | 'aside'
  | 'section'
  | 'caption'
  | 'nav'
  | 's'
  | 'u'
  | 'dt'
  | 'dd'
  | 'dl'
  | 'header'
  | 'cite'
  | 'span'
  | 'big'
  | 'hgroup'
  | 'package'
  | 'bc-section';

interface ITocElementAttrs {
  'full-path'?: string;
  toc?: string;
  version?: string;
  idref?: string;
  href?: string;
  src?: string;
  id?: string;
  class?: string;
  'media-type'?: string;
  content?: string;
  refines?: string;
  'text-block-size'?: string;
  'xlink:href'?: string;
  // attributes i'm adding manually to th `bc-section` element
  'epub-id'?: string;
  label?: string;
  'slide-part'?: SlideParts;
  'slide-type'?: SlideTypes;
}
export interface ITocElement {
  type: 'element' | 'text';
  name?: HtmlElements;
  elements?: ITocElement[];
  text?: string;
  // attributes?: Record<string, string>;
  attributes?: ITocElementAttrs;
}

export interface IBCEpubSpine extends ITocElement {
  attributes: {
    idref: string;
    toc: string;
    linear?: 'yes' | 'no';
  };
  elements: IBCEpubSpine[];
}

export interface IBCEpubManifest extends ITocElement {
  elements: ITocElement[];
}

export interface IBookImage {
  file: Buffer;
  path: string;
  opts: {
    contentType: string;
  };
}

export const navItemTypes = [
  'chapter',
  'part',
  'section',
  'preface',
  'prologue',
  'introduction',
  'interlude',
  'conclusion',
  'about-the-author',
  'epilogue',
  'appendix',
  'bibliography',
  'afterward',
  'other',
];
export type INavItemTypes = (typeof navItemTypes)[number];

export enum MatterTypes {
  FRONT = 'front',
  BODY = 'body',
  BACK = 'back',
}

export enum CoreConceptVals {
  YES = 'yes',
  INHERIT = 'inherit',
  IGNORE = 'ignore',
}
export interface INavItem {
  // The id of the item as identified in the epub
  epub_id?: string;
  // The sequence of the item in the book
  order: number;
  // The depth of the item. i.e. a part would be 0, a chapter would be 1, a subchapter would be 2, etc.
  level: number;
  // The label of the item from the epub
  label: string;
  // The title of the item. This should not include the type of any sort (i.e. remove "Chapter", "Part", or any identifying numbers or letters)
  title?: string;
  // // The location of the item in the epub
  href: string;
  // The full href of the item in the epub
  fullHref: string;
  // anchor element from the href
  anchor?: string;
  // The general location of the content in the book. i.e. front, back, body
  matter?: MatterTypes;
  // If the type has a identifier, like 2 in "Chapter 2", or A in "Appendix A"
  identifier?: string;
  // dictates whether a navigational item is a core concept or not. Sparks and entities are generated with core_concepts at...their core
  isCoreConcept?: CoreConceptVals;
}
