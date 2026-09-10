export {};

declare global {
  // Projected from public_metadata by the session token template
  // (Clerk dashboard → Sessions). Booleans are stored unquoted, and the
  // key is absent rather than false when the flag is not granted.
  interface CustomJwtSessionClaims {
    plan?: string;
    internal?: boolean;
    early_access?: boolean;
  }
}
