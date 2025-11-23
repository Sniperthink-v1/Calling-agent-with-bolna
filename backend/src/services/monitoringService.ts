/**
 * Real-Time Monitoring Service
 * Tracks API response times, error rates, active connections, and request metrics
 * Stores metrics in-memory for fast access (resets on server restart)
 * Logs failures to database for persistent tracking
 */

import { Request, Response, NextFunction } from 'express';
import { failureLogModel } from '../models/FailureLog';

interface RequestMetric {
  timestamp: number;
  duration: number;
  statusCode: number;
  path: string;
  method: string;
  success: boolean;
}

interface FailedRequest {
  id: string;
  timestamp: number;
  path: string;
  method: string;
  statusCode: number;
  duration: number;
  errorMessage?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface ConnectionMetric {
  timestamp: number;
  userId?: string;
  active: boolean;
}

class RealTimeMonitoringService {
  private requestMetrics: RequestMetric[] = [];
  private failedRequests: FailedRequest[] = [];
  private connections: Map<string, ConnectionMetric> = new Map();
  private maxMetricsHistory = 1000; // Keep last 1000 requests
  private maxFailedRequestsHistory = 500; // Keep last 500 failed requests
  private startTime: number = Date.now();
  
  // Request counters
  private totalRequests = 0;
  private totalErrors = 0;
  private requestsPerMinute: number[] = [];
  private maxRPMHistory = 60; // Keep last 60 minutes

  /**
   * Middleware to track request metrics
   */
  trackRequest = (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const service = this;
    
    // Track request start
    service.totalRequests++;
    
    // Increment active connections
    const connectionId = `${req.ip}-${Date.now()}`;
    service.connections.set(connectionId, {
      timestamp: Date.now(),
      userId: (req as any).user?.id,
      active: true
    });

    // Capture response
    const originalSend = res.send;
    const originalJson = res.json;
    let responseBody: any = null;
    
    // Capture response body for error logging
    res.send = function (data: any): Response {
      responseBody = data;
      return originalSend.call(res, data);
    };
    
    res.json = function (data: any): Response {
      responseBody = data;
      return originalJson.call(res, data);
    };
    
    // On response finish
    res.on('finish', async () => {
      const duration = Date.now() - startTime;
      const success = res.statusCode < 400;
      
      // Record metric
      const metric: RequestMetric = {
        timestamp: Date.now(),
        duration,
        statusCode: res.statusCode,
        path: req.path,
        method: req.method,
        success
      };
      
      // Add to history
      service.requestMetrics.push(metric);
      if (service.requestMetrics.length > service.maxMetricsHistory) {
        service.requestMetrics.shift();
      }
      
      // Track errors and failed requests
      if (!success) {
        service.totalErrors++;
        
        // Extract error message from response data if available
        let errorMessage = `${res.statusCode} ${res.statusMessage || 'Error'}`;
        let errorStack: string | undefined;
        
        try {
          let parsed = responseBody;
          if (responseBody && typeof responseBody === 'string') {
            parsed = JSON.parse(responseBody);
          }
          if (parsed?.message) {
            errorMessage = parsed.message;
          }
          if (parsed?.error) {
            errorMessage = typeof parsed.error === 'string' ? parsed.error : parsed.error.message || errorMessage;
          }
          if (parsed?.stack) {
            errorStack = parsed.stack;
          }
        } catch (e) {
          // Ignore parsing errors
        }
        
        // Record failed request in memory
        const failedRequest: FailedRequest = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          path: req.path,
          method: req.method,
          statusCode: res.statusCode,
          duration,
          errorMessage,
          userId: (req as any).user?.id,
          ipAddress: req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
          userAgent: req.headers['user-agent']
        };
        
        service.failedRequests.push(failedRequest);
        if (service.failedRequests.length > service.maxFailedRequestsHistory) {
          service.failedRequests.shift();
        }
        
        // Log to database asynchronously (don't block response)
        service.logFailureToDatabase({
          endpoint: req.path,
          method: req.method,
          statusCode: res.statusCode,
          errorMessage,
          errorStack,
          requestBody: req.body,
          requestHeaders: req.headers,
          responseBody: responseBody,
          duration,
          userId: (req as any).user?.id,
          ipAddress: req.ip || req.headers['x-forwarded-for'] as string,
          userAgent: req.headers['user-agent'],
          requestId: (req as any).id || req.headers['x-request-id'] as string
        }).catch((err: Error) => {
          console.error('Failed to log error to database:', err);
        });
      }
      
      // Remove from active connections
      service.connections.delete(connectionId);
    });

    next();
  };

  /**
   * Track user session connections (for WebSocket/long-lived connections)
   */
  trackConnection(connectionId: string, userId?: string) {
    this.connections.set(connectionId, {
      timestamp: Date.now(),
      userId,
      active: true
    });
  }

  /**
   * Remove connection tracking
   */
  removeConnection(connectionId: string) {
    this.connections.delete(connectionId);
  }

