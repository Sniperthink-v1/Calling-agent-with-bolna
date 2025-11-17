/**
 * System Metrics Service
 * Provides real-time system metrics from Railway server using Node.js OS module
 * No external API required - uses direct server access
 */

import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface CPUMetrics {
  usage: number;
  cores: number;
  model: string;
  loadAverage: {
    '1min': number;
    '5min': number;
    '15min': number;
  };
}

export interface MemoryMetrics {
  total: number; // MB
  free: number; // MB
  used: number; // MB
  percentage: number;
  processHeapUsed: number; // MB
  processHeapTotal: number; // MB
  processHeapPercentage: number;
}

export interface DiskMetrics {
  total: string;
  used: string;
  free: string;
  percentage: number;
}

export interface UptimeMetrics {
  systemUptime: number; // seconds
  systemUptimeHours: number;
  processUptime: number; // seconds
  processUptimeHours: number;
}

export interface NetworkInterface {
  interface: string;
  address: string;
  family: string;
}

export interface ProcessStats {
  pid: number;
  version: string;
  platform: string;
  arch: string;
  nodeEnv: string | undefined;
  uptimeSeconds: number;
  memoryUsage: NodeJS.MemoryUsage;
}

export interface SystemMetrics {
  timestamp: Date;
  system: {
    platform: string;
    arch: string;
    hostname: string;
    cpus: number;
    totalMemory: number; // GB
  };
  performance: {
    cpu: CPUMetrics;
    memory: MemoryMetrics;
    disk: DiskMetrics;
  };
  uptime: UptimeMetrics;
  process: ProcessStats;
  network: NetworkInterface[];
}

class SystemMetricsService {
  private cpuUsageHistory: number[] = [];
  private maxHistoryLength = 10;

  /**
   * Get real CPU usage percentage
   * Uses moving average for more accurate results
   */
  async getCPUUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      const startTime = Date.now();

