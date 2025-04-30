export interface JwtPayload {
    sub: number; // userId
    email: string;
    iat?: number; // Issued at (added by jwt)
    exp?: number; // Expiration (added by jwt)
  }