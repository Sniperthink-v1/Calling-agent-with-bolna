import { pool } from '../config/database';
import { logger } from '../utils/logger';

/**
 * Lead Stage structure - Fixed stages + user-customizable stages
 * Stages are stored in users.custom_lead_stages as JSONB array
 * New users are auto-populated with predefined stages via database trigger
 * 
 * FIXED STAGES (cannot be deleted/renamed):
 * 1. New Lead - Default stage for all new contacts
 * 2. Attempted to Contact - Auto-set when call fails (busy/no-answer/failed)
 * 3. Contacted - Auto-set when call is answered (in-progress status)
 * 
 * Users can add custom stages after these 3 fixed ones.
 */
export interface LeadStage {
  name: string;
  color: string;
  order: number;
  isFixed?: boolean; // True for the 3 fixed stages that cannot be deleted/renamed
}

// Fixed stage names - these cannot be deleted or renamed
export const FIXED_STAGE_NAMES = ['New Lead', 'Attempted to Contact', 'Contacted'] as const;
export type FixedStageName = typeof FIXED_STAGE_NAMES[number];

// Predefined stages for new users (also used in migration)
// These are auto-populated via database trigger trg_initialize_user_lead_stages
// First 3 stages are FIXED and cannot be deleted/renamed
export const PREDEFINED_LEAD_STAGES: LeadStage[] = [
  { name: 'New Lead', color: '#3B82F6', order: 0, isFixed: true },              // Blue - Default
  { name: 'Attempted to Contact', color: '#F59E0B', order: 1, isFixed: true },  // Amber - Failed call attempts
  { name: 'Contacted', color: '#10B981', order: 2, isFixed: true },             // Green - Call answered
];

/**
 * Check if a stage name is one of the fixed stages
 */
export function isFixedStage(stageName: string): boolean {
  return FIXED_STAGE_NAMES.some(
    fixed => fixed.toLowerCase() === stageName.toLowerCase()
  );
}

/**
 * Get the order/priority of a stage (used for progression logic)
 * Returns: 0 = New Lead, 1 = Attempted to Contact, 2 = Contacted, -1 = unknown
 */
export function getStageOrder(stageName: string): number {
  const lowerName = stageName.toLowerCase();
  if (lowerName === 'new lead') return 0;
  if (lowerName === 'attempted to contact') return 1;
  if (lowerName === 'contacted') return 2;
  return -1; // Custom stage or unknown
}

