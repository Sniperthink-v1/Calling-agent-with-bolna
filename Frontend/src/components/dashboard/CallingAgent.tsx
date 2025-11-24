import { useState } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import UnifiedCallLogs from "@/components/call/UnifiedCallLogs";
import UnifiedCallAnalytics from "@/components/call/UnifiedCallAnalytics";
import type { Lead } from "@/pages/Dashboard";

interface CallingAgentProps {
  activeTab: string;
  activeSubTab: string;
  setActiveSubTab: (subTab: string) => void;
  onOpenProfile?: (lead: Lead) => void;
}

const CallingAgent = ({
  activeTab,
  activeSubTab,
  setActiveSubTab,
  onOpenProfile,
}: CallingAgentProps) => {
  const { theme } = useTheme();

  // Debug logging
  console.log('CallingAgent received activeSubTab:', activeSubTab);

  const renderSubTabContent = () => {
    switch (activeSubTab) {
      case "logs":
        return <UnifiedCallLogs activeTab={activeTab} activeSubTab={activeSubTab} onOpenProfile={onOpenProfile} />;
      case "analytics":
        return <UnifiedCallAnalytics />;
      default:
        return <UnifiedCallLogs activeTab={activeTab} activeSubTab={activeSubTab} onOpenProfile={onOpenProfile} />;
    }
  };

  return (
    <div
      className={`p-6 space-y-6 ${
        theme === "dark" ? "bg-black text-white" : "bg-white text-gray-900"
      }`}
    >
      {renderSubTabContent()}
    </div>
  );
};

export default CallingAgent;
