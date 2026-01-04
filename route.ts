import { NextRequest, NextResponse } from 'next/server';
import { authManager } from '@/lib/auth/AuthManager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Validation
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Get client info
    const ipAddress = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Attempt login
    const result = await authManager.login(
      { username, password },
      ipAddress,
      userAgent
    );

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.message,
          authenticated: false
        },
        { status: 401 }
      );
    }

    // Set secure HTTP-only cookie for refresh token
    const response = NextResponse.json({
      success: true,
      user: result.user,
      token: result.token,
      message: result.message
    });

    // Set refresh token as HTTP-only cookie
    response.cookies.set('refresh_token', result.refreshToken!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('[Auth API] Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
