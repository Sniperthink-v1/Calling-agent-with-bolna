import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiService } from "@/services/apiService";
import {
  Calendar,
  Clock,
  Phone,
  Mail,
  Building2,
  User,
  Link as LinkIcon,
  Search,
  Filter,
  Download,
  Send,
  Edit,
  Trash2,
  TrendingUp,
  Star,
} from "lucide-react";
import { format } from "date-fns";
import { useTheme } from "@/components/theme/ThemeProvider";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { RescheduleModal } from "./RescheduleModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DemoSchedule {
  id: string;
  lead_name: string;
  phone_number: string;
  email?: string;
  company?: string;
  demo_scheduled_at: string;
  meeting_link?: string;
  lead_score?: number;
  lead_quality?: string; // hot, warm, cold
  lead_status_tag?: string;
  agent_name?: string;
  notes?: string;
  call_id?: string;
  contact_id?: string;
  demo_status?: string; // 'scheduled', 'cancelled'
  follow_up_date?: string;
  created_at: string;
}

interface DemoScheduleModalProps {
  open: boolean;
  onClose: () => void;
  demos: DemoSchedule[];
  loading?: boolean;
  onRefresh?: () => void;
}

export const DemoScheduleModal = ({
  open,
  onClose,
  demos,
  loading = false,
  onRefresh,
}: DemoScheduleModalProps) => {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterQuality, setFilterQuality] = useState<string>("all");
  const [selectedDemo, setSelectedDemo] = useState<DemoSchedule | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [demoToReschedule, setDemoToReschedule] = useState<DemoSchedule | null>(null);
  const [demoToCancel, setDemoToCancel] = useState<DemoSchedule | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Determine status based on date and demo_status field
  const getDemoStatus = (demo: DemoSchedule) => {
    if (demo.demo_status === 'cancelled') return 'cancelled';
    const now = new Date();
    return new Date(demo.demo_scheduled_at) >= now ? 'upcoming' : 'past';
  };

  // Apply search and filters to all demos
  const filteredDemos = demos.filter((demo) => {
    const matchesSearch =
      !searchQuery ||
      demo.lead_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      demo.phone_number.includes(searchQuery) ||
      demo.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      demo.company?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesQuality =
      filterQuality === "all" || demo.lead_quality === filterQuality;

    return matchesSearch && matchesQuality;
  });

  // Sort demos: upcoming first (sorted ascending), then past (sorted descending), cancelled last
  const sortedDemos = [...filteredDemos].sort((a, b) => {
    const statusA = getDemoStatus(a);
    const statusB = getDemoStatus(b);
    const dateA = new Date(a.demo_scheduled_at).getTime();
    const dateB = new Date(b.demo_scheduled_at).getTime();

    // Priority: upcoming > past > cancelled
    if (statusA === 'upcoming' && statusB !== 'upcoming') return -1;
    if (statusA !== 'upcoming' && statusB === 'upcoming') return 1;
    if (statusA === 'cancelled' && statusB !== 'cancelled') return 1;
    if (statusA !== 'cancelled' && statusB === 'cancelled') return -1;

    // Within same status, sort by date
    if (statusA === 'upcoming') return dateA - dateB; // Ascending for upcoming
    return dateB - dateA; // Descending for past
  });

  const getQualityBadge = (quality?: string) => {
    const badges = {
      hot: (
        <Badge className="bg-red-500/10 text-red-400 border-red-500/20">
          🔥 Hot
        </Badge>
      ),
      warm: (
        <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20">
          ⚡ Warm
        </Badge>
      ),
      cold: (
        <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">
          ❄️ Cold
        </Badge>
      ),
    };
    return badges[quality as keyof typeof badges] || null;
  };

  const getLeadStatusBadge = (statusTag?: string) => {
    if (!statusTag) return null;
    
    const normalizedStatus = statusTag.toLowerCase();
    
    // Hot leads - red background
    if (normalizedStatus.includes('hot') || normalizedStatus.includes('interested') || 
        normalizedStatus.includes('ready') || normalizedStatus.includes('qualified')) {
      return (
        <Badge className="bg-red-500/10 text-red-400 border-red-500/20 capitalize">
          {statusTag}
        </Badge>
      );
    }
    
    // Warm leads - yellow/orange background
    if (normalizedStatus.includes('warm') || normalizedStatus.includes('callback') || 
        normalizedStatus.includes('follow') || normalizedStatus.includes('maybe')) {
      return (
        <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 capitalize">
          {statusTag}
        </Badge>
      );
    }
    
    // Cold leads - blue background
    if (normalizedStatus.includes('cold') || normalizedStatus.includes('not interested') || 
        normalizedStatus.includes('no') || normalizedStatus.includes('unqualified')) {
      return (
        <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 capitalize">
          {statusTag}
        </Badge>
      );
    }
    
    // Default - neutral gray
    return (
      <Badge variant="outline" className="capitalize">
        {statusTag}
      </Badge>
    );
  };

  const handleExportCSV = () => {
    const csvContent = [
      [
        "Lead Name",
        "Phone",
        "Email",
        "Company",
        "Demo Date",
        "Lead Quality",
        "Agent",
      ].join(","),
      ...sortedDemos.map((demo) =>
        [
          demo.lead_name,
          demo.phone_number,
          demo.email || "",
          demo.company || "",
          format(new Date(demo.demo_scheduled_at), "PPpp"),
          demo.lead_quality || "",
          demo.agent_name || "",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `demo-schedules-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Demo schedules exported successfully!");
  };

  const handleSendReminder = async (demo: DemoSchedule) => {
    try {
      await apiService.sendDemoReminder(demo.id);
      toast.success(`Reminder sent to ${demo.lead_name}`);
      onRefresh?.();
    } catch (error) {
      toast.error("Failed to send reminder");
      console.error("Error sending reminder:", error);
    }
  };

  const handleReschedule = (demo: DemoSchedule) => {
    setDemoToReschedule(demo);
    setShowRescheduleModal(true);
    setShowDetails(false);
  };



  const handleCancelClick = (demo: DemoSchedule) => {
    setDemoToCancel(demo);
    setShowCancelDialog(true);
  };

  const handleCancelConfirm = async () => {
    if (!demoToCancel) return;

    try {
      await apiService.cancelDemo(demoToCancel.id);
      toast.success(`Demo cancelled for ${demoToCancel.lead_name}. Cancellation email sent.`);
      setShowCancelDialog(false);
      setDemoToCancel(null);
      setShowDetails(false);
      onRefresh?.();
    } catch (error) {
      toast.error("Failed to cancel demo");
      console.error("Error cancelling demo:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'upcoming':
        return <Badge className="bg-blue-500 text-white">Upcoming</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'past':
        return <Badge variant="secondary">Completed</Badge>;
      default:
        return null;
    }
  };

  const getBorderColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'border-blue-500';
      case 'cancelled':
        return 'border-red-500';
      case 'past':
        return theme === 'dark' ? 'border-slate-700' : 'border-gray-200';
      default:
        return '';
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent
          className={`max-w-6xl max-h-[90vh] overflow-hidden ${
            theme === "dark" ? "bg-slate-900 border-slate-700" : "bg-white"
          }`}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="w-6 h-6 text-blue-400" />
              Demo Schedules ({demos.length})
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, phone, email, company..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={filterQuality} onValueChange={setFilterQuality}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Lead Quality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Qualities</SelectItem>
                  <SelectItem value="hot">Hot Leads</SelectItem>
                  <SelectItem value="warm">Warm Leads</SelectItem>
                  <SelectItem value="cold">Cold Leads</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={sortedDemos.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>

              {onRefresh && (
                <Button variant="outline" size="sm" onClick={onRefresh}>
                  Refresh
                </Button>
              )}
            </div>

            {/* Demo List */}
            <div className="max-h-[60vh] overflow-y-auto">
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <LoadingSpinner />
                </div>
              ) : sortedDemos.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
                  <p className="text-muted-foreground">
                    No demos found
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedDemos.map((demo) => {
                    const status = getDemoStatus(demo);
                    return (
                      <div
                        key={demo.id}
                        className={`p-4 rounded-lg border-2 transition-all hover:shadow-md cursor-pointer ${
                          getBorderColor(status)
                        } ${
                          theme === "dark"
                            ? "bg-slate-800"
                            : "bg-white"
                        }`}
                        onClick={() => {
                          setSelectedDemo(demo);
                          setShowDetails(true);
                        }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            {/* Header Row */}
                            <div className="flex items-center gap-3 flex-wrap">
                              <h3 className="font-semibold text-lg flex items-center gap-2">
                                <User className="w-4 h-4 text-blue-400" />
                                {demo.lead_name}
                              </h3>
                              {getStatusBadge(status)}
                              {getLeadStatusBadge(demo.lead_status_tag)}
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Phone className="w-4 h-4" />
                                {demo.phone_number}
                              </div>

                              {demo.email && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Mail className="w-4 h-4" />
                                  {demo.email}
                                </div>
                              )}

                              {demo.company && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Building2 className="w-4 h-4" />
                                  {demo.company}
                                </div>
                              )}

                              <div className="flex items-center gap-2 text-blue-400 font-medium">
                                <Calendar className="w-4 h-4" />
                                {format(
                                  new Date(demo.demo_scheduled_at),
                                  "MMM dd, yyyy"
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-blue-400 font-medium">
                                <Clock className="w-4 h-4" />
                                {format(new Date(demo.demo_scheduled_at), "hh:mm a")}
                              </div>

                              {demo.agent_name && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <TrendingUp className="w-4 h-4" />
                                  Agent: {demo.agent_name}
                                </div>
                              )}
                            </div>

                            {/* Meeting Link */}
                            {demo.meeting_link && (
                              <div className="flex items-center gap-2">
                                <LinkIcon className="w-4 h-4 text-green-400" />
                                <a
                                  href={demo.meeting_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-green-400 hover:underline text-sm"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Join Meeting
                                </a>
                              </div>
                            )}

                            {/* Notes Preview */}
                            {demo.notes && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {demo.notes}
                              </p>
                            )}
                          </div>

                          {/* Actions */}
                          {status === "upcoming" ? (
                            <div className="flex flex-col gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSendReminder(demo);
                                }}
                              >
                                <Send className="w-4 h-4 mr-1" />
                                Remind
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReschedule(demo);
                                }}
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Reschedule
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelClick(demo);
                                }}
                                className="text-red-400 hover:text-red-300"
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          ) : status === "cancelled" ? (
                            <div className="flex flex-col gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReschedule(demo);
                                }}
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Reschedule
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Demo Details Modal */}
      {selectedDemo && showDetails && (
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent
            className={`max-w-2xl ${
              theme === "dark" ? "bg-slate-900 border-slate-700" : "bg-white"
            }`}
          >
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <User className="w-5 h-5 text-blue-400" />
                {selectedDemo.lead_name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Lead Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Phone Number
                  </label>
                  <p className="text-base">{selectedDemo.phone_number}</p>
                </div>

                {selectedDemo.email && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Email
                    </label>
                    <p className="text-base">{selectedDemo.email}</p>
                  </div>
                )}

                {selectedDemo.company && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Company
                    </label>
                    <p className="text-base">{selectedDemo.company}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Lead Status
                  </label>
                  <p className="text-base mt-1">{selectedDemo.lead_status_tag || 'N/A'}</p>
                </div>

                {selectedDemo.agent_name && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Assigned Agent
                    </label>
                    <p className="text-base">{selectedDemo.agent_name}</p>
                  </div>
                )}
              </div>

              {/* Demo Details */}
              <div className="border-t border-border pt-4">
                <h3 className="font-semibold mb-3">Demo Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Scheduled Date
                    </label>
                    <p className="text-base">
                      {format(
                        new Date(selectedDemo.demo_scheduled_at),
                        "MMMM dd, yyyy"
                      )}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Scheduled Time
                    </label>
                    <p className="text-base">
                      {format(new Date(selectedDemo.demo_scheduled_at), "PPpp")}
                    </p>
                  </div>

                  {selectedDemo.meeting_link && (
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        Meeting Link
                      </label>
                      <a
                        href={selectedDemo.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline block mt-1"
                      >
                        {selectedDemo.meeting_link}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {selectedDemo.notes && (
                <div className="border-t border-border pt-4">
                  <label className="text-sm font-medium text-muted-foreground">
                    Notes from Call
                  </label>
                  <p className="text-base mt-2 whitespace-pre-wrap">
                    {selectedDemo.notes}
                  </p>
                </div>
              )}

              {/* Follow-up Info */}
              {selectedDemo.follow_up_date && (
                <div className="border-t border-border pt-4">
                  <h3 className="font-semibold mb-3">Follow-up</h3>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Follow-up Scheduled
                    </label>
                    <p className="text-base mt-1">
                      {format(
                        new Date(selectedDemo.follow_up_date),
                        "MMMM dd, yyyy"
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between gap-2 pt-4 border-t border-border">
              <div className="flex gap-2">
                {getDemoStatus(selectedDemo) === "upcoming" ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendReminder(selectedDemo)}
                    >
                      Send Reminder
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReschedule(selectedDemo)}
                    >
                      Reschedule
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        handleCancelClick(selectedDemo);
                      }}
                    >
                      Cancel Demo
                    </Button>
                  </>
                ) : getDemoStatus(selectedDemo) === "cancelled" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReschedule(selectedDemo)}
                  >
                    Reschedule
                  </Button>
                ) : null}
              </div>
              <Button variant="outline" onClick={() => setShowDetails(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Reschedule Modal */}
      <RescheduleModal
        open={showRescheduleModal}
        onClose={() => setShowRescheduleModal(false)}
        demo={demoToReschedule}
        onSuccess={() => {
          setShowRescheduleModal(false);
          onRefresh?.();
        }}
      />

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Demo Meeting?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the demo with{" "}
              <strong>{demoToCancel?.lead_name}</strong>?
              <br />
              <br />
              This will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Mark the meeting as cancelled in the system</li>
                <li>Send a cancellation email to the attendee</li>
                <li>Cancel the Google Calendar event (if connected)</li>
              </ul>
              <br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Meeting</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Cancel Meeting
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
