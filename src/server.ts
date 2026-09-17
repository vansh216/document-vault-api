import { createSchema, createYoga } from "graphql-yoga";
import { readFileSync } from "fs";
import { join } from "path";
import { GraphQLError } from "graphql";
import { resolvers } from "./graphql/resolvers";
import { ValidationError } from "./lib/validation";

const typeDefs = readFileSync(
  join(import.meta.dir, "graphql/schema.graphql"),
  "utf-8"
);

const schema = createSchema({
  typeDefs,
  resolvers,
});

const yoga = createYoga({
  schema,
  maskedErrors: {
    maskError(error, message) {
      const err = error instanceof Error ? error : new Error(String(error));

      // Unwrap GraphQLError to get the original thrown error, if wrapped
      const original =
        "originalError" in err && err.originalError instanceof Error
          ? err.originalError
          : err;

      if (original instanceof ValidationError) {
        return new GraphQLError(original.message, {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      return new GraphQLError(message);
    },
  },
});

Bun.serve({
  port: 4000,
  fetch: yoga.fetch,
});

console.log("🚀 Server running at http://localhost:4000/graphql");