  /**
   * Log failure to database (async, non-blocking)
   */
  private async logFailureToDatabase(data: {
    endpoint: string;
    method: string;
    statusCode: number;
    errorMessage?: string;
    errorStack?: string;
    requestBody?: any;
    requestHeaders?: any;
    responseBody?: any;
    duration: number;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
  }): Promise<void> {
    try {
      // Filter sensitive headers
      const sanitizedHeaders = this.sanitizeHeaders(data.requestHeaders);
      
      await failureLogModel.logFailure({
        endpoint: data.endpoint,
        method: data.method,
        statusCode: data.statusCode,
        errorMessage: data.errorMessage,
        errorStack: data.errorStack,
        requestBody: data.requestBody,
        requestHeaders: sanitizedHeaders,
        responseBody: data.responseBody,
        duration: data.duration,
        userId: data.userId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        requestId: data.requestId
      });
    } catch (error) {
      // Silent fail - don't throw errors from logging
      console.error('Database logging error:', error);
    }
  }

  /**
   * Sanitize headers to remove sensitive information
   */
  private sanitizeHeaders(headers: any): any {
    if (!headers) return {};
    
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    const sanitized = { ...headers };
    
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  /**
   * Get average API response time (last N requests)
   */
  getAverageResponseTime(lastN: number = 100): number {
    if (this.requestMetrics.length === 0) return 0;
    
    const recentMetrics = this.requestMetrics.slice(-lastN);
    const sum = recentMetrics.reduce((acc, m) => acc + m.duration, 0);
    return Math.round(sum / recentMetrics.length);
  }

  /**
   * Get P95 response time (95th percentile)
   */
  getP95ResponseTime(lastN: number = 100): number {
    if (this.requestMetrics.length === 0) return 0;
    
    const recentMetrics = this.requestMetrics.slice(-lastN);
    const sorted = recentMetrics.map(m => m.duration).sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * 0.95) - 1;
    return sorted[index] || 0;
  }

  /**
   * Get error rate (percentage of failed requests)
   */
  getErrorRate(lastN: number = 100): number {
    if (this.requestMetrics.length === 0) return 0;
    
    const recentMetrics = this.requestMetrics.slice(-lastN);
    const errors = recentMetrics.filter(m => !m.success).length;
    return Math.round((errors / recentMetrics.length) * 100 * 100) / 100; // 2 decimal places
  }

  /**
   * Get total error count
   */
  getTotalErrors(): number {
    return this.totalErrors;
  }

  /**
   * Get active connections count
   */
  getActiveConnections(): number {
    // Clean up stale connections (older than 5 minutes)
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes
    
    for (const [id, conn] of this.connections.entries()) {
      if (now - conn.timestamp > staleThreshold) {
        this.connections.delete(id);
      }
    }
    
    return this.connections.size;
  }

  /**
   * Get system uptime percentage
   */
  getUptimePercentage(): number {
    const uptimeMs = Date.now() - this.startTime;
    const uptimeHours = uptimeMs / (1000 * 60 * 60);
    
    // If uptime < 1 hour, return 100%
    if (uptimeHours < 1) return 100;
    
    // Calculate based on error rate and downtime
    // Assume 99.9% uptime target (could track actual downtime events)
    const errorImpact = Math.min(this.getErrorRate() / 10, 1); // Error rate impact
    const uptime = Math.max(99.9 - errorImpact, 95); // Floor at 95%
    
    return Math.round(uptime * 100) / 100;
  }

  /**
   * Get requests per minute (current minute)
   */
  getRequestsPerMinute(): number {
    const oneMinuteAgo = Date.now() - 60000;
    const recentRequests = this.requestMetrics.filter(m => m.timestamp >= oneMinuteAgo);
    return recentRequests.length;
  }

  /**
   * Get total request count
   */
  getTotalRequests(): number {
    return this.totalRequests;
  }

  /**
   * Get success rate
   */
  getSuccessRate(lastN: number = 100): number {
    return 100 - this.getErrorRate(lastN);
  }

  /**
   * Get request breakdown by status code
   */
  getStatusCodeBreakdown(lastN: number = 100): Record<string, number> {
    const recentMetrics = this.requestMetrics.slice(-lastN);
    const breakdown: Record<string, number> = {
      '2xx': 0,
      '3xx': 0,
      '4xx': 0,
      '5xx': 0,
    };
    
    recentMetrics.forEach(m => {
      const group = `${Math.floor(m.statusCode / 100)}xx`;
      breakdown[group] = (breakdown[group] || 0) + 1;
    });
    
    return breakdown;
  }

