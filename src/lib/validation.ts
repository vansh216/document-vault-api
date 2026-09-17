const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function assertNonEmpty(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new ValidationError(`${fieldName} must not be empty`);
  }
}

export function assertValidSlug(slug: string): void {
  if (!SLUG_REGEX.test(slug)) {
    throw new ValidationError(
      `slug must be lowercase alphanumeric with hyphens only (e.g. "my-collection")`
    );
  }
}