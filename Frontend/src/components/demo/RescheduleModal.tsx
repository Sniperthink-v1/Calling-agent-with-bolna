import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { apiService } from "@/services/apiService";

interface DemoSchedule {
  id: string;
  lead_name: string;
  phone_number: string;
  email?: string;
  company?: string;
  demo_scheduled_at: string;
  meeting_link?: string;
  meeting_title?: string;
}

interface RescheduleModalProps {
  open: boolean;
  onClose: () => void;
  demo: DemoSchedule | null;
  onSuccess?: () => void;
}

export const RescheduleModal = ({
  open,
  onClose,
  demo,
  onSuccess,
}: RescheduleModalProps) => {
  const [meetingDateTime, setMeetingDateTime] = useState<Date | undefined>();
  const [loading, setLoading] = useState(false);

  // Initialize date/time when demo changes
  useEffect(() => {
    if (demo && demo.demo_scheduled_at) {
      setMeetingDateTime(new Date(demo.demo_scheduled_at));
    } else {
      setMeetingDateTime(undefined);
    }
  }, [demo]);

  const handleReschedule = async () => {
    if (!demo || !meetingDateTime) {
      toast.error("Please select a date and time");
      return;
    }

    setLoading(true);
    try {
      // Convert to ISO string for API
      const isoDateTime = meetingDateTime.toISOString();
      await apiService.rescheduleDemo(demo.id, isoDateTime);
      
      toast.success(`Demo rescheduled for ${demo.lead_name}`);
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error("Failed to reschedule demo");
      console.error("Error rescheduling demo:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reschedule Meeting</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {demo && (
            <div className="text-sm text-muted-foreground">
              Rescheduling meeting for: <strong>{demo.lead_name}</strong>
            </div>
          )}

          {/* Meeting Title (read-only, for reference) */}
          {demo?.meeting_title && (
            <div className="space-y-2">
              <Label>Meeting Title</Label>
              <Input
                type="text"
                value={demo.meeting_title}
                disabled
                className="bg-muted"
              />
            </div>
          )}

          {/* Attendee Email (read-only, for reference) */}
          {demo?.email && (
            <div className="space-y-2">
              <Label>Attendee Email</Label>
              <Input
                type="email"
                value={demo.email}
                disabled
                className="bg-muted"
              />
            </div>
          )}

          {/* Date Picker */}
          <div className="space-y-2">
            <Label htmlFor="meeting-date">Meeting Date & Time</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !meetingDateTime && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {meetingDateTime
                    ? format(meetingDateTime, "MMMM do, yyyy 'at' h:mm a")
                    : "Pick a date and time"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={meetingDateTime}
                  onSelect={(date) => {
                    if (date) {
                      const newDate = meetingDateTime
                        ? new Date(date)
                        : new Date(date.setHours(10, 0, 0, 0));
                      
                      // Preserve existing time if already set
                      if (meetingDateTime) {
                        newDate.setHours(
                          meetingDateTime.getHours(),
                          meetingDateTime.getMinutes()
                        );
                      }
                      setMeetingDateTime(newDate);
                    }
                  }}
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date < today;
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Picker */}
          {meetingDateTime && (
            <div className="space-y-2">
              <Label>Meeting Time</Label>
              <div className="flex gap-2">
                <Select
                  value={meetingDateTime.getHours().toString()}
                  onValueChange={(value) => {
                    const newDate = new Date(meetingDateTime);
                    newDate.setHours(parseInt(value));
                    setMeetingDateTime(newDate);
                  }}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="Hour" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {i.toString().padStart(2, "0")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="flex items-center">:</span>
                <Select
                  value={meetingDateTime.getMinutes().toString()}
                  onValueChange={(value) => {
                    const newDate = new Date(meetingDateTime);
                    newDate.setMinutes(parseInt(value));
                    setMeetingDateTime(newDate);
                  }}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="Minute" />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 15, 30, 45].map((minute) => (
                      <SelectItem key={minute} value={minute.toString()}>
                        {minute.toString().padStart(2, "0")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleReschedule}
              disabled={!meetingDateTime || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Rescheduling...
                </>
              ) : (
                "Reschedule Meeting"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
