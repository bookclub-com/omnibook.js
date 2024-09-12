import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { ID } from './omnibook.types';
import { ITocElement } from './bc-epub.types';

// Converts a string to a hash, consistently
export const hash: (str: string) => string = (str: string): string => crypto.createHash('md5').update(str).digest('hex');
export const uuid: () => ID = uuidv4;

export const findObjectByKeyValue = (array: ITocElement[], key: string, searchValue: string, isExactMatch = false, returnAllMatches = false): ITocElement[] => {
  const matches: ITocElement[] = [];
  // Function to check if the key-value pair matches
  const isMatch = (value: string) => (isExactMatch ? value === searchValue : value.toLowerCase().includes(searchValue.toLowerCase()));

  // // Recursive function to search through elements
  const searchInElement = (element: ITocElement, _parent: ITocElement | null = null): boolean => {
    // @ts-expect-error I don't know why I can't access the property with a string
    const isDirectProperty = Object.prototype.hasOwnProperty.call(element, key) && isMatch(element[key]);

    // Check if the element itself has the matching key
    if (isDirectProperty) {
      matches.push(element);
      return !returnAllMatches;
    }

    // Check other properties
    for (const prop in element) {
      if (Object.prototype.hasOwnProperty.call(element, prop)) {
        // @ts-expect-error I don't know why I can't access the property with a string
        const child = element[prop];
        if (Array.isArray(child)) {
          if (searchInElements(child, isDirectProperty ? null : element) && !returnAllMatches) {
            return true;
          }
        } else if (child && typeof child === 'object') {
          if (child[key] && isMatch(child[key])) {
            matches.push(element); // Return the current element, not the parent
            return !returnAllMatches;
          } else if (searchInElement(child, isDirectProperty ? null : element) && !returnAllMatches) {
            return true;
          }
        }
      }
    }

    return false;
  };

  // Function to iterate through an array of elements, with added parent element
  const searchInElements = (elements: ITocElement[], parent: ITocElement | null = null): boolean => {
    for (const element of elements) {
      if (searchInElement(element, parent) && !returnAllMatches) {
        return true;
      }
    }
    return false;
  };

  // Start the search
  searchInElements(array);

  // Return the results
  return matches;
};

export const makeFilenameSafe = (str: string): string => {
  // Split the filename and extension
  const parts = str.split('.');
  const extension = parts.pop();
  const filename = parts.join('.');

  // Replace special characters in the filename, excluding _, and including ~, then recombine with the extension
  return (
    filename
      .replace(/[^a-zA-Z0-9 _-]/g, '') // Keep underscore
      .replace(/ /g, '_') +
    // No need to replace ~ here, as it's already removed by the regex above
    '.' +
    extension
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dec2hex = (dec: any) => dec.toString(16).padStart(2, '0');

// Random string of lowercase letters and numbers. Url safe. Can generate strings that are too short
const randomStringInternal = (length: number) => {
  // from https://stackoverflow.com/a/27747377
  const arr = new Uint8Array(length / 2);
  window.crypto.getRandomValues(arr);
  return Array.from(arr, dec2hex).join('');
};

// Random string of lowercase letters and numbers. Url safe
export const randomString = (length: number | null | undefined) => {
  length ||= 40;
  let result = randomStringInternal(length);
  while (result.length < length) {
    result += randomStringInternal(length);
  }
  return result.slice(0, length);
};

export const isNumeric = (value: string | number | undefined): boolean => !isNaN(Number(value));
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
