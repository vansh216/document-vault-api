import { prisma } from "../lib/prisma";
import { assertNonEmpty, assertValidSlug } from "../lib/validation";

export const resolvers = {
  Query: {
    collections: async () => {
      return prisma.collection.findMany({
        orderBy: { createdAt: "desc" },
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

      return prisma.collection.create({
        data: {
          name: args.name,
          slug: args.slug,
        },
      });
    },
  },
};