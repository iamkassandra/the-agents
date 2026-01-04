import { NextRequest, NextResponse } from 'next/server';
import { authManager } from '@/lib/auth/AuthManager';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    username: string;
    email: string;
    role: 'admin' | 'user';
    isActive: boolean;
  };
}

// Middleware function to verify authentication
export async function verifyAuth(request: NextRequest): Promise<{
  isAuthenticated: boolean;
  user?: any;
  error?: string;
}> {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        isAuthenticated: false,
        error: 'No authentication token provided'
      };
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Validate token
    const user = await authManager.validateToken(token);
    if (!user) {
      return {
        isAuthenticated: false,
        error: 'Invalid or expired token'
      };
    }

    // Return user data without password hash
    const { passwordHash, ...safeUser } = user;

    return {
      isAuthenticated: true,
      user: safeUser
    };

  } catch (error) {
    console.error('[AuthMiddleware] Authentication error:', error);
    return {
      isAuthenticated: false,
      error: 'Authentication failed'
    };
  }
}

// High-level middleware wrapper for API routes
export function withAuth(handler: (req: AuthenticatedRequest, context?: any) => Promise<NextResponse>) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const authResult = await verifyAuth(request);

    if (!authResult.isAuthenticated) {
      return NextResponse.json(
        {
          error: authResult.error || 'Authentication required',
          authenticated: false
        },
        { status: 401 }
      );
    }

    // Add user to request object
    (request as AuthenticatedRequest).user = authResult.user;

    return handler(request as AuthenticatedRequest, context);
  };
}

// Admin-only middleware
export function withAdminAuth(handler: (req: AuthenticatedRequest, context?: any) => Promise<NextResponse>) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const authResult = await verifyAuth(request);

    if (!authResult.isAuthenticated) {
      return NextResponse.json(
        {
          error: authResult.error || 'Authentication required',
          authenticated: false
        },
        { status: 401 }
      );
    }

    // Check admin role
    if (authResult.user.role !== 'admin') {
      return NextResponse.json(
        {
          error: 'Admin access required',
          authenticated: true,
          authorized: false
        },
        { status: 403 }
      );
    }

    // Add user to request object
    (request as AuthenticatedRequest).user = authResult.user;

    return handler(request as AuthenticatedRequest, context);
  };
}

// Optional auth middleware (allows both authenticated and unauthenticated access)
export function withOptionalAuth(handler: (req: AuthenticatedRequest, context?: any) => Promise<NextResponse>) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const authResult = await verifyAuth(request);

    // Add user to request if authenticated (undefined if not)
    if (authResult.isAuthenticated) {
      (request as AuthenticatedRequest).user = authResult.user;
    }

    return handler(request as AuthenticatedRequest, context);
  };
}

// Utility function to extract token from request
export function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

// Utility function to create auth response
export function createAuthResponse(data: any, status: number = 200): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache'
    }
  });
}
