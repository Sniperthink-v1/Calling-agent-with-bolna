/**
 * PipelineView Component
 * 
 * A beautiful Kanban-style pipeline view for managing leads through stages.
 * Features drag-and-drop functionality, quality badges, and modern aesthetics.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  Building2,
  Clock,
  Flame,
  Thermometer,
  Snowflake,
  RefreshCw,
  GripVertical,
  User,
  Globe,
  Mail,
  Phone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePipelineContacts, type PipelineContact } from '@/hooks/usePipelineContacts';
import { PREDEFINED_LEAD_STAGES } from '@/types/api';
import { useToast } from '@/components/ui/use-toast';
import type { Contact } from '@/types';

// ============================================================================
// Types
// ============================================================================

interface PipelineViewProps {
  onContactSelect?: (contact: Contact) => void;
  onContactEdit?: (contact: Contact) => void;
  className?: string;
}

interface StageColumnProps {
  stageName: string;
  stageColor: string;
  contacts: PipelineContact[];
  onContactSelect?: (contact: Contact) => void;
  activeId: string | null;
}

interface LeadCardProps {
  contact: PipelineContact;
  onSelect?: (contact: Contact) => void;
  isDragging?: boolean;
  isOverlay?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

const getInitials = (name: string): string => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const getDaysInStage = (leadStageUpdatedAt?: string, createdAt?: string): number => {
  const dateStr = leadStageUpdatedAt || createdAt;
  if (!dateStr) return 0;
  
  const date = new Date(dateStr);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

const formatDaysInStage = (days: number): string => {
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  if (days < 7) return `${days} days`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  return `${Math.floor(days / 30)}mo`;
};

const getSourceLabel = (source?: string): string => {
  if (!source) return '';
  
  // Map common sources to friendly names
  const sourceMap: Record<string, string> = {
    'webhook': 'Inbound',
    'manual': 'Manual',
    'bulk_upload': 'Import',
    'n8n_webhook': 'Automation',
  };
  
  return sourceMap[source] || source;
};

// ============================================================================
// Quality Badge Component
// ============================================================================

const QualityBadge: React.FC<{ quality: 'Hot' | 'Warm' | 'Cold' | null; score?: number | null }> = ({ 
  quality,
  score 
}) => {
  if (!quality) return null;

  const config = {
    Hot: {
      icon: Flame,
      className: 'bg-gradient-to-r from-red-500 to-orange-500 text-white border-0',
      iconClassName: 'text-white',
    },
    Warm: {
      icon: Thermometer,
      className: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-900 border-0',
      iconClassName: 'text-amber-900',
    },
    Cold: {
      icon: Snowflake,
      className: 'bg-gradient-to-r from-blue-400 to-cyan-500 text-white border-0',
      iconClassName: 'text-white',
    },
  };

  const { icon: Icon, className, iconClassName } = config[quality];

  return (
    <Badge className={cn('text-xs font-medium px-2 py-0.5 flex items-center gap-1 shadow-sm', className)}>
      <Icon className={cn('h-3 w-3', iconClassName)} />
      <span>{quality}</span>
      {score !== null && score !== undefined && (
        <span className="opacity-75">({score})</span>
      )}
    </Badge>
  );
};

// ============================================================================
// Lead Card Component
// ============================================================================

const LeadCard: React.FC<LeadCardProps> = ({ 
  contact, 
  onSelect, 
  isDragging = false,
  isOverlay = false,
}) => {
  const daysInStage = getDaysInStage(contact.leadStageUpdatedAt, contact.createdAt);
  const sourceLabel = getSourceLabel(contact.autoCreationSource);

  return (
    <Card
      className={cn(
        'group relative p-4 cursor-pointer transition-all duration-200',
        'bg-card hover:bg-accent/50 border border-border/50',
        'hover:shadow-lg hover:border-primary/20 hover:-translate-y-0.5',
        isDragging && 'opacity-50 shadow-none',
        isOverlay && 'shadow-2xl rotate-2 scale-105 border-primary/50 bg-card',
      )}
      onClick={() => onSelect?.(contact)}
    >
      {/* Drag Handle - visible on hover */}
      {!isOverlay && (
        <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="h-4 w-4 text-muted-foreground/50" />
        </div>
      )}
      
      <div className="space-y-3">
        {/* Header: Avatar, Name, Quality Badge */}
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 border-2 border-background shadow-sm flex-shrink-0">
            <AvatarImage src={undefined} alt={contact.name} />
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-semibold text-sm">
              {getInitials(contact.name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-sm text-foreground truncate">
                {contact.name}
              </h4>
              <QualityBadge quality={contact.qualityBadge} score={contact.totalScore} />
            </div>
            
            {/* Company */}
            {contact.company && (
              <div className="flex items-center gap-1.5 mt-1">
                <Building2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-muted-foreground truncate">
                  {contact.company}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Contact Info */}
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {contact.email && (
            <div className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              <span className="truncate max-w-[120px]">{contact.email}</span>
            </div>
          )}
          {contact.phoneNumber && (
            <div className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              <span>{contact.phoneNumber}</span>
            </div>
          )}
        </div>

        {/* Footer: Source tag and Days in Stage */}
        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <div className="flex items-center gap-2">
            {sourceLabel && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-normal">
                <Globe className="h-2.5 w-2.5 mr-1" />
                {sourceLabel}
              </Badge>
            )}
            {contact.tags && contact.tags.length > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-normal">
                +{contact.tags.length}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatDaysInStage(daysInStage)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

// ============================================================================
// Sortable Lead Card Wrapper
// ============================================================================

const SortableLeadCard: React.FC<LeadCardProps & { id: string }> = ({ id, ...props }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <LeadCard {...props} isDragging={isDragging} />
    </div>
  );
};

// ============================================================================
// Stage Column Component
// ============================================================================

const StageColumn: React.FC<StageColumnProps> = ({
  stageName,
  stageColor,
  contacts,
  onContactSelect,
  activeId,
}) => {
  const contactIds = useMemo(() => contacts.map(c => c.id), [contacts]);
  
  // Make the entire column a droppable target
  const { setNodeRef, isOver } = useDroppable({
    id: `stage-${stageName}`,
    data: {
      type: 'stage',
      stageName,
    },
  });

  return (
    <div 
      ref={setNodeRef}
      className={`flex flex-col min-w-[300px] max-w-[340px] flex-shrink-0 h-full transition-all duration-200 ${isOver ? 'ring-2 ring-primary ring-offset-2 ring-offset-background rounded-xl' : ''}`}
    >
      {/* Column Header */}
      <div 
        className="sticky top-0 z-10 px-3 py-3 rounded-t-xl border border-b-0"
        style={{ 
          backgroundColor: `${stageColor}15`,
          borderColor: `${stageColor}30`,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full shadow-sm"
              style={{ backgroundColor: stageColor }}
            />
            <h3 className="font-semibold text-sm text-foreground">{stageName}</h3>
          </div>
          <Badge 
            variant="secondary" 
            className="text-xs font-medium px-2 py-0.5 min-w-[24px] justify-center"
            style={{ 
              backgroundColor: `${stageColor}20`,
              color: stageColor,
            }}
          >
            {contacts.length}
          </Badge>
        </div>
      </div>

      {/* Cards Container */}
      <div 
        className="flex-1 overflow-y-auto p-2 space-y-2 rounded-b-xl border border-t-0"
        style={{ 
          backgroundColor: `${stageColor}08`,
          borderColor: `${stageColor}20`,
        }}
      >
        <SortableContext items={contactIds} strategy={verticalListSortingStrategy}>
          {contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                style={{ backgroundColor: `${stageColor}15` }}
              >
                <User className="h-6 w-6" style={{ color: stageColor }} />
              </div>
              <p className="text-sm text-muted-foreground">No leads</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Drag leads here
              </p>
            </div>
          ) : (
            contacts.map((contact) => (
              <SortableLeadCard
                key={contact.id}
                id={contact.id}
                contact={contact}
                onSelect={onContactSelect}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
};

// ============================================================================
// Loading Skeleton
// ============================================================================

const PipelineLoadingSkeleton: React.FC = () => (
  <div className="flex gap-4 p-4 overflow-x-auto h-full">
    {PREDEFINED_LEAD_STAGES.map((stage) => (
      <div key={stage.name} className="min-w-[300px] max-w-[340px] flex-shrink-0 space-y-3">
        <div 
          className="px-3 py-3 rounded-xl"
          style={{ backgroundColor: `${stage.color}15` }}
        >
          <div className="flex items-center gap-2">
            <Skeleton className="w-3 h-3 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-8 ml-auto" />
          </div>
        </div>
        <div className="space-y-2 p-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      </div>
    ))}
  </div>
);

// ============================================================================
// Main Pipeline View Component
// ============================================================================

export const PipelineView: React.FC<PipelineViewProps> = ({
  onContactSelect,
  onContactEdit,
  className,
}) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeContact, setActiveContact] = useState<PipelineContact | null>(null);

  const {
    contacts,
    pipelineData,
    stages,
    isLoading,
    isFetching,
    refetch,
    moveContact,
  } = usePipelineContacts(debouncedSearch);

  // Stages already include "Not Assigned" from the hook

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Find which stage a contact is currently in
  const findContactStage = useCallback((contactId: string): string | null => {
    for (const [stageName, stageContacts] of Object.entries(pipelineData)) {
      if (stageContacts.some(c => c.id === contactId)) {
        return stageName;
      }
    }
    return null;
  }, [pipelineData]);

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    
    // Find the active contact
    const contact = contacts.find(c => c.id === active.id);
    setActiveContact(contact || null);
  }, [contacts]);

  // Handle drag end
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    setActiveContact(null);

    if (!over) {
      console.log('[DragEnd] No over target');
      return;
    }

    const contactId = active.id as string;
    const overId = over.id as string;
    const overData = over.data?.current as { type?: string; stageName?: string } | undefined;

    console.log('[DragEnd] contactId:', contactId, 'overId:', overId, 'overData:', overData);

    // Determine the target stage
    let targetStage: string | null = null;

    // Check if dropping over a stage column (droppable with stage-* id)
    if (overData?.type === 'stage' && overData?.stageName) {
      targetStage = overData.stageName;
      console.log('[DragEnd] Target from overData:', targetStage);
    } else if (overId.startsWith('stage-')) {
      // Fallback: extract stage name from droppable id
      targetStage = overId.replace('stage-', '');
      console.log('[DragEnd] Target from overId prefix:', targetStage);
    } else {
      // Dropping over another contact - find its stage
      targetStage = findContactStage(overId);
      console.log('[DragEnd] Target from contact stage:', targetStage);
    }

    if (!targetStage) {
      console.log('[DragEnd] No target stage determined');
      return;
    }

    // Check if actually changing stages
    const currentStage = findContactStage(contactId);
    console.log('[DragEnd] currentStage:', currentStage, 'targetStage:', targetStage);
    
    if (currentStage === targetStage) {
      console.log('[DragEnd] Same stage, skipping');
      return;
    }

    console.log('[DragEnd] Calling moveContact...');
    // Move the contact
    const success = await moveContact(contactId, targetStage);
    console.log('[DragEnd] moveContact result:', success);
    
    if (success) {
      toast({
        title: 'Lead moved',
        description: `Lead moved to ${targetStage}`,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Failed to move lead',
        description: 'Please try again',
      });
    }
  }, [findContactStage, moveContact, toast]);

  // Handle drag over (for visual feedback)
  const handleDragOver = useCallback((event: DragOverEvent) => {
    // Can be used for additional visual feedback
  }, []);

  if (isLoading) {
    return <PipelineLoadingSkeleton />;
  }

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b bg-background/95 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground">Pipeline</h2>
            <Badge variant="outline" className="text-xs">
              {contacts.length} leads
            </Badge>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            
            {/* Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </div>

      {/* Pipeline Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
        >
          <div className="flex gap-4 p-6 h-full min-w-max">
            {stages.map((stage) => (
              <StageColumn
                key={stage.name}
                stageName={stage.name}
                stageColor={stage.color}
                contacts={pipelineData[stage.name] || []}
                onContactSelect={onContactSelect}
                activeId={activeId}
              />
            ))}
          </div>

          {/* Drag Overlay */}
          <DragOverlay dropAnimation={null}>
            {activeId && activeContact ? (
              <LeadCard contact={activeContact} isOverlay />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
};

export default PipelineView;
