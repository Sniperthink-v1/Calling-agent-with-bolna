import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authenticatedFetch } from '@/utils/auth';
import { Phone, Calendar, Clock, User } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ClientUnifiedCallLogsProps {
  userId: string | null;
}

const ClientUnifiedCallLogs: React.FC<ClientUnifiedCallLogsProps> = ({ userId }) => {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const limit = 50;

  const { data, isLoading } = useQuery({
    queryKey: ['client-panel-calls', userId, page, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (userId) params.append('userId', userId);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const response = await authenticatedFetch(`/api/admin/client-panel/calls?${params}`);
      if (!response.ok) throw new Error('Failed to fetch call logs');
      const result = await response.json();
      return result.data;
    },
  });

  const calls = data?.calls || [];
  const total = data?.total || 0;

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: string } = {
      completed: 'bg-green-500 text-white',
      failed: 'bg-red-500 text-white',
      busy: 'bg-yellow-500 text-white',
      'no-answer': 'bg-gray-500 text-white',
      ongoing: 'bg-blue-500 text-white',
    };
    return (
      <Badge className={statusMap[status] || 'bg-gray-500 text-white'}>
        {status}
      </Badge>
    );
  };

  const formatDuration = (minutes: number) => {
    if (!minutes) return 'N/A';
    const mins = Math.floor(minutes);
    const secs = Math.round((minutes - mins) * 60);
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-900">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Phone className="w-6 h-6" />
            Unified Call Logs ({total})
          </h3>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48 border-gray-900">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="busy">Busy</SelectItem>
              <SelectItem value="no-answer">No Answer</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-bold text-gray-900">Contact</TableHead>
              <TableHead className="font-bold text-gray-900">Agent</TableHead>
              <TableHead className="font-bold text-gray-900">Owner</TableHead>
              <TableHead className="font-bold text-gray-900">Status</TableHead>
              <TableHead className="font-bold text-gray-900">Duration</TableHead>
              <TableHead className="font-bold text-gray-900">Credits</TableHead>
              <TableHead className="font-bold text-gray-900">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="animate-pulse text-gray-900">Loading call logs...</div>
                </TableCell>
              </TableRow>
            ) : calls.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-600 py-8">
                  No call logs found
                </TableCell>
              </TableRow>
            ) : (
              calls.map((call: any) => (
                <TableRow key={call.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div>
                      <div className="font-semibold text-gray-900">{call.caller_name || 'Unknown'}</div>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Phone className="w-3 h-3" />
                        {call.phone_number}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-900">{call.agent_name || 'N/A'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-600" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{call.user_name}</div>
                        <div className="text-xs text-gray-600">{call.user_email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(call.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-gray-900">
                      <Clock className="w-3 h-3" />
                      {formatDuration(call.duration_minutes)}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-900 font-semibold">{call.credits_used || 0}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Calendar className="w-3 h-3" />
                      {new Date(call.created_at).toLocaleString()}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {total > limit && (
        <div className="p-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="text-sm text-gray-900 font-medium">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} calls
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
  );
};

export default ClientUnifiedCallLogs;
