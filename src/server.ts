import { createSchema, createYoga } from "graphql-yoga";

const schema = createSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      hello: String!
    }
  `,
  resolvers: {
    Query: {
      hello: () => "Hello, Document Vault!",
    },
  },
});

const yoga = createYoga({ schema });

Bun.serve({
  port: 4000,
  fetch: yoga.fetch,
});

console.log("🚀 Server running at http://localhost:4000/graphql");