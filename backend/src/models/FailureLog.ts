import BaseModel, { BaseModelInterface } from './BaseModel';
import database from '../config/database';

export interface FailureLogInterface extends BaseModelInterface {
  id: string;
  timestamp: Date;
  endpoint: string;
  method: string;
  status_code: number;
  error_message?: string;
  error_stack?: string;
  request_body?: any;
  request_headers?: any;
  response_body?: any;
  duration_ms: number;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  request_id?: string;
  environment?: string;
  created_at: Date;
}

class FailureLogModel extends BaseModel<FailureLogInterface> {
  constructor() {
    super('failure_logs');
  }

  /**
   * Log a failed API request
   */
  async logFailure(data: {
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
  }): Promise<FailureLogInterface> {
    const query = `
      INSERT INTO failure_logs (
        endpoint, method, status_code, error_message, error_stack,
        request_body, request_headers, response_body, duration_ms,
        user_id, ip_address, user_agent, request_id, environment, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;

    const values = [
      data.endpoint,
      data.method,
      data.statusCode,
      data.errorMessage || null,
      data.errorStack || null,
      data.requestBody ? JSON.stringify(data.requestBody) : null,
      data.requestHeaders ? JSON.stringify(data.requestHeaders) : null,
      data.responseBody ? JSON.stringify(data.responseBody) : null,
      data.duration,
      data.userId || null,
      data.ipAddress || null,
      data.userAgent || null,
      data.requestId || null,
      process.env.NODE_ENV || 'development',
      new Date()
    ];

    const result = await database.query(query, values);
    return result.rows[0];
  }

  /**
   * Get recent failure logs
   */
  async getRecentFailures(limit: number = 50, offset: number = 0): Promise<FailureLogInterface[]> {
    const query = `
      SELECT * FROM failure_logs
      ORDER BY timestamp DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await database.query(query, [limit, offset]);
    return result.rows;
  }

  /**
   * Get failures by status code range
   */
  async getFailuresByStatusRange(minStatus: number, maxStatus: number, limit: number = 50): Promise<FailureLogInterface[]> {
    const query = `
      SELECT * FROM failure_logs
      WHERE status_code >= $1 AND status_code <= $2
      ORDER BY timestamp DESC
      LIMIT $3
    `;
    const result = await database.query(query, [minStatus, maxStatus, limit]);
    return result.rows;
  }

  /**
   * Get failures by endpoint
   */
  async getFailuresByEndpoint(endpoint: string, limit: number = 50): Promise<FailureLogInterface[]> {
    const query = `
      SELECT * FROM failure_logs
      WHERE endpoint = $1
      ORDER BY timestamp DESC
      LIMIT $2
    `;
    const result = await database.query(query, [endpoint, limit]);
    return result.rows;
  }

  /**
   * Get failure statistics by endpoint
   */
  async getFailureStatsByEndpoint(hoursBack: number = 24): Promise<Array<{
    endpoint: string;
    method: string;
    count: number;
    avg_duration_ms: number;
    last_error: string;
    last_occurred: Date;
  }>> {
    const query = `
      SELECT 
        endpoint,
        method,
        COUNT(*) as count,
        AVG(duration_ms)::int as avg_duration_ms,
        (array_agg(error_message ORDER BY timestamp DESC))[1] as last_error,
        MAX(timestamp) as last_occurred
      FROM failure_logs
      WHERE timestamp >= NOW() - INTERVAL '${hoursBack} hours'
      GROUP BY endpoint, method
      ORDER BY count DESC
    `;
    const result = await database.query(query);
    return result.rows;
  }

  /**
   * Get failure count by status code
   */
  async getFailureCountByStatus(hoursBack: number = 24): Promise<Array<{
    status_code: number;
    count: number;
  }>> {
    const query = `
      SELECT 
        status_code,
        COUNT(*) as count
      FROM failure_logs
      WHERE timestamp >= NOW() - INTERVAL '${hoursBack} hours'
      GROUP BY status_code
      ORDER BY count DESC
    `;
    const result = await database.query(query);
    return result.rows;
  }

  /**
   * Get failure trend (hourly breakdown)
   */
  async getFailureTrend(hoursBack: number = 24): Promise<Array<{
    hour: string;
    total_failures: number;
    client_errors: number;
    server_errors: number;
  }>> {
    const query = `
      SELECT 
        date_trunc('hour', timestamp) as hour,
        COUNT(*) as total_failures,
        COUNT(*) FILTER (WHERE status_code >= 400 AND status_code < 500) as client_errors,
        COUNT(*) FILTER (WHERE status_code >= 500) as server_errors
      FROM failure_logs
      WHERE timestamp >= NOW() - INTERVAL '${hoursBack} hours'
      GROUP BY hour
      ORDER BY hour DESC
    `;
    const result = await database.query(query);
    return result.rows;
  }

  /**
   * Clean up old logs (keep last N days)
   */
  async cleanupOldLogs(daysToKeep: number = 30): Promise<number> {
    const query = `
      DELETE FROM failure_logs
      WHERE timestamp < NOW() - INTERVAL '${daysToKeep} days'
    `;
    const result = await database.query(query);
    return result.rowCount || 0;
  }

  /**
   * Get failure details by ID
   */
  async getFailureDetails(id: string): Promise<FailureLogInterface | null> {
    return this.findById(id);
  }

  /**
   * Search failures by error message
   */
  async searchByErrorMessage(searchTerm: string, limit: number = 50): Promise<FailureLogInterface[]> {
    const query = `
      SELECT * FROM failure_logs
      WHERE error_message ILIKE $1
      ORDER BY timestamp DESC
      LIMIT $2
    `;
    const result = await database.query(query, [`%${searchTerm}%`, limit]);
    return result.rows;
  }
}

export const failureLogModel = new FailureLogModel();
export default FailureLogModel;
