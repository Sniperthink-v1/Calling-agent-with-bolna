import React, { useEffect, useState } from 'react';
import { Activity, Users, Phone, AlertTriangle, Clock, TrendingUp, Wifi, WifiOff, Cpu, HardDrive, Database, Zap, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Progress } from '../../ui/progress';
import { useSystemHealth } from '../../../hooks/useSystemHealth';
import { useAdminDashboard } from '../../../hooks/useAdminDashboard';
import { formatDistanceToNow } from 'date-fns';

interface RealTimeMetricsProps {
  className?: string;
}

export const RealTimeMetrics: React.FC<RealTimeMetricsProps> = ({ className }) => {
  const { healthData, isLoading, refetch } = useSystemHealth({ refetchInterval: 30000 });
  const { metrics, systemStats } = useAdminDashboard({ refetchInterval: 30000 });
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    if (healthData) {
      setLastUpdate(new Date());
    }
  }, [healthData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
      setLastUpdate(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, [refetch]);

  const getStatusColor = (status: 'healthy' | 'warning' | 'critical' | string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'critical':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusBadgeVariant = (status: 'healthy' | 'warning' | 'critical' | string): 'default' | 'destructive' | 'secondary' => {
    switch (status) {
      case 'healthy':
        return 'default';
      case 'warning':
        return 'secondary';
      case 'critical':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Activity className="h-8 w-8 text-gray-400 mx-auto mb-2 animate-pulse" />
              <p className="text-sm text-gray-500">Loading real-time metrics...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with Last Update */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Real-time System Health</CardTitle>
          <div className="flex items-center gap-2">
            <Wifi className="h-4 w-4 text-green-500" />
            <span className="text-xs text-gray-500">
              Updated {formatDistanceToNow(lastUpdate, { addSuffix: true })}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Status:</span>
            <Badge variant={getStatusBadgeVariant(healthData?.overall || 'unknown')} className="capitalize">
              {healthData?.overall || 'Unknown'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Top Row: CPU & Memory (Most Important) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
            <Cpu className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <div className="text-3xl font-bold">
                {systemStats?.system?.cpuUsage?.toFixed(1) || healthData?.system?.cpu.usage.toFixed(1) || 0}%
              </div>
              <Badge variant={
                (systemStats?.system?.cpuUsage || healthData?.system?.cpu.usage || 0) > 80 ? 'destructive' : 
                (systemStats?.system?.cpuUsage || healthData?.system?.cpu.usage || 0) > 60 ? 'secondary' : 'default'
              }>
                {(systemStats?.system?.cpuUsage || healthData?.system?.cpu.usage || 0) > 80 ? 'High' : 
                 (systemStats?.system?.cpuUsage || healthData?.system?.cpu.usage || 0) > 60 ? 'Medium' : 'Normal'}
              </Badge>
            </div>
            <Progress value={systemStats?.system?.cpuUsage || healthData?.system?.cpu.usage || 0} className="h-2 mb-2" />
            <p className="text-xs text-muted-foreground">
              {healthData?.system?.cpu.cores || 'N/A'} cores • Platform: {systemStats?.system?.platform || 'Unknown'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <Database className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <div className="text-3xl font-bold">
                {systemStats?.system?.memoryUsage?.percentage || healthData?.system?.memory.usagePercentage.toFixed(1) || 0}%
              </div>
              <Badge variant={
                (systemStats?.system?.memoryUsage?.percentage || healthData?.system?.memory.usagePercentage || 0) > 85 ? 'destructive' : 
                (systemStats?.system?.memoryUsage?.percentage || healthData?.system?.memory.usagePercentage || 0) > 70 ? 'secondary' : 'default'
              }>
                {(systemStats?.system?.memoryUsage?.percentage || healthData?.system?.memory.usagePercentage || 0) > 85 ? 'High' : 
                 (systemStats?.system?.memoryUsage?.percentage || healthData?.system?.memory.usagePercentage || 0) > 70 ? 'Medium' : 'Normal'}
              </Badge>
            </div>
            <Progress value={systemStats?.system?.memoryUsage?.percentage || healthData?.system?.memory.usagePercentage || 0} className="h-2 mb-2" />
            <p className="text-xs text-muted-foreground">
              {systemStats?.system?.memoryUsage?.used || formatBytes(healthData?.system?.memory.used || 0)} / {systemStats?.system?.memoryUsage?.total || formatBytes(healthData?.system?.memory.total || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* API Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">
                {healthData?.metrics.responseTime.average || systemStats?.system?.responseTime || 0}ms
              </div>
              <Badge variant={getStatusBadgeVariant(healthData?.metrics.responseTime.status || 'unknown')}>
                {healthData?.metrics.responseTime.status || 'healthy'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {healthData?.metrics.responseTime.p95 ? `P95: ${healthData.metrics.responseTime.p95}ms` : 'Average response time'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">
                {healthData?.metrics.uptime.percentage.toFixed(1) || systemStats?.system?.uptime || 100}%
              </div>
              <Badge variant={getStatusBadgeVariant(healthData?.metrics.uptime.status || 'healthy')}>
                {healthData?.metrics.uptime.status || 'healthy'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {systemStats?.system?.uptimeHours?.toFixed(1) || healthData?.metrics.uptime.hours.toFixed(1) || 0} hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">
                {healthData?.metrics.errorRate.percentage.toFixed(2) || (systemStats?.system?.errorRate * 100).toFixed(2) || 0}%
              </div>
              <Badge variant={getStatusBadgeVariant(healthData?.metrics.errorRate.status || 'healthy')}>
                {healthData?.metrics.errorRate.status || 'healthy'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {healthData?.metrics.errorRate.totalErrors || 0} total errors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">HTTP Connections</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">
                {healthData?.metrics.connections.active || 0}
              </div>
              <Badge variant={getStatusBadgeVariant(healthData?.metrics.connections.status || 'healthy')}>
                {healthData?.metrics.connections.status || 'healthy'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active HTTP connections
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Server Info & Load Average */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Server Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500">Hostname</p>
              <p className="text-sm font-medium">{systemStats?.system?.hostname || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Platform</p>
              <p className="text-sm font-medium capitalize">{systemStats?.system?.platform || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">CPU Cores</p>
              <p className="text-sm font-medium">{healthData?.system?.cpu.cores || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Load Average (1m)</p>
              <p className="text-sm font-medium">{healthData?.system?.cpu.loadAverage?.[0]?.toFixed(2) || systemStats?.system?.loadAverage?.['1min'] || '0.00'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Request Statistics */}
      {healthData?.metrics.requests && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Request Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {healthData.metrics.requests.total.toLocaleString()}
                </div>
                <p className="text-xs text-gray-500">Total Requests</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {healthData.metrics.requests.perMinute.toFixed(0)}
                </div>
                <p className="text-xs text-gray-500">Requests/min</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {healthData.metrics.requests.successRate.toFixed(1)}%
                </div>
                <p className="text-xs text-gray-500">Success Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Breakdown */}
      {healthData?.metrics.insights?.statusBreakdown && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Response Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex flex-col items-center justify-center p-3 bg-green-50 rounded-lg">
                <span className="text-xs font-medium text-green-800 mb-1">2xx Success</span>
                <span className="text-xl font-bold text-green-600">
                  {healthData.metrics.insights.statusBreakdown['2xx']}
                </span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 bg-blue-50 rounded-lg">
                <span className="text-xs font-medium text-blue-800 mb-1">3xx Redirect</span>
                <span className="text-xl font-bold text-blue-600">
                  {healthData.metrics.insights.statusBreakdown['3xx']}
                </span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 bg-yellow-50 rounded-lg">
                <span className="text-xs font-medium text-yellow-800 mb-1">4xx Client</span>
                <span className="text-xl font-bold text-yellow-600">
                  {healthData.metrics.insights.statusBreakdown['4xx']}
                </span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 bg-red-50 rounded-lg">
                <span className="text-xs font-medium text-red-800 mb-1">5xx Server</span>
                <span className="text-xl font-bold text-red-600">
                  {healthData.metrics.insights.statusBreakdown['5xx']}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User & Agent Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">User Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Active Users</span>
                <span className="text-lg font-bold">{systemStats?.users?.active || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">New Registrations (30d)</span>
                <span className="text-lg font-bold">{systemStats?.users?.newThisMonth || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Users</span>
                <span className="text-lg font-bold">{systemStats?.users?.total || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Agent Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Active Agents</span>
                <span className="text-lg font-bold">{systemStats?.agents?.active || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Agents</span>
                <span className="text-lg font-bold">{systemStats?.agents?.total || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Healthy Agents</span>
                <span className={`text-lg font-bold ${(systemStats?.agents?.healthyPercentage || 0) >= 90 ? 'text-green-600' : (systemStats?.agents?.healthyPercentage || 0) >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {systemStats?.agents?.healthyPercentage?.toFixed(1) || 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Slowest Endpoints */}
      {healthData?.metrics.insights?.slowestEndpoints && healthData.metrics.insights.slowestEndpoints.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Slowest Endpoints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {healthData.metrics.insights.slowestEndpoints.slice(0, 5).map((endpoint, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-secondary/50 dark:bg-secondary/20 rounded">
                  <div className="flex-1">
                    <p className="text-sm font-medium font-mono">{endpoint.path}</p>
                    <p className="text-xs text-muted-foreground">{endpoint.count} requests</p>
                  </div>
                  <span className={`text-sm font-bold ${endpoint.avgDuration > 1000 ? 'text-red-600 dark:text-red-400' : endpoint.avgDuration > 500 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>
                    {endpoint.avgDuration}ms
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Failed API Calls Table */}
      {healthData?.metrics.insights?.failedRequests && healthData.metrics.insights.failedRequests.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              Failed API Calls
            </CardTitle>
            <Badge variant="destructive">
              {healthData.metrics.insights.failedRequests.length} errors
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Time</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Method</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Endpoint</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Error Message</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Duration</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {healthData.metrics.insights.failedRequests.slice(0, 20).map((request) => (
                    <tr key={request.id} className="border-b hover:bg-secondary/30 dark:hover:bg-secondary/10">
                      <td className="py-2 px-2 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(request.timestamp), { addSuffix: true })}
                      </td>
                      <td className="py-2 px-2">
                        <Badge variant="secondary" className="text-xs">
                          {request.method}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 font-mono text-xs max-w-xs truncate" title={request.path}>
                        {request.path}
                      </td>
                      <td className="py-2 px-2">
                        <Badge 
                          variant={request.statusCode >= 500 ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {request.statusCode}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 text-xs text-foreground max-w-sm truncate" title={request.errorMessage}>
                        {request.errorMessage || 'No message'}
                      </td>
                      <td className="py-2 px-2 text-xs text-muted-foreground">
                        {request.duration}ms
                      </td>
                      <td className="py-2 px-2 text-xs text-muted-foreground font-mono">
                        {request.ipAddress}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {healthData.metrics.insights.failedRequests.length > 20 && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Showing 20 of {healthData.metrics.insights.failedRequests.length} failed requests
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Failed Requests by Endpoint */}
      {healthData?.metrics.insights?.failedRequestsByEndpoint && healthData.metrics.insights.failedRequestsByEndpoint.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Most Problematic Endpoints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {healthData.metrics.insights.failedRequestsByEndpoint.slice(0, 10).map((endpoint, index) => (
                <div key={index} className="flex items-start justify-between p-3 bg-secondary/50 dark:bg-secondary/20 rounded border-l-4 border-red-500 dark:border-red-400">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium font-mono truncate">{endpoint.endpoint}</p>
                    <p className="text-xs text-muted-foreground mt-1 truncate" title={endpoint.lastError}>
                      Last error: {endpoint.lastError}
                    </p>
                  </div>
                  <Badge variant="destructive" className="ml-2 shrink-0">
                    {endpoint.count} failures
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
