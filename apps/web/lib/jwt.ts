import jwt from 'jsonwebtoken';

const JWT_SECRET =process.env.NEXTAUTH_SECRET || "" ;

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

/**
 * Sign a JWT token with user information
 */
export function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d', // Token expires in 7 days
    issuer: 'livegrams-app',
    audience: 'livegrams-users'
  });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    // Use decode first to avoid verification issues, then verify manually
    const decoded = jwt.decode(token) as JWTPayload;
    
    if (!decoded) {
      console.error('JWT token is invalid or malformed');
      return null;
    }
    
    // Check if token is expired
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      console.error('JWT token has expired');
      return null;
    }
    
    // Verify signature manually
    try {
      jwt.verify(token, JWT_SECRET);
    } catch (verifyError) {
      console.error('JWT signature verification failed:', verifyError);
      return null;
    }
    
    // Additional validation for issuer and audience
    if (decoded.iss !== 'livegrams-app' || decoded.aud !== 'livegrams-users') {
      console.error('JWT token has invalid issuer or audience');
      return null;
    }
    
    return decoded;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

/**
 * Get token from cookies
 */
export function getTokenFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(';').reduce<Record<string, string>>((acc, cookie) => {
    const [key, ...rest] = cookie.trim().split('=');
    if (!key) return acc;
    // Join rest in case value contains '='
    acc[key] = rest.join('=');
    return acc;
  }, {});

  return cookies['jwt-token'] ?? null;
}
