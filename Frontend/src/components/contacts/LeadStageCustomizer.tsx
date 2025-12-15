/**
 * LeadStageCustomizer Component
 * 
 * A popup dialog for customizing lead stages with drag-and-drop reordering,
 * color picker, and full CRUD operations.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLeadStages } from '@/hooks/useLeadStages';
import { 
  GripVertical, 
  Plus, 
  Trash2, 
  Loader2, 
  RotateCcw,
  Palette,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { LeadStage } from '@/types';

// ============================================================================
// Types
// ============================================================================

interface LeadStageCustomizerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EditableStage extends LeadStage {
  id: string; // Unique ID for dnd-kit
  isNew?: boolean;
}

// ============================================================================
// Color Picker Component
// ============================================================================

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Preset colors for quick selection
  const presetColors = [
    '#3B82F6', '#8B5CF6', '#F59E0B', '#06B6D4', '#EC4899',
    '#10B981', '#EF4444', '#6366F1', '#14B8A6', '#F97316',
    '#84CC16', '#A855F7', '#0EA5E9', '#EAB308', '#64748B',
    '#DC2626', '#059669', '#7C3AED', '#0D9488', '#EA580C',
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    // Validate hex color
    if (/^#[0-9A-Fa-f]{6}$/.test(newValue)) {
      onChange(newValue);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          "w-8 h-8 rounded-md border-2 border-gray-200 focus:ring-2 focus:ring-offset-1 focus:ring-blue-500",
          "transition-all duration-150 flex items-center justify-center",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        style={{ backgroundColor: value }}
        disabled={disabled}
      >
        <Palette className="w-4 h-4 text-white drop-shadow-sm" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          
          {/* Color picker dropdown */}
          <div className="absolute top-full left-0 mt-1 z-50 p-3 bg-white rounded-lg shadow-lg border w-64">
            {/* Preset colors grid */}
            <div className="grid grid-cols-5 gap-2 mb-3">
              {presetColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    onChange(color);
                    setInputValue(color);
                  }}
                  className={cn(
                    "w-8 h-8 rounded-md transition-transform hover:scale-110",
                    "focus:ring-2 focus:ring-offset-1 focus:ring-blue-500",
                    value === color && "ring-2 ring-offset-1 ring-blue-500"
                  )}
                  style={{ backgroundColor: color }}
                >
                  {value === color && (
                    <Check className="w-4 h-4 text-white m-auto drop-shadow-sm" />
                  )}
                </button>
              ))}
            </div>

            {/* Custom color input */}
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={value}
                onChange={(e) => {
                  onChange(e.target.value);
                  setInputValue(e.target.value);
                }}
                className="w-8 h-8 rounded cursor-pointer"
              />
              <Input
                value={inputValue}
                onChange={handleInputChange}
                placeholder="#000000"
                className="h-8 text-sm font-mono"
              />
            </div>

            <Button
              size="sm"
              variant="ghost"
              className="w-full mt-2"
              onClick={() => setIsOpen(false)}
            >
              Done
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

// ============================================================================
// Sortable Stage Item Component
// ============================================================================

interface SortableStageItemProps {
  stage: EditableStage;
  onNameChange: (id: string, name: string) => void;
  onColorChange: (id: string, color: string) => void;
  onDelete: (id: string) => void;
  isOnly: boolean;
}

