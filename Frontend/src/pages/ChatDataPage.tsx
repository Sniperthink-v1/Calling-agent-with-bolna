import Dashboard from "./Dashboard";

/**
 * This page shows the Chat Data tab within the dashboard shell (sidebar, topnav, etc).
 * Mobile & desktop responsive.
 * Keeps all design, flow, and structure exactly as elsewhere in the dashboard.
 */
const ChatDataPage = () => {
  // Keep legacy route but open the unified Logs tab on Chat view
  return <Dashboard initialTab="logs" initialSubTab="chat" />;
};

export default ChatDataPage;
