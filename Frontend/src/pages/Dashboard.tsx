import { useEffect, useState } from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import Integrations from "@/components/dashboard/Integrations";
import Profile from "@/components/dashboard/Profile";
import TopNavigation from "@/components/dashboard/TopNavigation";
import LeadIntelligence from "@/components/dashboard/LeadIntelligence";
import ImportedData from "@/components/dashboard/ImportedData";
import Customers from "@/components/dashboard/Customers";
import SalespersonAgent from "@/components/dashboard/SalespersonAgent";
import UnifiedAgentWorkspace from "@/components/dashboard/UnifiedAgentWorkspace";
import Campaigns from "@/pages/Campaigns";
import CampaignSettings from "@/pages/CampaignSettings";
import Templates from "@/pages/Templates";
import EmailTemplates from "@/pages/EmailTemplates";
import AutoEngagementFlows from "@/pages/AutoEngagementFlows";
import AutoEngagementExecutions from "@/pages/AutoEngagementExecutions";
import AutoEngagementAnalytics from "@/pages/AutoEngagementAnalytics";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useAgents } from "@/contexts/AgentContext";
import { NavigationProvider, useNavigation } from "@/contexts/NavigationContext";
import { Toaster } from "sonner";
import LeadProfileTab from "@/components/chat/LeadProfileTab";
import Overview from "@/pages/Overview";
import Agents from "@/pages/Agents";
import PlivoDialer from "@/pages/PlivoDialer";
import PlivoDialerLogs from "@/pages/PlivoDialerLogs";
import PlivoDialerAnalytics from "@/pages/PlivoDialerAnalytics";
import { DashboardErrorBoundary } from "@/components/ui/ErrorBoundaryWrapper";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";

export interface ChatMessage {
  from: string;
  message: string;
  time: string;
}

export interface TimelineEntry {
  id: number | string;
  type: string;
  interactionAgent?: string;
  interactionDate?: string;
  platform?: string;
  leadType?: string;
  businessType?: string;
  status?: string;
  useCase?: string;
  messages?: number | null;
  duration?: string | null;
  engagementLevel?: string;
  intentLevel?: string;
  budgetConstraint?: string;
  timelineUrgency?: string;
  followUpScheduled?: string;
  demoScheduled?: string;
  actions?: string;
  queries?: number;
  query?: string;
  audioUrl?: string;
  recording?: boolean;
  transcript?: string | string[];
  chatHistory?: ChatMessage[];
  date?: string;
}

export interface Lead {
  id: number | string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  businessType?: string;
  leadType?: string;
  leadTag?: string;
  agentType?: string;
  interactions?: number;
  engagementLevel?: string;
  intentLevel?: string;
  budgetConstraint?: string;
  timelineUrgency?: string;
  useCase?: string;
  timeline?: TimelineEntry[];
  followUpScheduled?: string;
  demoScheduled?: string;
}

// Agents are now managed by the useAgents hook in AgentManager

interface DashboardProps {
  initialTab?: string;
  initialSubTab?: string;
  customContent?: React.ReactNode;
}