const SortableStageItem: React.FC<SortableStageItemProps> = ({
  stage,
  onNameChange,
  onColorChange,
  onDelete,
  isOnly,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-3 bg-white border rounded-lg",
        "transition-shadow",
        isDragging && "shadow-lg opacity-90 z-50"
      )}
    >
      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className={cn(
          "cursor-grab active:cursor-grabbing p-1 -ml-1 rounded",
          "hover:bg-gray-100 text-gray-400 hover:text-gray-600",
          "focus:outline-none focus:ring-2 focus:ring-blue-500"
        )}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Color picker */}
      <ColorPicker
        value={stage.color}
        onChange={(color) => onColorChange(stage.id, color)}
      />

      {/* Stage name input */}
      <Input
        value={stage.name}
        onChange={(e) => onNameChange(stage.id, e.target.value)}
        placeholder="Stage name"
        className="flex-1 h-9"
      />

      {/* Delete button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onDelete(stage.id)}
        disabled={isOnly}
        className={cn(
          "h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50",
          isOnly && "opacity-50 cursor-not-allowed"
        )}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
};

// ============================================================================
// Drag Overlay Item (shown while dragging)
// ============================================================================

interface DragOverlayItemProps {
  stage: EditableStage;
}

const DragOverlayItem: React.FC<DragOverlayItemProps> = ({ stage }) => {
  return (
    <div className="flex items-center gap-3 p-3 bg-white border rounded-lg shadow-xl">
      <div className="p-1 -ml-1 text-gray-400">
        <GripVertical className="w-4 h-4" />
      </div>
      <div
        className="w-8 h-8 rounded-md border-2 border-gray-200"
        style={{ backgroundColor: stage.color }}
      />
      <div className="flex-1 h-9 px-3 flex items-center bg-gray-50 rounded-md border">
        {stage.name}
      </div>
      <div className="h-8 w-8" />
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const LeadStageCustomizer: React.FC<LeadStageCustomizerProps> = ({
  open,
  onOpenChange,
}) => {
  const {
    stages,
    predefinedStages,
    loading,
    replacingAll,
    replaceAllStages,
    resetToDefaults,
  } = useLeadStages();

  // Local state for editing
  const [editableStages, setEditableStages] = useState<EditableStage[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Convert stages to editable format when dialog opens
  useEffect(() => {
    if (open && stages.length > 0) {
      const editable = stages.map((stage, index) => ({
        ...stage,
        id: `stage-${index}-${stage.name}`,
      }));
      setEditableStages(editable);
      setHasChanges(false);
    }
  }, [open, stages]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get active stage for overlay
  const activeStage = useMemo(
    () => editableStages.find(s => s.id === activeId),
    [editableStages, activeId]
  );

  // Stage IDs for sortable context
  const stageIds = useMemo(
    () => editableStages.map(s => s.id),
    [editableStages]
  );

  // ===== Event Handlers =====

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = editableStages.findIndex(s => s.id === active.id);
      const newIndex = editableStages.findIndex(s => s.id === over.id);

      setEditableStages(arrayMove(editableStages, oldIndex, newIndex));
      setHasChanges(true);
    }
  };

  const handleNameChange = (id: string, name: string) => {
    setEditableStages(prev =>
      prev.map(s => (s.id === id ? { ...s, name } : s))
    );
    setHasChanges(true);
  };

  const handleColorChange = (id: string, color: string) => {
    setEditableStages(prev =>
      prev.map(s => (s.id === id ? { ...s, color } : s))
    );
    setHasChanges(true);
  };

  const handleDelete = (id: string) => {
    setEditableStages(prev => prev.filter(s => s.id !== id));
    setHasChanges(true);
  };

  const handleAddStage = () => {
    const newStage: EditableStage = {
      id: `stage-new-${Date.now()}`,
      name: '',
      color: '#6366F1',
      order: editableStages.length,
      isNew: true,
    };
    setEditableStages(prev => [...prev, newStage]);
    setHasChanges(true);
  };

  const handleSave = async () => {
    // Validation
    const emptyNames = editableStages.filter(s => !s.name.trim());
    if (emptyNames.length > 0) {
      toast.error('All stages must have a name');
      return;
    }

    // Check for duplicates
    const names = editableStages.map(s => s.name.toLowerCase().trim());
    const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicates.length > 0) {
      toast.error(`Duplicate stage name: ${duplicates[0]}`);
      return;
    }

    // Prepare stages with correct order
    const stagesToSave: LeadStage[] = editableStages.map((s, index) => ({
      name: s.name.trim(),
      color: s.color,
      order: index,
    }));

    const result = await replaceAllStages(stagesToSave);
    if (result) {
      toast.success('Lead stages updated successfully');
      setHasChanges(false);
      onOpenChange(false);
    } else {
      toast.error('Failed to save changes');
    }
  };

  const handleResetToDefaults = async () => {
    const result = await resetToDefaults();
    if (result) {
      toast.success('Lead stages reset to defaults');
      setShowResetConfirm(false);
      setHasChanges(false);
      // Update local state
      const editable = result.map((stage, index) => ({
        ...stage,
        id: `stage-${index}-${stage.name}`,
      }));
      setEditableStages(editable);
    } else {
      toast.error('Failed to reset stages');
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      setShowDiscardConfirm(true);
    } else {
      onOpenChange(false);
    }
  };

  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false);
    setHasChanges(false);
    onOpenChange(false);
  };

  // ===== Render =====

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Customize Lead Stages</DialogTitle>
            <DialogDescription>
              Drag to reorder, edit names and colors. Changes apply to pipeline view and dropdowns.
            </DialogDescription>
          </DialogHeader>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto py-2 -mx-6 px-6">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={stageIds}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {editableStages.map(stage => (
                    <SortableStageItem
                      key={stage.id}
                      stage={stage}
                      onNameChange={handleNameChange}
                      onColorChange={handleColorChange}
                      onDelete={handleDelete}
                      isOnly={editableStages.length === 1}
                    />
                  ))}
                </div>
              </SortableContext>

              <DragOverlay>
                {activeStage && <DragOverlayItem stage={activeStage} />}
              </DragOverlay>
            </DndContext>

            {/* Add stage button */}
            <Button
              type="button"
              variant="outline"
              className="w-full mt-3"
              onClick={handleAddStage}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Stage
            </Button>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowResetConfirm(true)}
              disabled={replacingAll}
              className="text-gray-600"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to Defaults
            </Button>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={replacingAll}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={!hasChanges || replacingAll}
              >
                {replacingAll ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset confirmation dialog */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset to Default Stages?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace all your custom stages with the predefined defaults.
              Contacts with removed stages will have their stage set to empty.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetToDefaults}>
              Reset to Defaults
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Discard changes confirmation dialog */}
      <AlertDialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard Changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to close without saving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDiscard}>
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default LeadStageCustomizer;
