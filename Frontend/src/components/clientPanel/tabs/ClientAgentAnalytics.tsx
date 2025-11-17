import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authenticatedFetch } from '@/utils/auth';
import { Bot, TrendingUp, Phone, Clock } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ClientAgentAnalyticsProps {
  userId: string | null;
}

const ClientAgentAnalytics: React.FC<ClientAgentAnalyticsProps> = ({ userId }) => {
  const [page, setPage] = useState(1);
  const limit = 50;

  const { data, isLoading } = useQuery({
    queryKey: ['client-panel-agents', userId, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (userId) params.append('userId', userId);
      
      const response = await authenticatedFetch(`/api/admin/client-panel/agents?${params}`);
      if (!response.ok) throw new Error('Failed to fetch agent analytics');
      const result = await response.json();
      return result.data;
    },
  });

  const agents = data?.agents || [];
  const total = data?.total || 0;

  const getStatusBadge = (status: string) => {
    return status === 'active' ? (
      <Badge className="bg-green-500 text-white">Active</Badge>
    ) : (
      <Badge className="bg-gray-500 text-white">Inactive</Badge>
    );
  };

  const calculateSuccessRate = (agent: any) => {
    const totalCalls = agent.total_calls || 0;
    const completedCalls = agent.completed_calls || 0;
    if (totalCalls === 0) return 0;
    return Math.round((completedCalls / totalCalls) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-2 border-gray-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{total}</div>
          </CardContent>
        </Card>
        <Card className="border-2 border-gray-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {agents.filter((a: any) => a.status === 'active').length}
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-gray-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Calls Made</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {agents.reduce((sum: number, a: any) => sum + (a.total_calls || 0), 0)}
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-gray-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {agents.length > 0
                ? Math.round(
                    agents.reduce((sum: number, a: any) => sum + calculateSuccessRate(a), 0) /
                      agents.length
                  )
                : 0}
              %
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Analytics Table */}
      <div className="bg-white rounded-lg border-2 border-gray-900">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Bot className="w-6 h-6" />
            Agent Performance Analytics
          </h3>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-bold text-gray-900">Agent Name</TableHead>
                <TableHead className="font-bold text-gray-900">Type</TableHead>
                <TableHead className="font-bold text-gray-900">Owner</TableHead>
                <TableHead className="font-bold text-gray-900">Total Calls</TableHead>
                <TableHead className="font-bold text-gray-900">Completed</TableHead>
                <TableHead className="font-bold text-gray-900">Failed</TableHead>
                <TableHead className="font-bold text-gray-900">Success Rate</TableHead>
                <TableHead className="font-bold text-gray-900">Status</TableHead>
                <TableHead className="font-bold text-gray-900">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="animate-pulse text-gray-900">Loading agent analytics...</div>
                  </TableCell>
                </TableRow>
              ) : agents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-gray-600 py-8">
                    No agent analytics found
                  </TableCell>
                </TableRow>
              ) : (
                agents.map((agent: any) => {
                  const successRate = calculateSuccessRate(agent);
                  return (
                    <TableRow key={agent.id} className="hover:bg-gray-50">
                      <TableCell className="font-semibold text-gray-900">{agent.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-gray-900 text-gray-900">
                          {agent.type || 'Standard'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{agent.user_name}</div>
                          <div className="text-xs text-gray-600">{agent.user_email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-gray-900 font-semibold">
                          <Phone className="w-4 h-4" />
                          {agent.total_calls || 0}
                        </div>
                      </TableCell>
                      <TableCell className="text-green-600 font-semibold">
                        {agent.completed_calls || 0}
                      </TableCell>
                      <TableCell className="text-red-600 font-semibold">
                        {agent.failed_calls || 0}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="text-gray-900 font-bold">{successRate}%</div>
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                successRate >= 75
                                  ? 'bg-green-500'
                                  : successRate >= 50
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${successRate}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(agent.status)}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(agent.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {total > limit && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
            <div className="text-sm text-gray-900 font-medium">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} agents
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-900 rounded text-gray-900 hover:bg-gray-900 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * limit >= total}
                className="px-4 py-2 border border-gray-900 rounded text-gray-900 hover:bg-gray-900 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientAgentAnalytics;
