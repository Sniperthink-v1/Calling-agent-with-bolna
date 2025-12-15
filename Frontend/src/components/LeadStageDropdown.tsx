import React, { useState, useCallback } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { useLeadStages } from '../hooks/useLeadStages';
import { Plus, Pencil, Trash2, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { DEFAULT_LEAD_STAGES } from '../types/api';

// Color palette for custom stages (excluding default stage colors)
const CUSTOM_STAGE_COLORS = [
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#84CC16', // Lime
  '#A855F7', // Purple
  '#0EA5E9', // Sky
  '#EAB308', // Yellow
  '#64748B', // Slate
  '#DC2626', // Red variant
  '#059669', // Emerald
];

interface LeadStageDropdownProps {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  showManageOption?: boolean;
  size?: 'sm' | 'default';
}

interface StageModalState {
  isOpen: boolean;
  mode: 'create' | 'edit';
  stageName: string;
  stageColor: string;
  originalName?: string;
}

export const LeadStageDropdown: React.FC<LeadStageDropdownProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = 'Select stage...',
  className = '',
  showManageOption = true,
  size = 'default',
}) => {
  const {
    stages,
    loading,
    creating,
    updating,
    deleting,
    addCustomStage,
    updateCustomStage,
    deleteCustomStage,
    isDefaultStage,
  } = useLeadStages();

  const [stageModal, setStageModal] = useState<StageModalState>({
    isOpen: false,
    mode: 'create',
    stageName: '',
    stageColor: CUSTOM_STAGE_COLORS[0],
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    stageName: string;
  }>({ isOpen: false, stageName: '' });
  const [isManaging, setIsManaging] = useState(false);

  // Get default and custom stages separately
  const defaultStages = stages.filter(s => !s.isCustom);
  const customStages = stages.filter(s => s.isCustom);

  const handleValueChange = useCallback((newValue: string) => {
    if (newValue === '__manage__') {
      setIsManaging(true);
      return;
    }
    if (newValue === '__add_new__') {
      setStageModal({
        isOpen: true,
        mode: 'create',
        stageName: '',
        stageColor: CUSTOM_STAGE_COLORS[Math.floor(Math.random() * CUSTOM_STAGE_COLORS.length)],
      });
      return;
    }
    if (newValue === '__clear__') {
      onChange(null);
      return;
    }
    onChange(newValue);
  }, [onChange]);

  const handleCreateStage = async () => {
    const { stageName, stageColor } = stageModal;
    
    if (!stageName.trim()) {
      toast.error('Stage name is required');
      return;
    }

    // Check for duplicates
    const exists = stages.some(
      s => s.name.toLowerCase() === stageName.trim().toLowerCase()
    );
    if (exists) {
      toast.error('A stage with this name already exists');
      return;
    }

    const result = await addCustomStage(stageName.trim(), stageColor);
    if (result) {
      toast.success('Custom stage created');
      setStageModal({ ...stageModal, isOpen: false });
    } else {
      toast.error('Failed to create custom stage');
    }
  };

  const handleUpdateStage = async () => {
    const { stageName, stageColor, originalName } = stageModal;
    
    if (!stageName.trim()) {
      toast.error('Stage name is required');
      return;
    }

    if (!originalName) return;

    // Check for duplicates (excluding current name)
    const exists = stages.some(
      s => s.name.toLowerCase() === stageName.trim().toLowerCase() &&
           s.name.toLowerCase() !== originalName.toLowerCase()
    );
    if (exists) {
      toast.error('A stage with this name already exists');
      return;
    }

    const result = await updateCustomStage(
      originalName,
      stageName.trim() !== originalName ? stageName.trim() : undefined,
      stageColor
    );
    if (result) {
      toast.success('Stage updated successfully');
      setStageModal({ ...stageModal, isOpen: false });
    } else {
      toast.error('Failed to update stage');
    }
  };

  const handleDeleteStage = async () => {
    const { stageName } = deleteConfirm;
    
    const result = await deleteCustomStage(stageName);
    if (result) {
      toast.success('Stage deleted');
      setDeleteConfirm({ isOpen: false, stageName: '' });
      
      // If current value was the deleted stage, clear it
      if (value === stageName) {
        onChange(null);
      }
    } else {
      toast.error('Failed to delete stage');
    }
  };

  const openEditModal = (stage: { name: string; color: string }) => {
    setStageModal({
      isOpen: true,
      mode: 'edit',
      stageName: stage.name,
      stageColor: stage.color,
      originalName: stage.name,
    });
  };

  const openDeleteConfirm = (stageName: string) => {
    setDeleteConfirm({ isOpen: true, stageName });
  };

  // Render color dot
  const ColorDot = ({ color }: { color: string }) => (
    <span
      className="inline-block w-3 h-3 rounded-full mr-2 flex-shrink-0"
      style={{ backgroundColor: color }}
    />
  );

  // Find current stage info
  const currentStage = value 
    ? stages.find(s => s.name === value) 
    : null;

  const isLoading = loading || creating || updating || deleting;

  return (
    <>
      <Select
        value={value || ''}
        onValueChange={handleValueChange}
        disabled={disabled || isLoading}
      >
        <SelectTrigger 
          className={`${size === 'sm' ? 'h-8 text-sm' : ''} ${className}`}
        >
          <SelectValue placeholder={placeholder}>
            {currentStage ? (
              <span className="flex items-center">
                <ColorDot color={currentStage.color} />
                {currentStage.name}
              </span>
            ) : value ? (
              <span className="flex items-center">
                <ColorDot color="#6B7280" />
                {value}
              </span>
            ) : null}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {/* Clear option */}
          {value && (
            <>
              <SelectItem value="__clear__" className="text-muted-foreground">
                <span className="flex items-center">
                  <X className="w-3 h-3 mr-2" />
                  Clear selection
                </span>
              </SelectItem>
              <SelectSeparator />
            </>
          )}

          {/* Default stages */}
          <SelectGroup>
            <SelectLabel>Default Stages</SelectLabel>
            {defaultStages.map((stage) => (
              <SelectItem key={stage.name} value={stage.name}>
                <span className="flex items-center">
                  <ColorDot color={stage.color} />
                  {stage.name}
                </span>
              </SelectItem>
            ))}
          </SelectGroup>

          {/* Custom stages */}
          {customStages.length > 0 && (
            <>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel>Custom Stages</SelectLabel>
                {customStages.map((stage) => (
                  <SelectItem key={stage.name} value={stage.name}>
                    <span className="flex items-center">
                      <ColorDot color={stage.color} />
                      {stage.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectGroup>
            </>
          )}

          {/* Management options */}
          {showManageOption && (
            <>
              <SelectSeparator />
              <SelectItem value="__add_new__" className="text-primary">
                <span className="flex items-center">
                  <Plus className="w-3 h-3 mr-2" />
                  Add new stage
                </span>
              </SelectItem>
              {customStages.length > 0 && (
                <SelectItem value="__manage__" className="text-muted-foreground">
                  <span className="flex items-center">
                    <Pencil className="w-3 h-3 mr-2" />
                    Manage custom stages
                  </span>
                </SelectItem>
              )}
            </>
          )}
        </SelectContent>
      </Select>

      {/* Create/Edit Stage Modal */}
      <Dialog 
        open={stageModal.isOpen} 
        onOpenChange={(open) => setStageModal({ ...stageModal, isOpen: open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {stageModal.mode === 'create' ? 'Create Custom Stage' : 'Edit Custom Stage'}
            </DialogTitle>
            <DialogDescription>
              {stageModal.mode === 'create' 
                ? 'Add a new custom stage to your lead pipeline.'
                : 'Update the stage name or color. All contacts with this stage will be updated.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="stageName">Stage Name</Label>
              <Input
                id="stageName"
                placeholder="e.g., Follow Up Required"
                value={stageModal.stageName}
                onChange={(e) => setStageModal({ ...stageModal, stageName: e.target.value })}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {CUSTOM_STAGE_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      stageModal.stageColor === color 
                        ? 'border-primary scale-110' 
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setStageModal({ ...stageModal, stageColor: color })}
                  />
                ))}
              </div>
            </div>

            <div className="pt-2">
              <Label>Preview</Label>
              <div className="mt-2">
                <Badge 
                  className="text-white"
                  style={{ backgroundColor: stageModal.stageColor }}
                >
                  {stageModal.stageName || 'Stage Name'}
                </Badge>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStageModal({ ...stageModal, isOpen: false })}
            >
              Cancel
            </Button>
            <Button
              onClick={stageModal.mode === 'create' ? handleCreateStage : handleUpdateStage}
              disabled={creating || updating}
            >
              {(creating || updating) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {stageModal.mode === 'create' ? 'Create Stage' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Custom Stages Modal */}
      <Dialog open={isManaging} onOpenChange={setIsManaging}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Custom Stages</DialogTitle>
            <DialogDescription>
              Edit or delete your custom lead stages. Changes to stage names will update all associated contacts.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {customStages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No custom stages yet.</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setIsManaging(false);
                    setStageModal({
                      isOpen: true,
                      mode: 'create',
                      stageName: '',
                      stageColor: CUSTOM_STAGE_COLORS[0],
                    });
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create your first stage
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {customStages.map((stage) => (
                  <div
                    key={stage.name}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <span className="flex items-center">
                      <ColorDot color={stage.color} />
                      {stage.name}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsManaging(false);
                          openEditModal(stage);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          setIsManaging(false);
                          openDeleteConfirm(stage.name);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsManaging(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setIsManaging(false);
                setStageModal({
                  isOpen: true,
                  mode: 'create',
                  stageName: '',
                  stageColor: CUSTOM_STAGE_COLORS[Math.floor(Math.random() * CUSTOM_STAGE_COLORS.length)],
                });
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Stage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog 
        open={deleteConfirm.isOpen} 
        onOpenChange={(open) => setDeleteConfirm({ ...deleteConfirm, isOpen: open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Custom Stage?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirm.stageName}"? 
              This will remove the stage from all contacts that use it.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteStage}
              disabled={deleting}
            >
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete Stage
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// Simple badge component for displaying lead stage
interface LeadStageBadgeProps {
  stageName: string | null | undefined;
  className?: string;
}

export const LeadStageBadge: React.FC<LeadStageBadgeProps> = ({
  stageName,
  className = '',
}) => {
  const { getStageColor } = useLeadStages();

  if (!stageName) {
    return (
      <Badge variant="outline" className={`text-muted-foreground ${className}`}>
        No Stage
      </Badge>
    );
  }

  const color = getStageColor(stageName);

  return (
    <Badge
      className={`text-white ${className}`}
      style={{ backgroundColor: color }}
    >
      {stageName}
    </Badge>
  );
};

export default LeadStageDropdown;
