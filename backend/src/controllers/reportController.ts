import { Request, Response } from 'express';
import { pool } from '../config/database';
import { logger } from '../utils/logger';

export class ReportController {
  static async generateReport(req: Request, res: Response) {
    try {
      const { dataSource, metrics, filters, groupBy, sortBy } = req.body;

      if (!dataSource || !metrics || !Array.isArray(metrics)) {
        res.status(400).json({ error: 'Invalid report configuration' });
        return;
      }

      let query = '';
      let params: any[] = [];

      if (dataSource === 'calls') {
        const selectFields = metrics.map((metric: string) => {
          switch (metric) {
            case 'total_calls':
              return 'COUNT(*) as total_calls';
            case 'call_success_rate':
              return "COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*) as call_success_rate";
            case 'average_duration':
              return 'AVG(duration_seconds) as average_duration';
            case 'calls_by_hour':
              return 'EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as count';
            case 'call_costs':
              return 'SUM(credits_used) as call_costs';
            default:
              return null;
          }
        }).filter(Boolean).join(', ');

        if (!selectFields) {
            res.status(400).json({ error: 'No valid metrics selected' });
            return;
        }

        query = `SELECT ${selectFields} FROM calls`;
        
        // Add filters
        const whereClauses: string[] = [];
        if (filters && Array.isArray(filters)) {
            filters.forEach((filter: any) => {
                if (filter.id === 'date_range' && filter.value) {
                    if (filter.value.start) {
                        whereClauses.push(`created_at >= $${params.length + 1}`);
                        params.push(filter.value.start);
                    }
                    if (filter.value.end) {
                        whereClauses.push(`created_at <= $${params.length + 1}`);
                        params.push(filter.value.end);
                    }
                }
                // Add more filters as needed
            });
        }

        if (whereClauses.length > 0) {
            query += ` WHERE ${whereClauses.join(' AND ')}`;
        }

        // Add Group By
        if (groupBy && Array.isArray(groupBy) && groupBy.length > 0) {
             // Basic group by support - needs to be safe
             // For now, only support grouping by hour if calls_by_hour metric is present
             if (metrics.includes('calls_by_hour')) {
                 query += ' GROUP BY hour';
             }
        }
        
        // Add Sort By
        if (sortBy && Array.isArray(sortBy) && sortBy.length > 0) {
             const sortClauses = sortBy.map((sort: any) => {
                 // Sanitize field name
                 const field = sort.field === 'hour' ? 'hour' : sort.field; 
                 const direction = sort.direction === 'desc' ? 'DESC' : 'ASC';
                 return `${field} ${direction}`;
             });
             query += ` ORDER BY ${sortClauses.join(', ')}`;
        } else if (metrics.includes('calls_by_hour')) {
            query += ' ORDER BY hour ASC';
        }

      } else {
        res.status(400).json({ error: `Data source '${dataSource}' not supported yet` });
        return;
      }

      const result = await pool.query(query, params);
      
      // Format data for frontend
      // The frontend expects { data: any[], summary: any }
      // For now, just return the rows
      
      res.json({
        data: result.rows,
        generated_at: new Date().toISOString(),
        config: req.body
      });

    } catch (error) {
      logger.error('Error generating report:', error);
      res.status(500).json({ error: 'Failed to generate report' });
    }
  }
}
