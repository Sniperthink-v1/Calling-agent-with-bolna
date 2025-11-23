import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { API_BASE_URL } from '@/config/api';

interface GroupedLead {
  group_key: string;
  group_type: string;
  phone: string;
  email: string;
  name: string;
  company: string;
  user_name: string;
  user_email: string;
  lead_type: string;
  recent_lead_tag: string;
  recent_engagement_level: string;
  recent_intent_level: string;
  recent_budget_constraint: string;
  recent_timeline_urgency: string;
  recent_fit_alignment: string;
  escalated_to_human: boolean;
  interactions: number;
  interacted_agents: string;
  last_contact: string;
  follow_up_scheduled: string;
  follow_up_status: string;
  demo_scheduled: string;
}

interface ClientLeadIntelligenceProps {
  userId: string | null;
}

const ClientLeadIntelligence: React.FC<ClientLeadIntelligenceProps> = ({ userId }) => {
  const [page, setPage] = React.useState(1);
  const limit = 50;

  const { data, isLoading, error } = useQuery({
    queryKey: ['client-lead-intelligence', userId, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(userId && userId !== 'all' ? { userId } : {})
      });

      const response = await fetch(
        `${API_BASE_URL}/api/admin/client-panel/lead-intelligence?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch lead intelligence');
      }

      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-600">Error loading lead intelligence</p>
      </div>
    );
  }

  const leads = data?.data?.intelligence || [];
  const total = data?.data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const getLeadStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase() || 'cold';
    if (statusLower === 'hot') return <Badge className="bg-red-100 text-red-800 border-red-300">Hot</Badge>;
    if (statusLower === 'warm') return <Badge className="bg-orange-100 text-orange-800 border-orange-300">Warm</Badge>;
    return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Cold</Badge>;
  };

  const getMetricBadge = (level: string) => {
    const levelLower = level?.toLowerCase() || 'low';
    if (levelLower === 'high') return <Badge className="bg-green-100 text-green-800 border-green-300">High</Badge>;
    if (levelLower === 'medium') return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Medium</Badge>;
    return <Badge className="bg-gray-100 text-gray-800 border-gray-300">Low</Badge>;
  };

  const getYesNoBadge = (value: boolean) => {
    return value 
      ? <Badge className="bg-green-100 text-green-800 border-green-300">Yes</Badge>
      : <Badge className="bg-gray-100 text-gray-800 border-gray-300">No</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="overflow-x-auto">
          <Table className="min-w-max">
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead
                  className="font-semibold text-black bg-white sticky left-0 z-20 pl-4 pr-6 whitespace-nowrap"
                >
                  Contact
                </TableHead>
                <TableHead className="font-semibold text-black">User</TableHead>
                <TableHead
                  className="font-semibold text-black bg-white sticky left-[220px] z-20 pr-4 whitespace-nowrap"
                >
                  Lead Type
                </TableHead>
                <TableHead
                  className="font-semibold text-black bg-white sticky left-[340px] z-20 pr-4 whitespace-nowrap"
                >
                  Recent Lead Tag
                </TableHead>
                <TableHead className="font-semibold text-black">Engagement</TableHead>
                <TableHead className="font-semibold text-black">Intent</TableHead>
                <TableHead className="font-semibold text-black">Budget Constraint</TableHead>
                <TableHead className="font-semibold text-black">Urgency</TableHead>
                <TableHead className="font-semibold text-black">Fit</TableHead>
                <TableHead className="font-semibold text-black">Escalated</TableHead>
                <TableHead className="font-semibold text-black">Interactions</TableHead>
                <TableHead className="font-semibold text-black">Interacted Agents</TableHead>
                <TableHead className="font-semibold text-black">Last Interaction</TableHead>
                <TableHead className="font-semibold text-black">Follow-up Date</TableHead>
                <TableHead className="font-semibold text-black">Follow-up Status</TableHead>
                <TableHead className="font-semibold text-black">Demo Scheduled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={16} className="text-center text-gray-500 py-8">
                    No lead intelligence data found
                  </TableCell>
                </TableRow>
              ) : (
                leads.map((lead: GroupedLead, index: number) => (
                  <TableRow key={`${lead.group_key}-${index}`} className="hover:bg-gray-50">
                    <TableCell className="bg-white sticky left-0 z-10 pl-4 pr-6">
                      <div>
                        <div className="font-medium text-black">{lead.name || 'Anonymous'}</div>
                        {lead.email && <div className="text-sm text-gray-600">{lead.email}</div>}
                        {lead.phone && <div className="text-sm text-gray-600">{lead.phone}</div>}
                        {lead.company && <div className="text-sm text-gray-500">{lead.company}</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-black">{lead.user_name}</div>
                        <div className="text-sm text-gray-600">{lead.user_email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-black capitalize bg-white sticky left-[220px] z-10 pr-4 whitespace-nowrap">
                      {lead.lead_type || 'N/A'}
                    </TableCell>
                    <TableCell className="bg-white sticky left-[340px] z-10 pr-4 whitespace-nowrap">
                      {getLeadStatusBadge(lead.recent_lead_tag)}
                    </TableCell>
                    <TableCell>{getMetricBadge(lead.recent_engagement_level)}</TableCell>
                    <TableCell>{getMetricBadge(lead.recent_intent_level)}</TableCell>
                    <TableCell>{getMetricBadge(lead.recent_budget_constraint)}</TableCell>
                    <TableCell>{getMetricBadge(lead.recent_timeline_urgency)}</TableCell>
                    <TableCell>{getMetricBadge(lead.recent_fit_alignment)}</TableCell>
                    <TableCell>{getYesNoBadge(lead.escalated_to_human)}</TableCell>
                    <TableCell className="text-black">{lead.interactions}</TableCell>
                    <TableCell className="text-black text-sm">{lead.interacted_agents || 'N/A'}</TableCell>
                    <TableCell className="text-black">
                      {lead.last_contact ? new Date(lead.last_contact).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-black">
                      {lead.follow_up_scheduled ? new Date(lead.follow_up_scheduled).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {lead.follow_up_status ? (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-300 capitalize">
                          {lead.follow_up_status}
                        </Badge>
                      ) : (
                        <span className="text-gray-500">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="text-black">
                      {lead.demo_scheduled ? new Date(lead.demo_scheduled).toLocaleDateString() : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} leads
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-black bg-white"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-black bg-white"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientLeadIntelligence;
