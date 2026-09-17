import { describe, expect, test } from "bun:test";
import { assertNonEmpty, assertValidSlug, ValidationError } from "./validation";

describe("assertNonEmpty", () => {
  test("passes for a non-empty string", () => {
    expect(() => assertNonEmpty("hello", "title")).not.toThrow();
  });

  test("throws ValidationError for an empty string", () => {
    expect(() => assertNonEmpty("", "title")).toThrow(ValidationError);
  });

  test("throws ValidationError for a whitespace-only string", () => {
    expect(() => assertNonEmpty("   ", "title")).toThrow(ValidationError);
  });
});

describe("assertValidSlug", () => {
  test("passes for a valid slug", () => {
    expect(() => assertValidSlug("engineering-docs")).not.toThrow();
  });

  test("throws ValidationError for uppercase letters", () => {
    expect(() => assertValidSlug("Engineering-Docs")).toThrow(ValidationError);
  });

  test("throws ValidationError for spaces", () => {
    expect(() => assertValidSlug("engineering docs")).toThrow(ValidationError);
  });

  test("throws ValidationError for special characters", () => {
    expect(() => assertValidSlug("engineering_docs!")).toThrow(ValidationError);
  });
});