import {
  Phone,
  Settings as SettingsIcon,
  BarChart3,
  Database,
  Users2,
  LayoutDashboard,
  Brain,
  FileText,
  Shield,
  Bell,
  UserCheck,
  Target,
  Send,
  Plug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminWebSocket } from "@/hooks/useAdminWebSocket";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import SidebarPanel from "./SidebarPanel";

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  subTabs?: SubTab[];
}

interface SubTab {
  id: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  subTabs?: SubTab[];
}

interface SidebarProps {
  agents: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeSubTab: string;
  setActiveSubTab: (subTab: string) => void;
  onInviteTeam: () => void;
  collapsed?: boolean;
  onToggle?: () => void;
}

const Sidebar = ({
  agents,
  activeTab,
  setActiveTab,
  activeSubTab,
  setActiveSubTab,
  onInviteTeam,
  collapsed = false,
  onToggle,
}: SidebarProps) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [adminNotifications, setAdminNotifications] = useState(0);

  // Check if user has admin privileges
  const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');

  // Use admin WebSocket for real-time notifications (only if admin)
  const { notifications } = useAdminWebSocket();

  // Update admin notification count
  useEffect(() => {
    if (isAdmin && notifications) {
      const unreadCount = notifications.filter(n => !n.read).length;
      setAdminNotifications(unreadCount);
    }
  }, [isAdmin, notifications]);

  // No-op logout handler to prevent error
  const handleLogout = () => { };

  const menuItems: MenuItem[] = [
    {
      id: "overview",
      label: "Overview",
      icon: LayoutDashboard,
    },
    {
      id: "agents",
      label: "Agents",
      icon: Users2,
      subTabs: [
        {
          id: "ai-agents",
          label: "AI Agents",
          icon: Brain,
        },
        {
          id: "human-agents",
          label: "Human Agents",
          icon: UserCheck,
        },
      ],
    },
    {
      id: "logs",
      label: "Logs",
      icon: FileText,
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: BarChart3,
    },
    {
      id: "imported-data",
      label: "Contacts",
      icon: Database,
    },
    {
      id: "dialer",
      label: "Make a Call",
      icon: Phone,
      subTabs: [
        {
          id: "dialer-make-call",
          label: "Make a Call",
          icon: Phone,
        },
        {
          id: "dialer-logs",
          label: "Dialer Logs",
          icon: Phone,
        },
        {
          id: "dialer-analytics",
          label: "Dialer Analysis",
          icon: BarChart3,
        },
      ],
    },
    {
      id: "campaigns",
      label: "Campaigns",
      icon: Target,
      subTabs: [
        {
          id: "campaigns-list",
          label: "Campaign Manager",
          icon: Target,
        },
        {
          id: "campaigns-settings",
          label: "Settings",
          icon: SettingsIcon,
        },
      ],
    },
    {
      id: "templates",
      label: "Templates",
      icon: Send,
      subTabs: [
        {
          id: "whatsapp-templates",
          label: "WhatsApp Templates",
          icon: Send,
        },
        {
          id: "email-templates",
          label: "Email Templates",
          icon: FileText,
        },
      ],
    },
    {
      id: "lead-intelligence",
      label: "Lead Management",
      icon: Brain,
    },
    {
      id: "customers",
      label: "Customers",
      icon: UserCheck,
    },
    {
      id: "integrations",
      label: "Integrations",
      icon: Plug,
    },
    {
      id: "auto-engagement",
      label: "Auto Engagement",
      icon: BarChart3,
      subTabs: [
        {
          id: "auto-engagement-flows",
          label: "Flow Manager",
          icon: Target,
        },
        {
          id: "auto-engagement-executions",
          label: "Execution Logs",
          icon: Bell,
        },
        {
          id: "auto-engagement-analytics",
          label: "Analytics",
          icon: BarChart3,
        },
      ],
    },
    {
      id: "profile",
      label: "Settings",
      icon: SettingsIcon,
    },
  ];

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    if (tabId === "agents") {
      setActiveSubTab("ai-agents");
    } else if (tabId === "logs") {
      setActiveSubTab("call");
    } else if (tabId === "analytics") {
      setActiveSubTab("call");
    } else if (tabId === "campaigns") {
      setActiveSubTab("campaigns-list");
    } else if (tabId === "dialer") {
      setActiveSubTab("dialer-make-call");
    } else if (tabId === "auto-engagement") {
      setActiveSubTab("auto-engagement-flows");
    } else if (tabId === "templates") {
      setActiveSubTab("whatsapp-templates");
    }
  };

  return (
    <>
      <div
        className={`w-full h-screen border-r flex flex-col ${theme === "dark"
          ? "bg-black border-slate-700"
          : "bg-white border-gray-200"
          }`}
      >
        <div className="p-6 flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center mb-8">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "#1A6262" }}
            >
              <span className="text-white font-bold">⚡</span>
            </div>
            <h1
              className={`text-xl font-bold ml-3 ${theme === "dark" ? "text-white" : "text-gray-900"
                }`}
            >
              SniperThink
            </h1>
          </div>
          <nav className="space-y-2 overflow-y-auto flex-1 pr-2 scrollbar-hide">
            {/* Admin Panel Link */}
            {isAdmin && (
              <>
                <Link
                  to="/admin"
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors ${theme === "dark"
                    ? "text-slate-300 hover:bg-slate-700 hover:text-white"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    } border-2 border-teal-200 bg-teal-50 hover:bg-teal-100`}
                >
                  <div className="flex items-center">
                    <Shield className="w-5 h-5 mr-3 text-teal-600" />
                    <span className="font-medium text-teal-800">Admin Panel</span>
                  </div>
                  {adminNotifications > 0 && (
                    <div className="flex items-center space-x-1">
                      <Bell className="w-4 h-4 text-teal-600" />
                      <Badge 
                        variant="destructive" 
                        className="h-5 min-w-[20px] text-xs flex items-center justify-center"
                      >
                        {adminNotifications > 99 ? '99+' : adminNotifications}
                      </Badge>
                    </div>
                  )}
                </Link>

                {/* Client Panel Link */}
                <Link
                  to="/client-panel"
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors ${theme === "dark"
                    ? "text-slate-300 hover:bg-slate-700 hover:text-white"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    } border-2 border-purple-200 bg-purple-50 hover:bg-purple-100`}
                >
                  <div className="flex items-center">
                    <Users2 className="w-5 h-5 mr-3 text-purple-600" />
                    <span className="font-medium text-purple-800">Client Panel</span>
                  </div>
                </Link>
              </>
            )}

            {menuItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = activeTab === item.id;
              
              // If item has no subTabs, render simple button
              if (!item.subTabs || item.subTabs.length === 0) {
                return (
                  <div key={item.id}>
                    <button
                      onClick={() => handleTabClick(item.id)}
                      className={`w-full flex items-center px-4 py-3 rounded-lg text-left transition-colors ${isActive
                        ? "text-white"
                        : theme === "dark"
                          ? "text-slate-300 hover:bg-slate-700 hover:text-white"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                        }`}
                      style={isActive ? { backgroundColor: "#1A6262" } : {}}
                    >
                      <IconComponent className="w-5 h-5 mr-3" />
                      {item.label}
                    </button>
                  </div>
                );
              }
              
              // Menu items with subTabs (agents, campaigns, etc.):
              return (
                <div key={item.id}>
                  <button
                    onClick={() => handleTabClick(item.id)}
                    className={`w-full flex items-center px-4 py-3 rounded-lg text-left transition-colors ${isActive
                      ? "text-white"
                      : theme === "dark"
                        ? "text-slate-300 hover:bg-slate-700 hover:text-white"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    style={isActive ? { backgroundColor: "#1A6262" } : {}}
                  >
                    <IconComponent className="w-5 h-5 mr-3" />
                    {item.label}
                  </button>
                  {/* Only show subtabs if active */}
                  {isActive && (
                    <div className="ml-6 mt-2 space-y-1">
                      {item.subTabs?.map((subTab) => {
                        const SubIconComponent = subTab.icon;
                        const isSubActive = activeSubTab === subTab.id;
                        return (
                          <button
                            key={subTab.id}
                            onClick={() => setActiveSubTab(subTab.id)}
                            className={`w-full flex items-center px-4 py-2 rounded-lg text-left text-sm transition-colors ${isSubActive
                              ? theme === "dark"
                                ? "bg-slate-600 text-white"
                                : "bg-gray-200 text-gray-900"
                              : theme === "dark"
                                ? "text-slate-400 hover:bg-slate-700 hover:text-white"
                                : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                              }`}
                          >
                            <SubIconComponent className="w-4 h-4 mr-3" />
                            {subTab.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </div>
      <SidebarPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        onInviteTeam={() => {
          setIsPanelOpen(false);
          onInviteTeam();
        }}
        onLogout={handleLogout}
      />
    </>
  );
};

export default Sidebar;
