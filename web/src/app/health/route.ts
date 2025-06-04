import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Basic health check - can be extended to check database connections
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'errly-web-ui',
      version: '1.0.0',
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
