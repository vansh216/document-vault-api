import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { assertNonEmpty, assertValidSlug, ValidationError } from "../lib/validation";

export const resolvers = {
  Query: {
    collections: async () => {
      return prisma.collection.findMany({
        orderBy: { createdAt: "desc" },
      });
    },

    collection: async (_parent: unknown, args: { id: string }) => {
      return prisma.collection.findUnique({
        where: { id: args.id },
        include: { documents: true },
      });
    },
  },

  Mutation: {
    createCollection: async (
      _parent: unknown,
      args: { name: string; slug: string }
    ) => {
      assertNonEmpty(args.name, "name");
      assertValidSlug(args.slug);

      try {
        return await prisma.collection.create({
          data: {
            name: args.name,
            slug: args.slug,
          },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new ValidationError(
            `A collection with slug "${args.slug}" already exists`
          );
        }
        throw error;
      }
    },

    createDocument: async (
      _parent: unknown,
      args: {
        title: string;
        content: string;
        collectionId: string;
        tags?: string[] | null;
      }
    ) => {
      assertNonEmpty(args.title, "title");
      assertNonEmpty(args.content, "content");

      const collection = await prisma.collection.findUnique({
        where: { id: args.collectionId },
      });

      if (!collection) {
        throw new ValidationError(
          `No collection found with id "${args.collectionId}"`
        );
      }

      return prisma.document.create({
        data: {
          title: args.title,
          content: args.content,
          collectionId: args.collectionId,
          tags: args.tags ?? [],
        },
      });
    },
  },

  Collection: {
    createdAt: (parent: { createdAt: Date }) => parent.createdAt.toISOString(),
  },

  Document: {
    createdAt: (parent: { createdAt: Date }) => parent.createdAt.toISOString(),
  },
};