import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, FileText, Play, Pause, Volume2, VolumeX, X } from 'lucide-react';
import type { LeadAnalyticsData } from '@/types';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiService } from '@/services/apiService';
import { useToast } from '@/components/ui/use-toast';

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
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [audioProgress, setAudioProgress] = useState({ current: 0, total: 0 });
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeControl, setShowVolumeControl] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const { toast } = useToast();
  
  // Type guard to check if analytics has detailed structure
  const isDetailedAnalytics = (data: any): data is DetailedAnalytics => {
    return data && ('scores' in data || 'overall' in data || 'interactions' in data);
  };

  const detailedAnalytics = isDetailedAnalytics(analytics) ? analytics : null;
  const callData = detailedAnalytics?.callData;

  // Cleanup audio on unmount or modal close
  useEffect(() => {
    return () => {
      handleCloseAudio();
    };
  }, []);

  // Stop audio when modal closes
  useEffect(() => {
    if (!isOpen) {
      handleCloseAudio();
    }
  }, [isOpen]);

  const handleCloseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlayingAudio(false);
    setIsAudioLoading(false);
    setAudioProgress({ current: 0, total: 0 });
    objectUrlRef.current = null;
  };

  const handlePlayRecording = async () => {
    if (!callData?.id) return;

    // If audio is already playing, pause it
    if (isPlayingAudio && audioRef.current) {
      if (audioRef.current.paused) {
        await audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
      setForceUpdate(prev => prev + 1);
      return;
    }

    // Load and play new audio
    try {
      setIsAudioLoading(true);
      setIsPlayingAudio(true);
      
      // Get the recording URL directly from the API
      const audioUrl = await apiService.getCallAudioBlob(callData.id);
      
      // Twilio URLs are now proxied through backend with authentication
      // No need to block them anymore
      
      objectUrlRef.current = audioUrl;

      // Create audio element WITHOUT crossOrigin to avoid CORS preflight
      audioRef.current = new Audio(audioUrl);
      audioRef.current.volume = volume;
      audioRef.current.muted = isMuted;
      setIsAudioLoading(false);

      // Initialize progress
      setAudioProgress({ current: 0, total: 0 });

      // Update total duration when metadata is loaded
      audioRef.current.onloadedmetadata = () => {
        if (audioRef.current) {
          setAudioProgress(prev => ({
            ...prev,
            total: audioRef.current!.duration,
          }));
          setForceUpdate(prev => prev + 1);
        }
      };

      // Update current time as audio plays
      audioRef.current.ontimeupdate = () => {
        if (audioRef.current) {
          setAudioProgress(prev => ({
            ...prev,
            current: audioRef.current!.currentTime,
          }));
          setForceUpdate(prev => prev + 1);
        }
      };
      
      // Event listener to clear the playing state when audio finishes
      audioRef.current.onended = () => {
        setIsPlayingAudio(false);
        setAudioProgress(prev => ({ ...prev, current: 0 }));
        setForceUpdate(prev => prev + 1);
      };

      await audioRef.current.play();

    } catch (err) {
      console.error("Error playing audio:", err);
      setIsAudioLoading(false);
      setIsPlayingAudio(false);
      toast({
        title: 'Error playing audio',
        description: err instanceof Error ? err.message : 'Could not play the audio for this call.',
        variant: 'destructive',
      });
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (audioRef.current && audioProgress.total > 0) {
      const progressBar = e.currentTarget;
      const rect = progressBar.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const width = progressBar.offsetWidth;
      const newTime = (x / width) * audioProgress.total;
      audioRef.current.currentTime = newTime;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      audioRef.current.muted = newVolume === 0;
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      const newMuted = !audioRef.current.muted;
      setIsMuted(newMuted);
      audioRef.current.muted = newMuted;
      if (!newMuted && volume === 0) {
        setVolume(0.5);
        audioRef.current.volume = 0.5;
      }
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) {
      return "00:00";
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
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
                
                {/* Audio Player */}
                {callData?.recording_url && (
                  <div className="mb-4 p-4 bg-muted rounded-lg">
                    {isAudioLoading ? (
                      <div className="flex items-center justify-center h-12">
                        <Loader2 className="w-5 h-5 animate-spin text-slate-400 mr-2" />
                        <span className="text-sm text-slate-400">Loading audio...</span>
                      </div>
                    ) : isPlayingAudio ? (
                      <div className="flex items-center space-x-3">
                        {/* Play/Pause button */}
                        <button
                          onClick={handlePlayRecording}
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-105 shadow-md"
                          style={{ backgroundColor: audioRef.current?.paused ? '#1A6262' : '#64748b' }}
                        >
                          {audioRef.current?.paused ? <Play className="w-5 h-5 ml-0.5" /> : <Pause className="w-5 h-5" />}
                        </button>

                        {/* Progress bar and time */}
                        <div className="flex items-center space-x-3 flex-1">
                          <div
                            className="flex-1 bg-slate-300 dark:bg-slate-700 rounded-full h-2 cursor-pointer relative overflow-hidden"
                            onClick={handleSeek}
                          >
                            <div
                              className="bg-[#1A6262] h-full rounded-full transition-all duration-150"
                              style={{
                                width: `${audioProgress.total > 0 ? (audioProgress.current / audioProgress.total) * 100 : 0}%`
                              }}
                            ></div>
                          </div>
                          <span className="text-xs text-slate-600 dark:text-slate-400 min-w-[80px] text-right">
                            {formatTime(audioProgress.current)} / {formatTime(audioProgress.total)}
                          </span>
                        </div>

                        {/* Volume control */}
                        <div 
                          className="flex items-center space-x-2"
                          onMouseEnter={() => setShowVolumeControl(true)}
                          onMouseLeave={() => setShowVolumeControl(false)}
                        >
                          <button
                            onClick={toggleMute}
                            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          >
                            {isMuted || volume === 0 ? (
                              <VolumeX className="w-4 h-4" />
                            ) : volume < 0.5 ? (
                              <Volume2 className="w-4 h-4 opacity-60" />
                            ) : (
                              <Volume2 className="w-4 h-4" />
                            )}
                          </button>
                          
                          <div className={`transition-all duration-300 overflow-hidden ${
                            showVolumeControl ? 'w-24 opacity-100' : 'w-0 opacity-0'
                          }`}>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              value={isMuted ? 0 : volume}
                              onChange={handleVolumeChange}
                              className="w-full h-1 bg-slate-300 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer"
                              style={{
                                accentColor: '#1A6262',
                              }}
                            />
                          </div>
                        </div>

                        {/* Close audio button */}
                        <button
                          onClick={handleCloseAudio}
                          className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          title="Close audio player"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="flex items-center gap-2 w-full justify-center"
                        onClick={handlePlayRecording}
                      >
                        <Play className="h-4 w-4" />
                        Play Recording
                      </Button>
                    )}
                  </div>
                )}

                {/* Transcript Button */}
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
