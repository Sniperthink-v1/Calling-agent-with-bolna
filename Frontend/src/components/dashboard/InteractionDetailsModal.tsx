import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, FileText, Play } from 'lucide-react';
import type { LeadAnalyticsData } from '@/types';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

// Detailed analytics structure returned from the API
interface DetailedAnalytics {
  scores?: {
    intent?: { level: string; score: number; reasoning: string };
    urgency?: { level: string; score: number; reasoning: string };
    budget?: { constraint: string; score: number; reasoning: string };
    fit?: { alignment: string; score: number; reasoning: string };
    engagement?: { health: string; score: number; reasoning: string };
  };
  overall?: {
    total_score: number;
    lead_status_tag: string;
  };
  interactions?: {
    cta_summary?: string[];
    cta_behavior_reasoning?: string;
    engagement_indicators?: string[];
  };
  callData?: {
    id: string;
    recording_url?: string;
    transcript?: string;
  };
}

interface InteractionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  analytics: LeadAnalyticsData | DetailedAnalytics | null;
  isLoading: boolean;
  error: string | null;
}

const ScoreCard: React.FC<{ title: string; data: any }> = ({ title, data }) => (
  <div>
    <h4 className="font-semibold text-md mb-1 capitalize">{title}</h4>
    <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md space-y-1">
      <p><strong>Level:</strong> {data.level || data.constraint || data.alignment || data.health}</p>
      <p><strong>Score:</strong> {data.score}</p>
      <p><strong>Reasoning:</strong> {data.reasoning}</p>
    </div>
  </div>
);

const InteractionDetailsModal: React.FC<InteractionDetailsModalProps> = ({
  isOpen,
  onClose,
  analytics,
  isLoading,
  error,
}) => {
  const [showTranscript, setShowTranscript] = useState(false);
  
  // Type guard to check if analytics has detailed structure
  const isDetailedAnalytics = (data: any): data is DetailedAnalytics => {
    return data && ('scores' in data || 'overall' in data || 'interactions' in data);
  };

  const detailedAnalytics = isDetailedAnalytics(analytics) ? analytics : null;
  const callData = detailedAnalytics?.callData;

  const handlePlayRecording = () => {
    if (callData?.recording_url) {
      window.open(callData.recording_url, '_blank');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Interaction Details</DialogTitle>
          <DialogDescription>
            Detailed analytics for the selected interaction.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 px-1 max-h-[60vh] overflow-y-auto">
          {isLoading && (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          {error && !isLoading && (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <FileText className="h-12 w-12 mb-3 opacity-50" />
              <p className="font-semibold text-lg">No Analytics Data Found</p>
              <p className="text-sm text-center mt-2 max-w-md">
                {error.includes('404') || error.toLowerCase().includes('not found') 
                  ? 'Analytics data is not available for this call. This may happen for calls that are busy, missed, or incomplete.'
                  : 'Unable to load analytics data at this time.'}
              </p>
            </div>
          )}
          {!isLoading && !error && !detailedAnalytics && (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <FileText className="h-12 w-12 mb-3 opacity-50" />
              <p className="font-semibold text-lg">No Analytics Data Found</p>
              <p className="text-sm text-center mt-2 max-w-md">
                Analytics data is not available for this call.
              </p>
            </div>
          )}
          {!isLoading && !error && detailedAnalytics && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">Overall Analysis</h3>
                <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md grid grid-cols-2 gap-2">
                  <p><strong>Total Score:</strong> {detailedAnalytics.overall?.total_score}</p>
                  <p><strong>Lead Status:</strong> <Badge>{detailedAnalytics.overall?.lead_status_tag}</Badge></p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">Scores Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {detailedAnalytics.scores?.intent && <ScoreCard title="intent" data={detailedAnalytics.scores.intent} />}
                  {detailedAnalytics.scores?.urgency && <ScoreCard title="urgency" data={detailedAnalytics.scores.urgency} />}
                  {detailedAnalytics.scores?.budget && <ScoreCard title="budget" data={detailedAnalytics.scores.budget} />}
                  {detailedAnalytics.scores?.fit && <ScoreCard title="fit" data={detailedAnalytics.scores.fit} />}
                  {detailedAnalytics.scores?.engagement && <ScoreCard title="engagement" data={detailedAnalytics.scores.engagement} />}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">Interaction Highlights</h3>
                <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                  <p className="mb-2"><strong>CTA Behavior:</strong> {detailedAnalytics.interactions?.cta_behavior_reasoning}</p>
                  {detailedAnalytics.interactions?.cta_summary && detailedAnalytics.interactions.cta_summary.length > 0 &&
                    <div>
                      <strong>CTA Summary:</strong>
                      <ul className="list-disc list-inside pl-2">
                        {detailedAnalytics.interactions.cta_summary.map((item, i) => <li key={i}>{item}</li>)}
                      </ul>
                    </div>
                  }
                  {detailedAnalytics.interactions?.engagement_indicators && detailedAnalytics.interactions.engagement_indicators.length > 0 &&
                    <div className="mt-2">
                      <strong>Engagement Indicators:</strong>
                      <ul className="list-disc list-inside pl-2">
                        {detailedAnalytics.interactions.engagement_indicators.map((item, i) => <li key={i}>{item}</li>)}
                      </ul>
                    </div>
                  }
                </div>
              </div>
              
              {/* Call Actions - Transcript and Recording */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Call Actions</h3>
                <div className="flex gap-3">
                  {callData?.transcript && (
                    <Button
                      variant="outline"
                      className="flex items-center gap-2"
                      onClick={() => setShowTranscript(!showTranscript)}
                    >
                      <FileText className="h-4 w-4" />
                      {showTranscript ? 'Hide' : 'Show'} Transcript
                    </Button>
                  )}
                  {callData?.recording_url && (
                    <Button
                      variant="outline"
                      className="flex items-center gap-2"
                      onClick={handlePlayRecording}
                    >
                      <Play className="h-4 w-4" />
                      Play Recording
                    </Button>
                  )}
                  {!callData?.transcript && !callData?.recording_url && (
                    <p className="text-sm text-muted-foreground">No transcript or recording available</p>
                  )}
                </div>

                {/* Transcript Display */}
                {showTranscript && callData?.transcript && (
                  <div className="mt-3 bg-muted p-4 rounded-md">
                    <h4 className="font-semibold text-sm mb-2">Transcript</h4>
                    <ScrollArea className="h-[200px] w-full">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{callData.transcript}</p>
                    </ScrollArea>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InteractionDetailsModal;
