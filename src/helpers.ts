import { IBookBlockType, BNFEntityTypes, IBookBlockRelationTypes, IBookBlockRelationships, BaseBlockTypes } from "./types";

export const isBNFEntity = (type: IBookBlockType): type is BNFEntityTypes => Object.values(BNFEntityTypes).includes(type as BNFEntityTypes);

export const getRelationships = (type: IBookBlockType): IBookBlockRelationTypes[] => {
  if (isBNFEntity(type)) {
    return [IBookBlockRelationships.REFERENCES];
  }

  if (type === BaseBlockTypes.SPARK) {
    return [IBookBlockRelationships.HAS_BLOCK];
  }

  return [IBookBlockRelationships.BOOK_HAS_BOOK_BLOCK];
};
