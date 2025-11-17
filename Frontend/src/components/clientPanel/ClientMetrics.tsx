import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Bot, Phone, Contact, Target, UserCheck } from 'lucide-react';
import { authenticatedFetch } from '@/utils/auth';

interface ClientMetricsProps {
  userId: string | null;
}

interface MetricsData {
  totalUsers: number;
  totalAgents: number;
  totalCalls: number;
  totalContacts: number;
  totalCampaigns: number;
  totalCustomers: number;
  successRate: number;
}

const ClientMetrics: React.FC<ClientMetricsProps> = ({ userId }) => {
  const { data: metricsData, isLoading } = useQuery({
    queryKey: ['client-panel-metrics', userId],
    queryFn: async () => {
      const params = userId ? `?userId=${userId}` : '';
      const response = await authenticatedFetch(`/api/admin/client-panel/metrics${params}`);
      if (!response.ok) throw new Error('Failed to fetch metrics');
      const result = await response.json();
      return result.data as MetricsData;
    },
  });

  const metrics = metricsData || {
    totalUsers: 0,
    totalAgents: 0,
    totalCalls: 0,
    totalContacts: 0,
    totalCampaigns: 0,
    totalCustomers: 0,
    successRate: 0,
  };

  const metricCards = [
    {
      label: 'Total Calls',
      value: metrics.totalCalls.toLocaleString(),
      icon: Phone,
      color: 'bg-blue-500',
    },
    {
      label: 'Total Agents',
      value: metrics.totalAgents.toLocaleString(),
      icon: Bot,
      color: 'bg-purple-500',
    },
    {
      label: 'Total Contacts',
      value: metrics.totalContacts.toLocaleString(),
      icon: Contact,
      color: 'bg-green-500',
    },
    {
      label: 'Total Campaigns',
      value: metrics.totalCampaigns.toLocaleString(),
      icon: Target,
      color: 'bg-orange-500',
    },
    {
      label: 'Total Customers',
      value: metrics.totalCustomers.toLocaleString(),
      icon: UserCheck,
      color: 'bg-teal-500',
    },
    {
      label: 'Success Rate',
      value: `${metrics.successRate}%`,
      icon: Users,
      color: 'bg-indigo-500',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-lg p-4 animate-pulse">
            <div className="h-12 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {metricCards.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <div
            key={index}
            className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`${metric.color} p-2 rounded-lg`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {metric.value}
            </div>
            <div className="text-sm text-gray-600">{metric.label}</div>
          </div>
        );
      })}
    </div>
  );
};

export default ClientMetrics;
