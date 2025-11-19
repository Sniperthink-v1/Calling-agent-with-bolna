import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Flame,
  Phone,
  Mail,
  Building2,
  Calendar,
  Search,
  Filter,
  Download,
  Play,
  Pause,
  FileText,
  TrendingUp,
  User,
  X,
  Volume2,
  Volume1,
  VolumeX,
  Loader2,
  MessageSquare,
  Clock,
  Target,
  DollarSign,
  Zap,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { useTheme } from "@/components/theme/ThemeProvider";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { apiService } from "@/services/apiService";
import { toast } from "sonner";
import CallTranscriptViewer from "./CallTranscriptViewer";
import InteractionDetailsModal from "@/components/dashboard/InteractionDetailsModal";
import type { Call } from "@/types";
import { cn } from "@/lib/utils";

interface HotLeadsModalProps {
  open: boolean;
  onClose: () => void;
  dateFrom?: string;
  dateTo?: string;
  selectedAgentId?: string;
  selectedCallSource?: string;
}

interface HotLead extends Call {
  // Snake_case properties from API (raw backend response)
  lead_name?: string;
  lead_status_tag?: string;
  total_score?: number;
  intent_level?: string;
  urgency_level?: string;
  budget_constraint?: string;
  fit_alignment?: string;
  engagement_health?: string;
  smart_notification?: string;
  demo_book_datetime?: string;
  reasoning?: any;
  duration_seconds?: number;
  recording_url?: string;
  created_at?: string;
  agent_name?: string;
  contact_name?: string;
  phone_number?: string;
  // Add missing properties that exist in leadAnalytics
  email?: string;
  company?: string;
  contact_email?: string;
  contact_company?: string;
}

