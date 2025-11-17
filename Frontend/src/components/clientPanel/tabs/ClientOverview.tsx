import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { authenticatedFetch } from '@/utils/auth';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

interface ClientOverviewProps {
  userId: string | null;
}

const ClientOverview: React.FC<ClientOverviewProps> = ({ userId }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['client-panel-overview', userId],
    queryFn: async () => {
      const params = userId ? `?userId=${userId}` : '';
      const response = await authenticatedFetch(`/api/admin/client-panel/overview${params}`);
      if (!response.ok) throw new Error('Failed to fetch overview data');
      const result = await response.json();
      return result.data;
    },
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <div className="animate-pulse">
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  const callTrends = data?.callTrends || [];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Call Trends (Last 30 Days)</h3>
        {callTrends.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={callTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="total_calls" 
                stroke="#3b82f6" 
                name="Total Calls"
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="completed_calls" 
                stroke="#10b981" 
                name="Completed Calls"
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="failed_calls" 
                stroke="#ef4444" 
                name="Failed Calls"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            No call data available
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Call Duration & Credits</h3>
        {callTrends.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={callTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <Legend />
              <Bar dataKey="total_duration" fill="#8b5cf6" name="Duration (min)" />
              <Bar dataKey="credits_used" fill="#f59e0b" name="Credits Used" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            No data available
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientOverview;
