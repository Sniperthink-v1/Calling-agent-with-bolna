import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAgents } from "@/hooks/useAgents";
import CallLogs from "@/components/call/CallLogs";
import type { Campaign } from "@/types/api";
import type { Lead } from "@/pages/Dashboard";
import { authenticatedFetch } from "@/utils/auth";

interface UnifiedCallLogsProps {
  activeTab: string;
  activeSubTab: string;
  onOpenProfile?: (lead: Lead) => void;
  initialCampaignId?: string; // Allow passing a campaign ID to pre-filter
}

const UnifiedCallLogs = ({ activeTab, activeSubTab, onOpenProfile, initialCampaignId }: UnifiedCallLogsProps) => {
  const { agents } = useAgents();
  // Filter to get only call agents
  const callAgents = agents.filter(agent => agent.type === "CallAgent");
  
  // Multi-select for call logs (keeping existing functionality)
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  
  // Single-select for campaign filter (NEW)
  // Check sessionStorage for campaign filter on mount
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(() => {
    if (initialCampaignId) return initialCampaignId;
    const stored = sessionStorage.getItem('filterCampaignId');
    if (stored) {
      sessionStorage.removeItem('filterCampaignId'); // Clear after reading
      return stored;
    }
    return null;
  });
  
  // Fetch campaigns list for filter dropdown
  const { data: campaignsData } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const response = await authenticatedFetch('/api/campaigns');
      if (!response.ok) throw new Error('Failed to fetch campaigns');
      return response.json();
    },
  });
  
  const campaigns: Campaign[] = campaignsData?.campaigns || [];
  
  // Handle agent selection/deselection
  const handleAgentToggle = (agentId: string) => {
    setSelectedAgents(prev => 
      prev.includes(agentId) 
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  // Clear all selected agents
  const clearAllAgents = () => {
    setSelectedAgents([]);
  };

  // Select all agents
  const selectAllAgents = () => {
    setSelectedAgents(callAgents.map(agent => agent.id));
  };

  // Get selected agent names for display
  const getSelectedAgentNames = () => {
    return callAgents
      .filter(agent => selectedAgents.includes(agent.id))
      .map(agent => agent.name);
  };

  // Debug logging
  useEffect(() => {
    const mappedAgents = selectedAgents.length === 0 
      ? [] 
      : callAgents
        .filter(agent => selectedAgents.includes(agent.id))
        .map(agent => agent.elevenlabsAgentId);
        
    console.log('UnifiedCallLogs Debug:', {
      selectedAgents,
      selectedAgentsLength: selectedAgents.length,
      callAgents: callAgents.length,
      callAgentIds: callAgents.map(a => a.id),
      agentMapping: callAgents.map(agent => ({ 
        id: agent.id, 
        elevenlabsAgentId: agent.elevenlabsAgentId,
        name: agent.name 
      })),
      mappedAgents,
      selectedAgentFilter: selectedAgents.map(id => {
        const agent = callAgents.find(a => a.id === id);
        return agent ? { id: agent.id, elevenlabsAgentId: agent.elevenlabsAgentId, name: agent.name } : { id, notFound: true };
      })
    });
  }, [selectedAgents, callAgents]);

  return (
    <div className="space-y-4">
      {/* Call Logs Component with Filter Controls */}
      <div className="min-h-[400px]">
        <CallLogs 
          activeTab={activeTab}
          activeSubTab={activeSubTab}
          selectedAgents={(() => {
            if (selectedAgents.length === 0) return [];
            
            // Map selected agent IDs to agent names since elevenlabsAgentId is undefined
            const mapped = callAgents
              .filter(agent => selectedAgents.includes(agent.id))
              .map(agent => agent.name);
              
            console.log('🔍 Agent Mapping Debug (using names):', {
              selectedAgents,
              filteredAgents: callAgents.filter(agent => selectedAgents.includes(agent.id)),
              mappedNames: mapped,
              allAgents: callAgents.map(a => ({ id: a.id, elevenlabsAgentId: a.elevenlabsAgentId, name: a.name }))
            });
            
            return mapped;
          })()}
          selectedCampaign={selectedCampaign}
          onOpenProfile={onOpenProfile}
          useLazyLoading={true}
          initialPageSize={30}
          agents={callAgents.map(a => ({ id: a.id, name: a.name }))}
          campaigns={campaigns}
          onAgentFilterChange={(agentNames) => {
            if (agentNames.length === 0) {
              setSelectedAgents([]);
            } else {
              const ids = callAgents
                .filter(a => agentNames.includes(a.name))
                .map(a => a.id);
              setSelectedAgents(ids);
            }
          }}
          onCampaignFilterChange={setSelectedCampaign}
        />
      </div>
    </div>
  );
};

export default UnifiedCallLogs;
