import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ClientSelector from './ClientSelector';
import ClientMetrics from './ClientMetrics';
import ClientOverview from './tabs/ClientOverview';
import ClientAgents from './tabs/ClientAgents';
import ClientUnifiedCallLogs from './tabs/ClientUnifiedCallLogs';
import ClientAgentAnalytics from './tabs/ClientAgentAnalytics';
import ClientContacts from './tabs/ClientContacts';
import ClientCampaigns from './tabs/ClientCampaigns';
import ClientLeadIntelligence from './tabs/ClientLeadIntelligence';
import ClientCustomers from './tabs/ClientCustomers';

export const ClientPanelLayout: React.FC = () => {
  const navigate = useNavigate();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Back Button and Title */}
            <div className="flex items-center gap-4">
              <Button
                onClick={handleBackToDashboard}
                className="flex items-center gap-2 bg-white border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white transition-colors font-semibold"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
              <div className="border-l border-gray-300 h-8" />
              <h1 className="text-2xl font-bold text-gray-900">
                Client Analytics Panel
              </h1>
            </div>

            {/* Right: Client Selector */}
            <ClientSelector
              selectedUserId={selectedUserId}
              onSelectUser={setSelectedUserId}
            />
          </div>
        </div>
      </div>

      {/* Aggregate Metrics Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <ClientMetrics userId={selectedUserId} />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7 mb-6 bg-white border border-gray-200">
            <TabsTrigger value="overview" className="data-[state=active]:bg-gray-900 data-[state=active]:text-white">Overview</TabsTrigger>
            <TabsTrigger value="agents" className="data-[state=active]:bg-gray-900 data-[state=active]:text-white">Agents</TabsTrigger>
            <TabsTrigger value="call-logs" className="data-[state=active]:bg-gray-900 data-[state=active]:text-white">Unified Call Logs</TabsTrigger>
            <TabsTrigger value="agent-analytics" className="data-[state=active]:bg-gray-900 data-[state=active]:text-white">Agent Analytics</TabsTrigger>
            <TabsTrigger value="contacts" className="data-[state=active]:bg-gray-900 data-[state=active]:text-white">Contacts</TabsTrigger>
            <TabsTrigger value="campaigns" className="data-[state=active]:bg-gray-900 data-[state=active]:text-white">Campaigns</TabsTrigger>
            <TabsTrigger value="lead-intelligence" className="data-[state=active]:bg-gray-900 data-[state=active]:text-white">Lead Management</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <ClientOverview userId={selectedUserId} />
          </TabsContent>

          <TabsContent value="agents">
            <ClientAgents userId={selectedUserId} />
          </TabsContent>

          <TabsContent value="call-logs">
            <ClientUnifiedCallLogs userId={selectedUserId} />
          </TabsContent>

          <TabsContent value="agent-analytics">
            <ClientAgentAnalytics userId={selectedUserId} />
          </TabsContent>

          <TabsContent value="contacts">
            <ClientContacts userId={selectedUserId} />
          </TabsContent>

          <TabsContent value="campaigns">
            <ClientCampaigns userId={selectedUserId} />
          </TabsContent>

          <TabsContent value="lead-intelligence">
            <ClientLeadIntelligence userId={selectedUserId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ClientPanelLayout;