      setTimeout(() => {
        const elapseTime = Date.now() - startTime;
        const elapseUsage = process.cpuUsage(startUsage);
        const totalUsage = (elapseUsage.user + elapseUsage.system) / 1000; // microseconds to milliseconds
        const cpuPercent = (totalUsage / elapseTime) * 100;

        // Store in history for averaging
        this.cpuUsageHistory.push(cpuPercent);
        if (this.cpuUsageHistory.length > this.maxHistoryLength) {
          this.cpuUsageHistory.shift();
        }

        // Return average
        const avgCPU = this.cpuUsageHistory.reduce((a, b) => a + b, 0) / this.cpuUsageHistory.length;
        resolve(Math.round(avgCPU * 100) / 100);
      }, 100);
    });
  }

  /**
   * Get real memory usage from Railway server
   */
  getMemoryUsage(): MemoryMetrics {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const processMemory = process.memoryUsage();

    return {
      total: Math.round(totalMemory / 1024 / 1024), // MB
      free: Math.round(freeMemory / 1024 / 1024), // MB
      used: Math.round(usedMemory / 1024 / 1024), // MB
      percentage: Math.round((usedMemory / totalMemory) * 100),
      processHeapUsed: Math.round(processMemory.heapUsed / 1024 / 1024), // MB
      processHeapTotal: Math.round(processMemory.heapTotal / 1024 / 1024), // MB
      processHeapPercentage: Math.round((processMemory.heapUsed / processMemory.heapTotal) * 100),
    };
  }

  /**
   * Get system and process uptime
   */
  getSystemUptime(): UptimeMetrics {
    const uptimeSeconds = os.uptime();
    const processUptimeSeconds = process.uptime();

    return {
      systemUptime: uptimeSeconds,
      systemUptimeHours: Math.round(uptimeSeconds / 3600 * 100) / 100,
      processUptime: processUptimeSeconds,
      processUptimeHours: Math.round(processUptimeSeconds / 3600 * 100) / 100,
    };
  }

  /**
   * Get disk usage from Railway container
   */
  async getDiskUsage(): Promise<DiskMetrics> {
    try {
      // Use df command to get disk usage
      const { stdout } = await execAsync('df -h / | tail -1');
      const parts = stdout.trim().split(/\s+/);

      return {
        total: parts[1] || 'N/A',
        used: parts[2] || 'N/A',
        free: parts[3] || 'N/A',
        percentage: parts[4] ? parseInt(parts[4]) : 0,
      };
    } catch (error) {
      // Fallback if df command fails (Windows or restricted environment)
      return {
        total: 'N/A',
        used: 'N/A',
        free: 'N/A',
        percentage: 0,
      };
    }
  }

  /**
   * Get network interfaces info
   */
  getNetworkInfo(): NetworkInterface[] {
    const interfaces = os.networkInterfaces();
    const activeInterfaces: NetworkInterface[] = [];

    for (const [name, addrs] of Object.entries(interfaces)) {
      if (addrs) {
        addrs.forEach(addr => {
          if (!addr.internal) {
            activeInterfaces.push({
              interface: name,
              address: addr.address,
              family: addr.family,
            });
          }
        });
      }
    }

    return activeInterfaces;
  }

  /**
   * Get Node.js process stats
   */
  getProcessStats(): ProcessStats {
    return {
      pid: process.pid,
      version: process.version,
      platform: process.platform,
      arch: process.arch,
      nodeEnv: process.env.NODE_ENV,
      uptimeSeconds: Math.round(process.uptime()),
      memoryUsage: process.memoryUsage(),
    };
  }

  /**
   * Get load average (Unix/Linux)
   */
  getLoadAverage(): { '1min': number; '5min': number; '15min': number } {
    const loadAvg = os.loadavg();
    return {
      '1min': Math.round(loadAvg[0] * 100) / 100,
      '5min': Math.round(loadAvg[1] * 100) / 100,
      '15min': Math.round(loadAvg[2] * 100) / 100,
    };
  }

  /**
   * Get CPU metrics including usage and load average
   */
  async getCPUMetrics(): Promise<CPUMetrics> {
    const cpus = os.cpus();
    const usage = await this.getCPUUsage();
    const loadAvg = this.getLoadAverage();

    return {
      usage,
      cores: cpus.length,
      model: cpus[0]?.model || 'Unknown',
      loadAverage: loadAvg,
    };
  }

  /**
   * Get comprehensive system metrics
   * This is the main method that combines all metrics
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    const memory = this.getMemoryUsage();
    const uptime = this.getSystemUptime();
    const cpu = await this.getCPUMetrics();
    const disk = await this.getDiskUsage();
    const network = this.getNetworkInfo();
    const processStats = this.getProcessStats();

    return {
      timestamp: new Date(),
      system: {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        cpus: os.cpus().length,
        totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024 * 100) / 100, // GB
      },
      performance: {
        cpu,
        memory,
        disk,
      },
      uptime,
      process: processStats,
      network,
    };
  }

  /**
   * Get lightweight metrics for frequent polling (realtime updates)
   */
  async getLightweightMetrics() {
    const memory = this.getMemoryUsage();
    const cpu = await this.getCPUUsage();
    const uptime = this.getSystemUptime();

    return {
      timestamp: new Date(),
      cpu: {
        usage: cpu,
        cores: os.cpus().length,
      },
      memory: {
        used: memory.used,
        total: memory.total,
        percentage: memory.percentage,
        processHeap: memory.processHeapUsed,
      },
      uptime: {
        process: uptime.processUptimeHours,
      },
    };
  }

  /**
   * Calculate system health score (0-100)
   */
  async getSystemHealthScore(): Promise<number> {
    const memory = this.getMemoryUsage();
    const cpu = await this.getCPUUsage();
    
    // Health score calculation
    // Memory: 100 = 0% used, 0 = 100% used
    const memoryScore = 100 - memory.percentage;
    
    // CPU: 100 = 0% used, 0 = 100% used
    const cpuScore = 100 - cpu;
    
    // Weighted average (memory more important than CPU for Node.js)
    const healthScore = (memoryScore * 0.6) + (cpuScore * 0.4);
    
    return Math.round(healthScore);
  }

  /**
   * Get uptime percentage (assumes 99.9% target)
   */
  getUptimePercentage(): number {
    const uptimeHours = this.getSystemUptime().processUptimeHours;
    
    // If process has been running for less than 1 hour, assume 100%
    if (uptimeHours < 1) return 100;
    
    // Calculate based on process uptime (assuming minimal downtime)
    // In production, this would come from monitoring service
    const targetUptime = 0.999; // 99.9%
    return Math.round(targetUptime * 100 * 100) / 100;
  }
}

export const systemMetricsService = new SystemMetricsService();
