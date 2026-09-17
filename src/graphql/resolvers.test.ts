import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { resolvers } from "./resolvers";
import { prisma } from "../lib/prisma";

// Clean slate before each test so tests don't interfere with each other
beforeEach(async () => {
  await prisma.document.deleteMany();
  await prisma.collection.deleteMany();
});

afterAll(async () => {
  await prisma.document.deleteMany();
  await prisma.collection.deleteMany();
  await prisma.$disconnect();
});

describe("createCollection", () => {
  test("creates a collection with valid input", async () => {
    const result = await resolvers.Mutation.createCollection(null, {
      name: "Engineering",
      slug: "engineering",
    });

    expect(result.name).toBe("Engineering");
    expect(result.slug).toBe("engineering");
  });

  test("rejects an empty name", async () => {
    await expect(
      resolvers.Mutation.createCollection(null, { name: "", slug: "valid-slug" })
    ).rejects.toThrow("name must not be empty");
  });

  test("rejects a malformed slug", async () => {
    await expect(
      resolvers.Mutation.createCollection(null, {
        name: "Test",
        slug: "Not Valid!",
      })
    ).rejects.toThrow();
  });

  test("rejects a duplicate slug", async () => {
    await resolvers.Mutation.createCollection(null, {
      name: "First",
      slug: "duplicate-slug",
    });

    await expect(
      resolvers.Mutation.createCollection(null, {
        name: "Second",
        slug: "duplicate-slug",
      })
    ).rejects.toThrow("already exists");
  });
});

describe("createDocument", () => {
  test("creates a document in an existing collection", async () => {
    const collection = await resolvers.Mutation.createCollection(null, {
      name: "Docs",
      slug: "docs",
    });

    const doc = await resolvers.Mutation.createDocument(null, {
      title: "Getting Started",
      content: "Some content",
      collectionId: collection.id,
    });

    expect(doc.title).toBe("Getting Started");
    expect(doc.collectionId).toBe(collection.id);
  });

  test("rejects a document for a nonexistent collection", async () => {
    await expect(
      resolvers.Mutation.createDocument(null, {
        title: "Test",
        content: "Test content",
        collectionId: "nonexistent-id",
      })
    ).rejects.toThrow("No collection found");
  });
});

describe("documents query", () => {
  test("filters by search substring", async () => {
    const collection = await resolvers.Mutation.createCollection(null, {
      name: "Search Test",
      slug: "search-test",
    });

    await resolvers.Mutation.createDocument(null, {
      title: "API Guide",
      content: "How to use the API",
      collectionId: collection.id,
    });
    await resolvers.Mutation.createDocument(null, {
      title: "Unrelated",
      content: "Nothing relevant here",
      collectionId: collection.id,
    });

    const result = await resolvers.Query.documents(null, { search: "API" });

    expect(result.items.length).toBe(1);
    expect(result.items[0]?.title).toBe("API Guide");
  });

  test("paginates with take and cursor", async () => {
    const collection = await resolvers.Mutation.createCollection(null, {
      name: "Pagination Test",
      slug: "pagination-test",
    });

    for (let i = 1; i <= 3; i++) {
      await resolvers.Mutation.createDocument(null, {
        title: `Doc ${i}`,
        content: `Content ${i}`,
        collectionId: collection.id,
      });
    }

    const page1 = await resolvers.Query.documents(null, { take: 2 });
    expect(page1.items.length).toBe(2);
    expect(page1.nextCursor).not.toBeNull();

    const page2 = await resolvers.Query.documents(null, {
      take: 2,
      cursor: page1.nextCursor,
    });
    expect(page2.items.length).toBe(1);
    expect(page2.nextCursor).toBeNull();
  });
});

describe("moveDocument", () => {
  test("moves a document to another collection", async () => {
    const collectionA = await resolvers.Mutation.createCollection(null, {
      name: "A",
      slug: "collection-a",
    });
    const collectionB = await resolvers.Mutation.createCollection(null, {
      name: "B",
      slug: "collection-b",
    });

    const doc = await resolvers.Mutation.createDocument(null, {
      title: "Movable Doc",
      content: "Content",
      collectionId: collectionA.id,
    });

    const moved = await resolvers.Mutation.moveDocument(null, {
      id: doc.id,
      collectionId: collectionB.id,
    });

    expect(moved.collectionId).toBe(collectionB.id);
  });
});

describe("deleteDocument", () => {
  test("deletes an existing document", async () => {
    const collection = await resolvers.Mutation.createCollection(null, {
      name: "Delete Test",
      slug: "delete-test",
    });

    const doc = await resolvers.Mutation.createDocument(null, {
      title: "To Delete",
      content: "Content",
      collectionId: collection.id,
    });

    const result = await resolvers.Mutation.deleteDocument(null, { id: doc.id });
    expect(result).toBe(true);
  });

  test("rejects deleting a nonexistent document", async () => {
    await expect(
      resolvers.Mutation.deleteDocument(null, { id: "nonexistent-id" })
    ).rejects.toThrow("No document found");
  });
});