// Generate a random vibrant color
function generateRandomColor(): string {
  // Generate a vibrant color using HSL with high saturation
  const hue = Math.floor(Math.random() * 360);
  const saturation = 60 + Math.floor(Math.random() * 25); // 60-85%
  const lightness = 45 + Math.floor(Math.random() * 15);  // 45-60%
  
  // Convert HSL to hex
  const h = hue / 360;
  const s = saturation / 100;
  const l = lightness / 100;
  
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = Math.round(hue2rgb(p, q, h + 1/3) * 255);
  const g = Math.round(hue2rgb(p, q, h) * 255);
  const b = Math.round(hue2rgb(p, q, h - 1/3) * 255);
  
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export class LeadStageService {
  /**
   * Get the color for a lead stage
   */
  static getStageColor(stageName: string, userStages: LeadStage[] = []): string | null {
    const stage = userStages.find(
      s => s.name.toLowerCase() === stageName.toLowerCase()
    );
    return stage?.color || null;
  }

  /**
   * Get all stages for a user (sorted by order)
   */
  static async getAllStages(userId: string): Promise<LeadStage[]> {
    try {
      const result = await pool.query(
        'SELECT custom_lead_stages FROM users WHERE id = $1',
        [userId]
      );
      
      const stages: LeadStage[] = result.rows[0]?.custom_lead_stages || [];
      
      // Sort by order field
      return stages.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    } catch (error) {
      logger.error('Error getting all stages:', error);
      throw error;
    }
  }

  /**
   * Add a new stage for a user
   */
  static async addStage(
    userId: string, 
    stageName: string, 
    color?: string
  ): Promise<LeadStage[]> {
    try {
      // Get existing stages
      const stages = await this.getAllStages(userId);
      
      // Check if stage name already exists
      const existingStage = stages.find(
        s => s.name.toLowerCase() === stageName.toLowerCase()
      );
      
      if (existingStage) {
        throw new Error(`Stage "${stageName}" already exists`);
      }
      
      // Generate random color if not provided
      const stageColor = color || generateRandomColor();
      
      // Validate color format
      if (!/^#[0-9A-Fa-f]{6}$/.test(stageColor)) {
        throw new Error('Invalid color format. Use hex format like #FF5733');
      }
      
      // Determine order (add to end)
      const maxOrder = stages.reduce((max, s) => Math.max(max, s.order ?? 0), -1);
      
      // Add new stage
      const newStage: LeadStage = {
        name: stageName.trim(),
        color: stageColor.toUpperCase(),
        order: maxOrder + 1,
      };
      
      const updatedStages = [...stages, newStage];
      
      // Save to database
      await pool.query(
        'UPDATE users SET custom_lead_stages = $1::jsonb, updated_at = NOW() WHERE id = $2',
        [JSON.stringify(updatedStages), userId]
      );
      
      logger.info(`Stage added for user ${userId}: ${stageName}`);
      return updatedStages;
    } catch (error) {
      logger.error('Error adding stage:', error);
      throw error;
    }
  }

  /**
   * Update a stage (rename and/or change color)
   * Also updates all contacts that have this stage
   * NOTE: Fixed stages (New Lead, Attempted to Contact, Contacted) cannot be renamed
   */
  static async updateStage(
    userId: string,
    oldStageName: string,
    newStageName?: string,
    newColor?: string
  ): Promise<LeadStage[]> {
    // Check if trying to rename a fixed stage
    if (newStageName && isFixedStage(oldStageName) && 
        newStageName.toLowerCase() !== oldStageName.toLowerCase()) {
      throw new Error(`Cannot rename fixed stage "${oldStageName}". Fixed stages (New Lead, Attempted to Contact, Contacted) cannot be renamed.`);
    }
    
    const client = await pool.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Get existing stages
      const result = await client.query(
        'SELECT custom_lead_stages FROM users WHERE id = $1',
        [userId]
      );
      const stages: LeadStage[] = result.rows[0]?.custom_lead_stages || [];
      
      // Find the stage to update
      const stageIndex = stages.findIndex(
        s => s.name.toLowerCase() === oldStageName.toLowerCase()
      );
      
      if (stageIndex === -1) {
        throw new Error(`Stage "${oldStageName}" not found`);
      }
      
      // Update stage name if provided
      const actualNewName = newStageName?.trim() || stages[stageIndex].name;
      
      // Check if new name conflicts with existing stages
      if (newStageName && newStageName.toLowerCase() !== oldStageName.toLowerCase()) {
        const nameConflict = stages.some(
          (s, i) => i !== stageIndex && s.name.toLowerCase() === actualNewName.toLowerCase()
        );
        if (nameConflict) {
          throw new Error(`Stage "${actualNewName}" already exists`);
        }
      }
      
      // Validate color format if provided
      if (newColor && !/^#[0-9A-Fa-f]{6}$/.test(newColor)) {
        throw new Error('Invalid color format. Use hex format like #FF5733');
      }
      
      // Update the stage
      stages[stageIndex] = {
        name: actualNewName,
        color: newColor?.toUpperCase() || stages[stageIndex].color,
        order: stages[stageIndex].order,
      };
      
      // Save updated stages to users table
      await client.query(
        'UPDATE users SET custom_lead_stages = $1::jsonb, updated_at = NOW() WHERE id = $2',
        [JSON.stringify(stages), userId]
      );
      
      // Update all contacts with the old stage name (if name changed)
      if (newStageName && newStageName.toLowerCase() !== oldStageName.toLowerCase()) {
        await client.query(
          'UPDATE contacts SET lead_stage = $1, updated_at = NOW() WHERE user_id = $2 AND LOWER(lead_stage) = LOWER($3)',
          [actualNewName, userId, oldStageName]
        );
        logger.info(`Updated contacts from stage "${oldStageName}" to "${actualNewName}" for user ${userId}`);
      }
      
      await client.query('COMMIT');
      
      logger.info(`Stage updated for user ${userId}: ${oldStageName} -> ${actualNewName}`);
      return stages.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error updating stage:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete a stage
   * Sets lead_stage to NULL for all contacts that had this stage
   * NOTE: Fixed stages (New Lead, Attempted to Contact, Contacted) cannot be deleted
   */
  static async deleteStage(
    userId: string, 
    stageName: string
  ): Promise<LeadStage[]> {
    // Check if trying to delete a fixed stage
    if (isFixedStage(stageName)) {
      throw new Error(`Cannot delete fixed stage "${stageName}". Fixed stages (New Lead, Attempted to Contact, Contacted) cannot be deleted.`);
    }
    
    const client = await pool.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Get existing stages
      const result = await client.query(
        'SELECT custom_lead_stages FROM users WHERE id = $1',
        [userId]
      );
      const stages: LeadStage[] = result.rows[0]?.custom_lead_stages || [];
      
      // Find the stage to delete
      const stageIndex = stages.findIndex(
        s => s.name.toLowerCase() === stageName.toLowerCase()
      );
      
      if (stageIndex === -1) {
        throw new Error(`Stage "${stageName}" not found`);
      }
      
      // Remove the stage
      stages.splice(stageIndex, 1);
      
      // Re-normalize order values
      stages.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
      stages.forEach((s, i) => { s.order = i; });
      
      // Save updated stages to users table
      await client.query(
        'UPDATE users SET custom_lead_stages = $1::jsonb, updated_at = NOW() WHERE id = $2',
        [JSON.stringify(stages), userId]
      );
      
      // Set lead_stage to NULL for all contacts with this stage
      const updateResult = await client.query(
        'UPDATE contacts SET lead_stage = NULL, updated_at = NOW() WHERE user_id = $1 AND LOWER(lead_stage) = LOWER($2)',
        [userId, stageName]
      );
      
      await client.query('COMMIT');
      
      logger.info(`Stage deleted for user ${userId}: ${stageName}. Affected contacts: ${updateResult.rowCount}`);
      return stages;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error deleting stage:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Reorder stages (used for drag-and-drop reordering)
   * @param orderedStageNames - Array of stage names in new order
   */
  static async reorderStages(
    userId: string,
    orderedStageNames: string[]
  ): Promise<LeadStage[]> {
    try {
      // Get existing stages
      const stages = await this.getAllStages(userId);
      
      // Validate all stage names exist
      const stageMap = new Map(stages.map(s => [s.name.toLowerCase(), s]));
      
      for (const name of orderedStageNames) {
        if (!stageMap.has(name.toLowerCase())) {
          throw new Error(`Stage "${name}" not found`);
        }
      }
      
      // Check no stages are missing
      if (orderedStageNames.length !== stages.length) {
        throw new Error('All stages must be included in the reorder request');
      }
      
      // Create reordered stages array
      const reorderedStages: LeadStage[] = orderedStageNames.map((name, index) => {
        const stage = stageMap.get(name.toLowerCase())!;
        return {
          ...stage,
          order: index,
        };
      });
      
      // Save to database
      await pool.query(
        'UPDATE users SET custom_lead_stages = $1::jsonb, updated_at = NOW() WHERE id = $2',
        [JSON.stringify(reorderedStages), userId]
      );
      
      logger.info(`Stages reordered for user ${userId}`);
      return reorderedStages;
    } catch (error) {
      logger.error('Error reordering stages:', error);
      throw error;
    }
  }

  /**
   * Replace all stages at once (full update)
   * Used by the customizer popup to save all changes atomically
   * NOTE: Fixed stages (New Lead, Attempted to Contact, Contacted) cannot be deleted or renamed
   */
  static async replaceAllStages(
    userId: string,
    newStages: LeadStage[]
  ): Promise<LeadStage[]> {
    const client = await pool.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Get existing stages for comparison
      const result = await client.query(
        'SELECT custom_lead_stages FROM users WHERE id = $1',
        [userId]
      );
      const oldStages: LeadStage[] = result.rows[0]?.custom_lead_stages || [];
      
      // Validate that all fixed stages are present and not renamed
      const newStageNamesLower = newStages.map(s => s.name.toLowerCase());
      for (const fixedName of FIXED_STAGE_NAMES) {
        if (!newStageNamesLower.includes(fixedName.toLowerCase())) {
          throw new Error(`Cannot remove fixed stage "${fixedName}". Fixed stages (New Lead, Attempted to Contact, Contacted) cannot be deleted.`);
        }
      }
      
      // Validate new stages
      const seenNames = new Set<string>();
      for (const stage of newStages) {
        // Check for duplicates
        const lowerName = stage.name.toLowerCase();
        if (seenNames.has(lowerName)) {
          throw new Error(`Duplicate stage name: "${stage.name}"`);
        }
        seenNames.add(lowerName);
        
        // Validate name
        if (!stage.name || stage.name.trim().length === 0) {
          throw new Error('Stage name cannot be empty');
        }
        
        // Validate color format
        if (!stage.color || !/^#[0-9A-Fa-f]{6}$/.test(stage.color)) {
          throw new Error(`Invalid color format for stage "${stage.name}". Use hex format like #FF5733`);
        }
      }
      
      // Normalize order values and colors
      const normalizedStages: LeadStage[] = newStages.map((stage, index) => ({
        name: stage.name.trim(),
        color: stage.color.toUpperCase(),
        order: index,
      }));
      
      // Find deleted stages (in old but not in new)
      const newStageNames = new Set(normalizedStages.map(s => s.name.toLowerCase()));
      const deletedStages = oldStages.filter(s => !newStageNames.has(s.name.toLowerCase()));
      
      // Find renamed stages (by comparing old and new names)
      const oldStageNames = new Set(oldStages.map(s => s.name.toLowerCase()));
      
      // Save new stages
      await client.query(
        'UPDATE users SET custom_lead_stages = $1::jsonb, updated_at = NOW() WHERE id = $2',
        [JSON.stringify(normalizedStages), userId]
      );
      
      // Set lead_stage to NULL for contacts with deleted stages
      for (const deletedStage of deletedStages) {
        await client.query(
          'UPDATE contacts SET lead_stage = NULL, updated_at = NOW() WHERE user_id = $1 AND LOWER(lead_stage) = LOWER($2)',
          [userId, deletedStage.name]
        );
      }
      
      await client.query('COMMIT');
      
      logger.info(`All stages replaced for user ${userId}. Deleted ${deletedStages.length} stages.`);
      return normalizedStages;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error replacing all stages:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get count of contacts in each stage for a user
   */
  static async getStageStats(userId: string): Promise<{ stageName: string; count: number; color: string }[]> {
    try {
      const result = await pool.query(
        `SELECT 
          COALESCE(lead_stage, 'Unassigned') as stage_name,
          COUNT(*) as count
        FROM contacts 
        WHERE user_id = $1 
        GROUP BY lead_stage
        ORDER BY count DESC`,
        [userId]
      );
      
      // Get all stages to map colors
      const allStages = await this.getAllStages(userId);
      const stageColorMap = new Map(allStages.map(s => [s.name.toLowerCase(), s.color]));
      
      return result.rows.map((row: { stage_name: string; count: string }) => ({
        stageName: row.stage_name,
        count: parseInt(row.count, 10),
        color: stageColorMap.get(row.stage_name.toLowerCase()) || '#6B7280', // Gray for unassigned
      }));
    } catch (error) {
      logger.error('Error getting stage stats:', error);
      throw error;
    }
  }

  /**
   * Bulk update lead stage for multiple contacts
   */
  static async bulkUpdateLeadStage(
    userId: string,
    contactIds: string[],
    newStage: string | null
  ): Promise<number> {
    try {
      // Validate stage exists if not null
      if (newStage) {
        const allStages = await this.getAllStages(userId);
        const stageExists = allStages.some(
          s => s.name.toLowerCase() === newStage.toLowerCase()
        );
        if (!stageExists) {
          throw new Error(`Stage "${newStage}" does not exist`);
        }
      }
      
      const result = await pool.query(
        `UPDATE contacts 
        SET lead_stage = $1, updated_at = NOW() 
        WHERE user_id = $2 AND id = ANY($3::uuid[])`,
        [newStage, userId, contactIds]
      );
      
      logger.info(`Bulk updated ${result.rowCount} contacts to stage "${newStage}" for user ${userId}`);
      return result.rowCount || 0;
    } catch (error) {
      logger.error('Error bulk updating lead stage:', error);
      throw error;
    }
  }

  /**
   * Auto-progress lead stage based on call outcome
   * This is called by webhook service when call status changes
   * 
   * Stage Progression Rules:
   * - "New Lead" → "Attempted to Contact" (when call fails: busy/no-answer/failed)
   * - "New Lead" or "Attempted to Contact" → "Contacted" (when call is answered: in-progress)
   * - "Contacted" never downgrades (stays at "Contacted" even if subsequent calls fail)
   * 
   * @param contactId - The contact to update
   * @param userId - The user who owns the contact
   * @param callOutcome - The call outcome: 'answered' | 'busy' | 'no-answer' | 'failed'
   * @returns The new stage name if updated, or null if no change
   */
  static async autoProgressStage(
    contactId: string,
    userId: string,
    callOutcome: 'answered' | 'busy' | 'no-answer' | 'failed'
  ): Promise<string | null> {
    try {
      // Get current contact stage
      const contactResult = await pool.query(
        'SELECT lead_stage FROM contacts WHERE id = $1 AND user_id = $2',
        [contactId, userId]
      );
      
      if (contactResult.rows.length === 0) {
        logger.warn('Contact not found for auto-progress', { contactId, userId });
        return null;
      }
      
      const currentStage = contactResult.rows[0].lead_stage || 'New Lead';
      const currentStageOrder = getStageOrder(currentStage);
      
      let newStage: string | null = null;
      
      if (callOutcome === 'answered') {
        // Call was answered - progress to "Contacted"
        // Only upgrade if current stage is below "Contacted" (order < 2)
        if (currentStageOrder < 2) {
          newStage = 'Contacted';
        }
      } else {
        // Call failed (busy/no-answer/failed) - progress to "Attempted to Contact"
        // Only upgrade if current stage is "New Lead" (order = 0)
        if (currentStageOrder === 0) {
          newStage = 'Attempted to Contact';
        }
      }
      
      if (newStage) {
        // Update contact stage
        await pool.query(
          `UPDATE contacts 
           SET lead_stage = $1, lead_stage_updated_at = NOW(), updated_at = NOW() 
           WHERE id = $2 AND user_id = $3`,
          [newStage, contactId, userId]
        );
        
        logger.info('Auto-progressed lead stage', {
          contactId,
          userId,
          callOutcome,
          fromStage: currentStage,
          toStage: newStage
        });
        
        return newStage;
      }
      
      logger.debug('No stage progression needed', {
        contactId,
        userId,
        callOutcome,
        currentStage,
        currentStageOrder
      });
      
      return null;
    } catch (error) {
      logger.error('Error auto-progressing lead stage:', error);
      // Don't throw - stage update failure shouldn't break webhook processing
      return null;
    }
  }
}

export default LeadStageService;