  /**
   * Get slowest endpoints
   */
  getSlowestEndpoints(limit: number = 5): Array<{ path: string; avgDuration: number; count: number }> {
    const endpointStats = new Map<string, { total: number; count: number }>();
    
    this.requestMetrics.forEach(m => {
      const key = `${m.method} ${m.path}`;
      const existing = endpointStats.get(key) || { total: 0, count: 0 };
      endpointStats.set(key, {
        total: existing.total + m.duration,
        count: existing.count + 1
      });
    });
    
    return Array.from(endpointStats.entries())
      .map(([path, stats]) => ({
        path,
        avgDuration: Math.round(stats.total / stats.count),
        count: stats.count
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, limit);
  }

  /**
   * Get recent failed requests
   */
  getFailedRequests(limit: number = 50): FailedRequest[] {
    return this.failedRequests
      .slice(-limit)
      .reverse(); // Most recent first
  }

  /**
   * Get failed requests filtered by status code range
   */
  getFailedRequestsByStatus(statusRange: '4xx' | '5xx', limit: number = 50): FailedRequest[] {
    const minStatus = statusRange === '4xx' ? 400 : 500;
    const maxStatus = statusRange === '4xx' ? 499 : 599;
    
    return this.failedRequests
      .filter(f => f.statusCode >= minStatus && f.statusCode <= maxStatus)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get failed requests count by endpoint
   */
  getFailedRequestsByEndpoint(): Array<{ endpoint: string; count: number; lastError: string }> {
    const endpointErrors = new Map<string, { count: number; lastError: string; lastTimestamp: number }>();
    
    this.failedRequests.forEach(f => {
      const key = `${f.method} ${f.path}`;
      const existing = endpointErrors.get(key);
      
      if (!existing || f.timestamp > existing.lastTimestamp) {
        endpointErrors.set(key, {
          count: (existing?.count || 0) + 1,
          lastError: f.errorMessage || 'Unknown error',
          lastTimestamp: f.timestamp
        });
      } else {
        endpointErrors.set(key, {
          ...existing,
          count: existing.count + 1
        });
      }
    });
    
    return Array.from(endpointErrors.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        count: stats.count,
        lastError: stats.lastError
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get comprehensive real-time metrics
   */
  getRealTimeMetrics() {
    const now = Date.now();
    const uptimeSeconds = (now - this.startTime) / 1000;
    
    return {
      timestamp: new Date(),
      
      // Response Time Metrics
      responseTime: {
        average: this.getAverageResponseTime(),
        p95: this.getP95ResponseTime(),
        status: this.getAverageResponseTime() < 200 ? 'healthy' : 
                this.getAverageResponseTime() < 500 ? 'warning' : 'critical',
        unit: 'ms'
      },
      
      // Uptime Metrics
      uptime: {
        percentage: this.getUptimePercentage(),
        seconds: Math.round(uptimeSeconds),
        hours: Math.round(uptimeSeconds / 3600 * 100) / 100,
        status: this.getUptimePercentage() >= 99.9 ? 'healthy' : 
                this.getUptimePercentage() >= 99 ? 'warning' : 'critical'
      },
      
      // Error Rate Metrics
      errorRate: {
        percentage: this.getErrorRate(),
        totalErrors: this.totalErrors,
        status: this.getErrorRate() < 1 ? 'healthy' : 
                this.getErrorRate() < 5 ? 'warning' : 'critical'
      },
      
      // Connection Metrics
      connections: {
        active: this.getActiveConnections(),
        status: this.getActiveConnections() < 200 ? 'healthy' : 
                this.getActiveConnections() < 500 ? 'warning' : 'critical'
      },
      
      // Request Metrics
      requests: {
        total: this.totalRequests,
        perMinute: this.getRequestsPerMinute(),
        successRate: this.getSuccessRate()
      },
      
      // Additional Insights
      insights: {
        statusBreakdown: this.getStatusCodeBreakdown(),
        slowestEndpoints: this.getSlowestEndpoints(5),
        failedRequests: this.getFailedRequests(50),
        failedRequestsByEndpoint: this.getFailedRequestsByEndpoint()
      }
    };
  }

  /**
   * Get health status summary
   */
  getHealthStatus() {
    const metrics = this.getRealTimeMetrics();
    
    const allHealthy = 
      metrics.responseTime.status === 'healthy' &&
      metrics.uptime.status === 'healthy' &&
      metrics.errorRate.status === 'healthy' &&
      metrics.connections.status === 'healthy';
    
    const anyWarning = 
      metrics.responseTime.status === 'warning' ||
      metrics.uptime.status === 'warning' ||
      metrics.errorRate.status === 'warning' ||
      metrics.connections.status === 'warning';
    
    return {
      overall: allHealthy ? 'healthy' : anyWarning ? 'warning' : 'critical',
      components: {
        api: metrics.responseTime.status,
        uptime: metrics.uptime.status,
        errors: metrics.errorRate.status,
        connections: metrics.connections.status
      },
      metrics
    };
  }

  /**
   * Reset all metrics (for testing)
   */
  reset() {
    this.requestMetrics = [];
    this.failedRequests = [];
    this.connections.clear();
    this.totalRequests = 0;
    this.totalErrors = 0;
    this.startTime = Date.now();
  }
}

// Export types for use in other modules
export type { FailedRequest };

export const monitoringService = new RealTimeMonitoringService();
