/**
 * Database Health Check API
 * 
 * Provides comprehensive database health monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/lib/database/monitoring';
import { withSecurityHeaders } from '@/lib/security/headers';

export async function GET(request: NextRequest) {
  try {
    const health = await checkDatabaseHealth();
    
    // Determine overall status
    const allHealthy = Object.values(health).every(db => db.status === 'healthy');
    const anyDown = Object.values(health).some(db => db.status === 'down');
    
    const overallStatus = anyDown ? 'down' : allHealthy ? 'healthy' : 'degraded';
    const statusCode = overallStatus === 'down' ? 503 : overallStatus === 'degraded' ? 206 : 200;

    const response = NextResponse.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      databases: health,
      summary: {
        total: Object.keys(health).length,
        healthy: Object.values(health).filter(db => db.status === 'healthy').length,
        degraded: Object.values(health).filter(db => db.status === 'degraded').length,
        down: Object.values(health).filter(db => db.status === 'down').length,
      },
    }, { status: statusCode });

    return withSecurityHeaders(() => Promise.resolve(response))(request, { params: {} });
  } catch (error) {
    console.error('Database health check failed:', error);
    
    const response = NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    }, { status: 500 });

    return withSecurityHeaders(() => Promise.resolve(response))(request, { params: {} });
  }
}
