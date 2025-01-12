export {};

declare global {
  interface CustomJwtSessionClaims {
    internal?: string;
    early_access?: string;
  }
}
