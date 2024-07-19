import { OutputData } from '@editorjs/editorjs';

// ATTENTION! This file is intended to be project agnostic and should match exactly the same file in the ops tool project
// It should not have any dependencies on any other file in either project

interface IISBN {
  type: string;
  value: number;
}

// Same as the OmnibookData but without the 'nav' property
export interface IExportedOmnibookData {
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
  // Date when the book was created
  creation_date?: string;
  // Array of the ISBN numbers. Sometimes the book has multiple ISBN numbers depending on the format
  isbn?: IISBN[];
  // Library of congress subject headings. Describe the key subjects of the book (no punctuation)
  lcsh?: string[];
  // Description of the book's cover image and theme
  cover_image_theme?: string;
}

// This format must match exactly what is expected by the ops tool
export interface IExportedBooksplanation {
  bookCoverImageUrl?: string;
  bookHash: string;
  data: IExportedOmnibookData;
  editorJS: OutputData;
  sparkBranchId?: string;
  title: string;
  description?: string;
  bookclubAiSparkImageUrl?: string; // Only set by Bookclub AI
  sparkImageUrl?: string; // Only set by Bookclub Core
}

export interface IExportedDeckSlide {
  slideData: OutputData;
  slideHeader?: string;
  slideType: string;
}

// This format must match exactly what is expected by the ops tool
export interface IExportedDeck {
  bookCoverImageUrl?: string;
  bookHash: string;
  bookColorHct?: {
    color: number;
    light: {
      primary: string;
      primaryBackground: string;
      onPrimary: string;
      opacity: string;
      onPrimaryFixed: string;
    };
    dark: {
      primary: string;
      primaryBackground: string;
      onPrimary: string;
      opacity: string;
      onPrimaryFixed: string;
    };
  };
  data: IExportedOmnibookData;
  slides: IExportedDeckSlide[];
  sparkBranchId?: string;
  title: string;
  description?: string;
  bookclubAiSparkImageUrl?: string; // Only set by Bookclub AI
  sparkImageUrl?: string; // Only set by Bookclub Core
}