// Dashboard content component that uses navigation context
const DashboardContent = ({
  customContent,
}: Omit<DashboardProps, 'initialTab' | 'initialSubTab'>) => {
  const { theme } = useTheme();
  const { agents } = useAgents();
  const { activeTab, activeSubTab, setActiveTab, setActiveSubTab } = useNavigation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Agents are now managed by the useAgents hook from AgentContext

  // State for profile/lead viewing
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  // Track where the lead profile launched from ("chat" | "call"), to restore on back
  const [profileAgentTab, setProfileAgentTab] = useState<string | null>(null);
  const [profileAgentSubTab, setProfileAgentSubTab] = useState<string | null>(
    null
  );

  // Handler that child passes when clicking on a lead in Chat/Call data tabs
  const handleOpenProfile = (
    lead: Lead,
    agentTab: string = "chat",
    agentSubTab: string = "data"
  ) => {
    setProfileAgentTab(agentTab);
    setProfileAgentSubTab(agentSubTab);
    setSelectedLead(lead);
  };

  const handleBackFromProfile = () => {
    setSelectedLead(null);
    setProfileAgentTab(null);
    setProfileAgentSubTab(null);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab !== "profile") {
      setSelectedLead(null);
      setProfileAgentTab(null);
      setProfileAgentSubTab(null);
    }
    if (tab === "agents") {
      setActiveSubTab("ai-agents");
    } else if (tab === "logs" || tab === "analytics") {
      setActiveSubTab("call");
    }
  };

  const normalizeChannel = (subTab: string): "call" | "chat" | "human" => {
    if (subTab === "chat") return "chat";
    if (subTab === "human") return "human";
    return "call";
  };

  useEffect(() => {
    const legacySubTabMap: Record<string, { tab: string; subTab: string }> = {
      "agent-manager": { tab: "agents", subTab: "ai-agents" },
      "calling-agent": { tab: "logs", subTab: "call" },
      "calling-agent-logs": { tab: "logs", subTab: "call" },
      "calling-agent-analytics": { tab: "analytics", subTab: "call" },
      "chat-agent": { tab: "logs", subTab: "chat" },
      "chat-agent-logs": { tab: "logs", subTab: "chat" },
      "chat-agent-analytics": { tab: "analytics", subTab: "chat" },
      salesperson: { tab: "analytics", subTab: "human" },
      "salesperson-analytics": { tab: "analytics", subTab: "human" },
      "salesperson-activity-logs": { tab: "logs", subTab: "human" },
    };

    const mappedFromLegacySubTab = legacySubTabMap[activeSubTab];
    if (mappedFromLegacySubTab) {
      if (
        activeTab !== mappedFromLegacySubTab.tab ||
        activeSubTab !== mappedFromLegacySubTab.subTab
      ) {
        setActiveTab(mappedFromLegacySubTab.tab);
        setActiveSubTab(mappedFromLegacySubTab.subTab);
      }
      return;
    }

    if (activeTab === "chat") {
      setActiveTab("logs");
      setActiveSubTab("chat");
      return;
    }

    if (activeTab === "agents") {
      if (!activeSubTab) {
        setActiveSubTab("ai-agents");
        return;
      }

      if (activeSubTab !== "ai-agents" && activeSubTab !== "human-agents") {
        setActiveSubTab("ai-agents");
      }
      return;
    }

    if (activeTab === "logs" || activeTab === "analytics") {
      const isValidChannel =
        activeSubTab === "call" || activeSubTab === "chat" || activeSubTab === "human";
      if (!isValidChannel) {
        setActiveSubTab("call");
      }
    }
  }, [activeTab, activeSubTab, setActiveTab, setActiveSubTab]);

  const isAgentsTab = activeTab === "agents";

  const renderContent = () => {
    if (selectedLead) {
      return (
        <LeadProfileTab lead={selectedLead} onBack={handleBackFromProfile} />
      );
    }
    if (activeTab === "profile") {
      return <Profile />;
    }
    if (activeTab === "overview") {
      return (
        <DashboardErrorBoundary>
          <Overview />
        </DashboardErrorBoundary>
      );
    }
    if (activeTab === "imported-data") {
      return <ImportedData onOpenProfile={handleOpenProfile} />;
    }
    if (activeTab === "dialer") {
      if (activeSubTab === "dialer-logs") {
        return <PlivoDialerLogs />;
      }
      if (activeSubTab === "dialer-analytics") {
        return <PlivoDialerAnalytics />;
      }
      return <PlivoDialer />;
    }
    if (activeTab === "campaigns") {
      console.log('Campaign tab active, activeSubTab:', activeSubTab);
      if (activeSubTab === "campaigns-settings") {
        return <CampaignSettings />;
      }
      if (activeSubTab === "campaigns-list") {
        return <Campaigns />;
      }
      // Default to campaigns list if no sub-tab specified
      return <Campaigns />;
    }
    if (activeTab === "templates") {
      if (activeSubTab === "whatsapp-templates") {
        return <Templates />;
      }
      if (activeSubTab === "email-templates") {
        return <EmailTemplates />;
      }
      // Default to WhatsApp templates
      return <Templates />;
    }
    if (activeTab === "lead-intelligence") {
      return <LeadIntelligence onOpenProfile={handleOpenProfile} />;
    }
    if (activeTab === "customers") {
      return (
        <DashboardErrorBoundary>
          <Customers />
        </DashboardErrorBoundary>
      );
    }
    if (isAgentsTab) {
      if (activeSubTab === "human-agents") {
        return (
          <SalespersonAgent
            activeSubTab="analytics"
            activeTab={activeTab}
            setActiveSubTab={() => {}}
          />
        );
      }

      // Default agents view is AI agents manager
      return <Agents />;
    }
    if (activeTab === "logs" || activeTab === "analytics") {
      return (
        <UnifiedAgentWorkspace
          mode={activeTab}
          channel={normalizeChannel(activeSubTab)}
          onChannelChange={(channel) => setActiveSubTab(channel)}
          onOpenProfile={(lead: Lead) =>
            handleOpenProfile(lead, normalizeChannel(activeSubTab), "logs")
          }
        />
      );
    }
    if (activeTab === "integrations") {
      return <Integrations />;
    }
    if (activeTab === "auto-engagement") {
      if (activeSubTab === "auto-engagement-executions") {
        return <AutoEngagementExecutions />;
      }
      if (activeSubTab === "auto-engagement-analytics") {
        return <AutoEngagementAnalytics />;
      }
      // Default to flows manager
      return <AutoEngagementFlows />;
    }
    return (
      <DashboardErrorBoundary>
        <Overview />
      </DashboardErrorBoundary>
    );
  };

  return (
    <div
      className={`h-screen flex flex-col ${theme === "dark" ? "bg-black text-white" : "bg-gray-50 text-gray-900"
        }`}
    >
      {/* Impersonation Banner - shows when admin is viewing as user */}
      <ImpersonationBanner />
      
      {/* Main dashboard container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar with fixed width */}
        <div className={`${sidebarCollapsed ? 'w-0' : 'w-64'} flex-shrink-0 transition-all duration-300 overflow-hidden h-full`}>
          <Sidebar
            agents={agents.map(agent => ({
              id: agent.id,
              name: agent.name,
              type: agent.type || 'CallAgent' // Provide default type
            }))}
            activeTab={activeTab}
            setActiveTab={handleTabChange}
            activeSubTab={activeSubTab}
            setActiveSubTab={setActiveSubTab}
            onInviteTeam={() => { }}
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </div>
        
        {/* Main content area with proper constraints and full height border */}
        <div className={`flex-1 flex flex-col min-w-0 h-full ${!sidebarCollapsed ? 'sidebar-separator' : ''}`}>
          <TopNavigation 
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
          <main className="flex-1 overflow-hidden">
            <div className="h-full overflow-auto invisible-scrollbar">
              {renderContent()}
            </div>
          </main>
        </div>
      </div>
      <Toaster position="bottom-right" />
    </div>
  );
};

// Main Dashboard component with NavigationProvider
const Dashboard = ({
  initialTab = "overview",
  initialSubTab = "",
  customContent,
}: DashboardProps) => {
  return (
    <NavigationProvider initialTab={initialTab} initialSubTab={initialSubTab}>
      <DashboardContent customContent={customContent} />
    </NavigationProvider>
  );
};

export default Dashboard;
