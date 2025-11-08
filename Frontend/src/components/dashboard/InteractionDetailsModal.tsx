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

interface InteractionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  analytics: LeadAnalyticsData | null;
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
  const callData = (analytics as any)?.callData;

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
            <div className="flex flex-col items-center justify-center h-40 text-destructive">
              <AlertTriangle className="h-8 w-8 mb-2" />
              <p className="font-semibold">Failed to load details</p>
              <p className="text-sm text-center">{error}</p>
            </div>
          )}
          {!isLoading && !error && analytics && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">Overall Analysis</h3>
                <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md grid grid-cols-2 gap-2">
                  <p><strong>Total Score:</strong> {analytics.overall?.total_score}</p>
                  <p><strong>Lead Status:</strong> <Badge>{analytics.overall?.lead_status_tag}</Badge></p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">Scores Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analytics.scores?.intent && <ScoreCard title="intent" data={analytics.scores.intent} />}
                  {analytics.scores?.urgency && <ScoreCard title="urgency" data={analytics.scores.urgency} />}
                  {analytics.scores?.budget && <ScoreCard title="budget" data={analytics.scores.budget} />}
                  {analytics.scores?.fit && <ScoreCard title="fit" data={analytics.scores.fit} />}
                  {analytics.scores?.engagement && <ScoreCard title="engagement" data={analytics.scores.engagement} />}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">Interaction Highlights</h3>
                <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                  <p className="mb-2"><strong>CTA Behavior:</strong> {analytics.interactions?.cta_behavior_reasoning}</p>
                  {analytics.interactions?.cta_summary && analytics.interactions.cta_summary.length > 0 &&
                    <div>
                      <strong>CTA Summary:</strong>
                      <ul className="list-disc list-inside pl-2">
                        {analytics.interactions.cta_summary.map((item, i) => <li key={i}>{item}</li>)}
                      </ul>
                    </div>
                  }
                  {analytics.interactions?.engagement_indicators && analytics.interactions.engagement_indicators.length > 0 &&
                    <div className="mt-2">
                      <strong>Engagement Indicators:</strong>
                      <ul className="list-disc list-inside pl-2">
                        {analytics.interactions.engagement_indicators.map((item, i) => <li key={i}>{item}</li>)}
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
