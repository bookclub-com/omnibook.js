# BookClub Omnibook

## Omnibook Structure
An Omnibook is comprised of three main classes:

- The Omnibook. This is the parent container, and provides multiple methods to access it's content. Primarily, the omnibook handles metadata around the book itself, and serves as a housing for the book's "Omnigraph"
- The Omnigraph. This is a graph based structure, comprised primarily of two elements: BookBlocks (nodes) and BookBlockRelationships (edges). Every elemnt of the omnibook is just a node in the graph, and all of the edges dictate the relationships of the BookBlocks with one another.
- BookBlocks. BookBlocks represent single nodes in the graph. There is no limit to the different types of BookBlocks that could exist. Most BookBlocks serve as containers for other blocks, to help understand how the child book blocks should be used. The two "fundmantal" BookBlocks are text and images. Typically everything else just houses these two types of elements, or some variant of them. 

I highly recommend familiarizing yourself with graph theory if you are unfamiliar with how to think about this node and edge structure, as it is the fundamental building block of how the Omnibook works.