export const HotLeadsModal = ({
  open,
  onClose,
  dateFrom,
  dateTo,
  selectedAgentId,
  selectedCallSource,
}: HotLeadsModalProps) => {
  const { theme } = useTheme();
  const [hotLeads, setHotLeads] = useState<HotLead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<HotLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"score" | "date">("score");
  const [selectedLead, setSelectedLead] = useState<HotLead | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showReasoningModal, setShowReasoningModal] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [isAudioLoading, setIsAudioLoading] = useState<string | null>(null);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeControl, setShowVolumeControl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  // Fetch hot leads
  useEffect(() => {
    if (open) {
      fetchHotLeads();
    }
  }, [open, dateFrom, dateTo, selectedAgentId, selectedCallSource]);

  // Filter and sort leads
  useEffect(() => {
    let filtered = [...hotLeads];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (lead) =>
          lead.lead_name?.toLowerCase().includes(query) ||
          (lead.phoneNumber || lead.phone_number)?.toLowerCase().includes(query) ||
          (lead.email || lead.contact_email)?.toLowerCase().includes(query) ||
          (lead.company || lead.contact_company)?.toLowerCase().includes(query) ||
          (lead.contactName || lead.contact_name)?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === "score") {
        return (b.total_score || 0) - (a.total_score || 0);
      } else {
        const dateA = new Date(b.createdAt || b.created_at || 0).getTime();
        const dateB = new Date(a.createdAt || a.created_at || 0).getTime();
        return dateA - dateB;
      }
    });

    setFilteredLeads(filtered);
  }, [hotLeads, searchQuery, sortBy]);

  const fetchHotLeads = async () => {
    try {
      setLoading(true);

      const params: any = {
        limit: 1000,
        sortBy: "total_score",
        sortOrder: "DESC",
      };

      // Add date range filters if provided
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (selectedAgentId) params.agentId = selectedAgentId;
      if (selectedCallSource) params.callSource = selectedCallSource;

      const response = await apiService.getCalls(params);

      if (response.success && response.data) {
        // Handle both response formats: array or object with calls property
        const callsArray = Array.isArray(response.data) 
          ? response.data 
          : response.data.calls || [];
        
        // Filter for hot leads only
        const hot = callsArray.filter(
          (call: any) =>
            call.lead_status_tag?.toLowerCase() === "hot" ||
            call.lead_status_tag?.toLowerCase().includes("hot")
        );
        setHotLeads(hot);
      } else {
        setHotLeads([]);
      }
    } catch (error) {
      console.error("Error fetching hot leads:", error);
      toast.error("Failed to load hot leads");
      setHotLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAudio = async (callId: string, recordingUrl?: string) => {
    if (playingAudio === callId) {
      // Pause current audio
      if (audioRef.current) {
        audioRef.current.pause();
        setPlayingAudio(null);
      }
      return;
    }

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    }

    try {
      setIsAudioLoading(callId);

      let audioUrl = recordingUrl;

      // If no recording URL, try to fetch it
      if (!audioUrl) {
        audioUrl = await apiService.getCallAudioBlob(callId);
      }

      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audio.volume = isMuted ? 0 : volume;

        audio.onended = () => {
          setPlayingAudio(null);
        };

        audio.onerror = () => {
          toast.error("Failed to play audio");
          setPlayingAudio(null);
          setIsAudioLoading(null);
        };

        await audio.play();
        audioRef.current = audio;
        setPlayingAudio(callId);
      }
    } catch (error) {
      console.error("Error playing audio:", error);
      toast.error("Failed to play audio recording");
    } finally {
      setIsAudioLoading(null);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    if (audioRef.current) {
      audioRef.current.volume = newMutedState ? 0 : volume;
    }
  };

  const handleExportCSV = () => {
    const csvData = filteredLeads.map((lead) => ({
      Name: lead.lead_name || lead.contactName || lead.contact_name || "Unknown",
      Phone: lead.phoneNumber || lead.phone_number || "",
      Email: lead.email || lead.contactEmail || lead.contact_email || "",
      Company: lead.company || lead.contactCompany || lead.contact_company || "",
      Score: lead.total_score || 0,
      Status: lead.lead_status_tag || "",
      Intent: lead.intent_level || "",
      Urgency: lead.urgency_level || "",
      Budget: lead.budget_constraint || "",
      "Demo Scheduled": lead.demo_book_datetime
        ? format(new Date(lead.demo_book_datetime), "PPP p")
        : "No",
      Date: format(new Date(lead.createdAt || lead.created_at || new Date()), "PPP"),
    }));

    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(","),
      ...csvData.map((row) => headers.map((header) => `"${row[header as keyof typeof row]}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hot-leads-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Hot leads exported successfully");
  };

  const getScoreColor = (score: number) => {
    if (score >= 14) return "text-red-500";
    if (score >= 12) return "text-orange-500";
    return "text-yellow-500";
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 14) return "bg-red-500/10 text-red-500 border-red-500/20";
    if (score >= 12) return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Flame className="w-6 h-6 text-orange-500" />
              Hot Leads Generated
              <Badge variant="secondary" className="ml-2">
                {filteredLeads.length} {filteredLeads.length === 1 ? "Lead" : "Leads"}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-b pb-4">
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, phone, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="score">Sort by Score</SelectItem>
                  <SelectItem value="date">Sort by Date</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={handleExportCSV} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Hot Leads List */}
          <div className="flex-1 overflow-y-auto space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Flame className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Hot Leads Found</h3>
                <p className="text-muted-foreground">
                  {searchQuery
                    ? "No hot leads match your search criteria"
                    : "No hot leads have been generated yet"}
                </p>
              </div>
            ) : (
              filteredLeads.map((lead) => (
                <Card
                  key={lead.id}
                  className={cn(
                    "p-6 hover:shadow-lg transition-all border-l-4",
                    lead.total_score && lead.total_score >= 14
                      ? "border-l-red-500"
                      : lead.total_score && lead.total_score >= 12
                      ? "border-l-orange-500"
                      : "border-l-yellow-500"
                  )}
                >
                  <div className="space-y-4">
                    {/* Header Section */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">
                            {lead.lead_name || lead.contactName || lead.contact_name || "Unknown Lead"}
                          </h3>
                          <Badge className={cn("font-semibold", getScoreBadgeColor(lead.total_score || 0))}>
                            <Flame className="w-3 h-3 mr-1" />
                            Score: {lead.total_score || 0}/15
                          </Badge>
                          {lead.demo_book_datetime && (
                            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                              <Calendar className="w-3 h-3 mr-1" />
                              Demo Scheduled
                            </Badge>
                          )}
                        </div>

                        {/* Contact Info */}
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          {(lead.phoneNumber || lead.phone_number) && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-4 h-4" />
                              {lead.phoneNumber || lead.phone_number}
                            </div>
                          )}
                          {(lead.email || lead.contactEmail || lead.contact_email) && (
                            <div className="flex items-center gap-1">
                              <Mail className="w-4 h-4" />
                              {lead.email || lead.contactEmail || lead.contact_email}
                            </div>
                          )}
                          {(lead.company || lead.contactCompany || lead.contact_company) && (
                            <div className="flex items-center gap-1">
                              <Building2 className="w-4 h-4" />
                              {lead.company || lead.contactCompany || lead.contact_company}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {format(new Date(lead.createdAt || lead.created_at || new Date()), "PPP p")}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Smart Notification */}
                    {lead.smart_notification && (
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                        <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                          💡 {lead.smart_notification}
                        </p>
                      </div>
                    )}

                    {/* Lead Intelligence Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div className="bg-muted/50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Target className="w-4 h-4 text-purple-500" />
                          <span className="text-xs font-medium text-muted-foreground">Intent</span>
                        </div>
                        <p className="text-sm font-semibold">{lead.intent_level || "N/A"}</p>
                      </div>

                      <div className="bg-muted/50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Zap className="w-4 h-4 text-yellow-500" />
                          <span className="text-xs font-medium text-muted-foreground">Urgency</span>
                        </div>
                        <p className="text-sm font-semibold">{lead.urgency_level || "N/A"}</p>
                      </div>

                      <div className="bg-muted/50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <DollarSign className="w-4 h-4 text-green-500" />
                          <span className="text-xs font-medium text-muted-foreground">Budget</span>
                        </div>
                        <p className="text-sm font-semibold">{lead.budget_constraint || "N/A"}</p>
                      </div>

                      <div className="bg-muted/50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="w-4 h-4 text-blue-500" />
                          <span className="text-xs font-medium text-muted-foreground">Fit</span>
                        </div>
                        <p className="text-sm font-semibold">{lead.fit_alignment || "N/A"}</p>
                      </div>

                      <div className="bg-muted/50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp className="w-4 h-4 text-orange-500" />
                          <span className="text-xs font-medium text-muted-foreground">Engagement</span>
                        </div>
                        <p className="text-sm font-semibold">{lead.engagement_health || "N/A"}</p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {/* Audio Player */}
                      {(lead.recordingUrl || lead.recording_url) && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePlayAudio(lead.id, lead.recordingUrl || lead.recording_url)}
                            disabled={isAudioLoading === lead.id}
                          >
                            {isAudioLoading === lead.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : playingAudio === lead.id ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                            <span className="ml-2">
                              {playingAudio === lead.id ? "Pause" : "Play"} Audio
                            </span>
                          </Button>

                          {playingAudio === lead.id && (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={toggleMute}
                                onMouseEnter={() => setShowVolumeControl(lead.id)}
                              >
                                {isMuted ? (
                                  <VolumeX className="w-4 h-4" />
                                ) : volume > 0.5 ? (
                                  <Volume2 className="w-4 h-4" />
                                ) : (
                                  <Volume1 className="w-4 h-4" />
                                )}
                              </Button>

                              {showVolumeControl === lead.id && (
                                <div
                                  className="flex items-center gap-2"
                                  onMouseLeave={() => setShowVolumeControl(null)}
                                >
                                  <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={volume}
                                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                                    className="w-20"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedLead(lead);
                          setShowTranscript(true);
                        }}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        View Transcript
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedLead(lead);
                          setShowReasoningModal(true);
                        }}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        View Reasoning
                      </Button>

                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => {
                          // Navigate to lead intelligence or open profile
                          const leadId = lead.phoneNumber || lead.phone_number || lead.email || lead.contact_email;
                          window.location.href = `/dashboard?tab=lead-intelligence&leadId=${leadId}`;
                        }}
                      >
                        <User className="w-4 h-4 mr-2" />
                        View Full Profile
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Transcript Viewer Modal */}
      {selectedLead && (
        <CallTranscriptViewer
          callId={selectedLead.id}
          isOpen={showTranscript}
          onClose={() => {
            setShowTranscript(false);
            setSelectedLead(null);
          }}
          call={selectedLead}
        />
      )}

      {/* Reasoning/Intelligence Modal */}
      {selectedLead && (
        <InteractionDetailsModal
          isOpen={showReasoningModal}
          onClose={() => {
            setShowReasoningModal(false);
            setSelectedLead(null);
          }}
          analytics={{
            scores: {
              intent: {
                level: selectedLead.intent_level || "Unknown",
                score: selectedLead.total_score || 0,
                reasoning: selectedLead.reasoning?.intent || "No reasoning available",
              },
              urgency: {
                level: selectedLead.urgency_level || "Unknown",
                score: selectedLead.total_score || 0,
                reasoning: selectedLead.reasoning?.urgency || "No reasoning available",
              },
              budget: {
                constraint: selectedLead.budget_constraint || "Unknown",
                score: selectedLead.total_score || 0,
                reasoning: selectedLead.reasoning?.budget || "No reasoning available",
              },
              fit: {
                alignment: selectedLead.fit_alignment || "Unknown",
                score: selectedLead.total_score || 0,
                reasoning: selectedLead.reasoning?.fit || "No reasoning available",
              },
              engagement: {
                health: selectedLead.engagement_health || "Unknown",
                score: selectedLead.total_score || 0,
                reasoning: selectedLead.reasoning?.engagement || "No reasoning available",
              },
            },
            overall: {
              total_score: selectedLead.total_score || 0,
              lead_status_tag: selectedLead.lead_status_tag || "Hot",
            },
            interactions: {
              cta_summary: [],
              cta_behavior_reasoning: selectedLead.reasoning?.cta_behavior || "No CTA behavior data",
              engagement_indicators: [],
            },
            callData: {
              id: selectedLead.id,
              recording_url: selectedLead.recordingUrl || selectedLead.recording_url,
              transcript: "",
            },
          }}
          isLoading={false}
          error={null}
        />
      )}
    </>
  );
};
