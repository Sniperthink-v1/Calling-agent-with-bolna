import { createContext, useContext, useState, ReactNode } from 'react';

interface NavigationContextType {
  activeTab: string;
  activeSubTab: string;
  setActiveTab: (tab: string) => void;
  setActiveSubTab: (subTab: string) => void;
  navigateToLeadIntelligence: (identifier?: { phone?: string; email?: string } | string) => void;
  targetLeadIdentifier: { phone?: string; email?: string } | null;
  clearTargetLeadId: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

interface NavigationProviderProps {
  children: ReactNode;
  initialTab?: string;
  initialSubTab?: string;
}

export const NavigationProvider = ({ 
  children, 
  initialTab = "overview", 
  initialSubTab = "" 
}: NavigationProviderProps) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [activeSubTab, setActiveSubTab] = useState(initialSubTab);
  const [targetLeadIdentifier, setTargetLeadIdentifier] = useState<{ phone?: string; email?: string } | null>(null);

  const navigateToLeadIntelligence = (identifier?: { phone?: string; email?: string } | string) => {
    console.log('Navigating to Lead Intelligence with identifier:', identifier);
    setActiveTab("lead-intelligence");
    setActiveSubTab("");
    
    // Handle both old string format (for backward compatibility) and new object format
    if (typeof identifier === 'string') {
      // Legacy support - just clear it since we can't match by UUID
      setTargetLeadIdentifier(null);
    } else {
      setTargetLeadIdentifier(identifier || null);
    }
  };

  const clearTargetLeadId = () => {
    setTargetLeadIdentifier(null);
  };

  const value = {
    activeTab,
    activeSubTab,
    setActiveTab,
    setActiveSubTab,
    navigateToLeadIntelligence,
    targetLeadIdentifier,
    clearTargetLeadId,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
