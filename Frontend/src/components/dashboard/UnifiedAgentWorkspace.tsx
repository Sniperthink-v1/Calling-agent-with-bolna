import { BarChart3, FileText, MessageSquare, Phone, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme/ThemeProvider";
import CallingAgent from "@/components/dashboard/CallingAgent";
import ChatAgent from "@/components/dashboard/ChatAgent";
import SalespersonAgent from "@/components/dashboard/SalespersonAgent";
import type { Lead } from "@/pages/Dashboard";

type WorkspaceMode = "logs" | "analytics";
type Channel = "call" | "chat" | "human";

interface UnifiedAgentWorkspaceProps {
  mode: WorkspaceMode;
  channel: Channel;
  onChannelChange: (channel: Channel) => void;
  onOpenProfile?: (lead: Lead) => void;
}

const UnifiedAgentWorkspace = ({
  mode,
  channel,
  onChannelChange,
  onOpenProfile,
}: UnifiedAgentWorkspaceProps) => {
  const { theme } = useTheme();

  const channelOptions: Array<{
    id: Channel;
    label: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  }> = [
    { id: "call", label: "Call", icon: Phone },
    { id: "chat", label: "Chat", icon: MessageSquare },
    { id: "human", label: "Human", icon: UserCheck },
  ];

  const icon = mode === "logs" ? FileText : BarChart3;
  const sectionTitle = mode === "logs" ? "Unified Logs" : "Unified Analytics";
  const callSubTab = mode === "logs" ? "logs" : "analytics";
  const chatSubTab = mode === "logs" ? "logs" : "analytics";
  const humanSubTab = mode === "logs" ? "activity-logs" : "analytics";

  const renderChannelContent = () => {
    if (channel === "call") {
      return (
        <CallingAgent
          activeTab={mode}
          activeSubTab={callSubTab}
          setActiveSubTab={() => {}}
          onOpenProfile={onOpenProfile}
        />
      );
    }

    if (channel === "chat") {
      return (
        <ChatAgent
          activeTab={mode}
          activeSubTab={chatSubTab}
          setActiveSubTab={() => {}}
          onOpenProfile={onOpenProfile}
        />
      );
    }

    return (
      <SalespersonAgent
        activeTab={mode}
        activeSubTab={humanSubTab}
        setActiveSubTab={() => {}}
      />
    );
  };

  const SectionIcon = icon;

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 pt-6 pb-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <SectionIcon className="w-5 h-5" />
          <h2 className="text-xl font-semibold">{sectionTitle}</h2>
        </div>
        <div
          className={`inline-flex items-center rounded-xl p-1 border ${
            theme === "dark"
              ? "bg-slate-900 border-slate-700"
              : "bg-slate-50 border-slate-200"
          }`}
        >
          {channelOptions.map((option) => {
            const OptionIcon = option.icon;
            const isActive = channel === option.id;

            return (
              <Button
                key={option.id}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChannelChange(option.id)}
                className={`rounded-lg px-3 ${
                  isActive
                    ? "bg-[#1A6262] text-white hover:bg-[#145353] hover:text-white"
                    : ""
                }`}
              >
                <OptionIcon className="w-4 h-4 mr-2" />
                {option.label}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 min-h-0">{renderChannelContent()}</div>
    </div>
  );
};

export default UnifiedAgentWorkspace;
