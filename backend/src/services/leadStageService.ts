import { pool } from '../config/database';
import { logger } from '../utils/logger';
import { CustomLeadStage } from '../models/User';

// Default lead stages with their colors
export const DEFAULT_LEAD_STAGES: { name: string; color: string }[] = [
  { name: 'New Lead', color: '#3B82F6' },      // Blue
  { name: 'Contacted', color: '#8B5CF6' },     // Purple
  { name: 'Qualified', color: '#F59E0B' },     // Amber
  { name: 'Proposal Sent', color: '#06B6D4' }, // Cyan
  { name: 'Negotiation', color: '#EC4899' },   // Pink
  { name: 'Won', color: '#10B981' },           // Green
  { name: 'Lost', color: '#EF4444' },          // Red
];

// Generate a random color (not from default palette) for custom stages
function generateRandomColor(): string {
  const defaultColors = DEFAULT_LEAD_STAGES.map(s => s.color.toLowerCase());
  let color: string;
  
  // Keep generating until we get a color not in default palette
  do {
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
    
    color = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  } while (defaultColors.includes(color.toLowerCase()));
  
  return color.toUpperCase();
}

export class LeadStageService {
  /**
   * Get the color for a lead stage (either default or custom)
   */
  static getStageColor(stageName: string, customStages: CustomLeadStage[] = []): string | null {
    // First check default stages
    const defaultStage = DEFAULT_LEAD_STAGES.find(
      s => s.name.toLowerCase() === stageName.toLowerCase()
    );
    if (defaultStage) {
      return defaultStage.color;
    }
    
    // Then check custom stages
    const customStage = customStages.find(
      s => s.name.toLowerCase() === stageName.toLowerCase()
    );
    if (customStage) {
      return customStage.color;
    }
    
    return null;
  }

  /**
   * Get all available stages for a user (default + custom)
   */
  static async getAllStages(userId: string): Promise<{ name: string; color: string; isCustom: boolean }[]> {
    try {
      // Get user's custom stages
      const result = await pool.query(
        'SELECT custom_lead_stages FROM users WHERE id = $1',
        [userId]
      );
      
      const customStages: CustomLeadStage[] = result.rows[0]?.custom_lead_stages || [];
      
      // Combine default and custom stages
      return [
        ...DEFAULT_LEAD_STAGES.map(s => ({ ...s, isCustom: false })),
        ...customStages.map(s => ({ ...s, isCustom: true })),
      ];
    } catch (error) {
      logger.error('Error getting all stages:', error);
      throw error;
    }
  }

  /**
   * Get only custom stages for a user
   */
  static async getCustomStages(userId: string): Promise<CustomLeadStage[]> {
    try {
      const result = await pool.query(
        'SELECT custom_lead_stages FROM users WHERE id = $1',
        [userId]
      );
      
      return result.rows[0]?.custom_lead_stages || [];
    } catch (error) {
      logger.error('Error getting custom stages:', error);
      throw error;
    }
  }

  /**
   * Add a new custom stage for a user
   */
  static async addCustomStage(
    userId: string, 
    stageName: string, 
    color?: string
  ): Promise<CustomLeadStage[]> {
    try {
      // Get existing custom stages
      const customStages = await this.getCustomStages(userId);
      
      // Check if stage name already exists (default or custom)
      const allStages = await this.getAllStages(userId);
      const existingStage = allStages.find(
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
      
      // Add new stage
      const newStage: CustomLeadStage = {
        name: stageName.trim(),
        color: stageColor.toUpperCase(),
      };
      
      const updatedStages = [...customStages, newStage];
      
      // Save to database
      await pool.query(
        'UPDATE users SET custom_lead_stages = $1::jsonb, updated_at = NOW() WHERE id = $2',
        [JSON.stringify(updatedStages), userId]
      );
      
      logger.info(`Custom stage added for user ${userId}: ${stageName}`);
      return updatedStages;
    } catch (error) {
      logger.error('Error adding custom stage:', error);
      throw error;
    }
  }

  /**
   * Update a custom stage (rename and/or change color)
   * Also updates all contacts that have this stage
   */
  static async updateCustomStage(
    userId: string,
    oldStageName: string,
    newStageName?: string,
    newColor?: string
  ): Promise<CustomLeadStage[]> {
    const client = await pool.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Get existing custom stages
      const result = await client.query(
        'SELECT custom_lead_stages FROM users WHERE id = $1',
        [userId]
      );
      const customStages: CustomLeadStage[] = result.rows[0]?.custom_lead_stages || [];
      
      // Find the stage to update
      const stageIndex = customStages.findIndex(
        s => s.name.toLowerCase() === oldStageName.toLowerCase()
      );
      
      if (stageIndex === -1) {
        // Check if it's a default stage (can't edit default stages)
        const isDefault = DEFAULT_LEAD_STAGES.some(
          s => s.name.toLowerCase() === oldStageName.toLowerCase()
        );
        if (isDefault) {
          throw new Error('Cannot edit default stages');
        }
        throw new Error(`Stage "${oldStageName}" not found`);
      }
      
      // Update stage name if provided
      const actualNewName = newStageName?.trim() || customStages[stageIndex].name;
      
      // Check if new name conflicts with existing stages
      if (newStageName && newStageName.toLowerCase() !== oldStageName.toLowerCase()) {
        const allStages = [
          ...DEFAULT_LEAD_STAGES,
          ...customStages.filter((_, i) => i !== stageIndex),
        ];
        const nameConflict = allStages.some(
          s => s.name.toLowerCase() === actualNewName.toLowerCase()
        );
        if (nameConflict) {
          throw new Error(`Stage "${actualNewName}" already exists`);
        }
      }
      
      // Update the stage
      customStages[stageIndex] = {
        name: actualNewName,
        color: newColor?.toUpperCase() || customStages[stageIndex].color,
      };
      
      // Save updated stages to users table
      await client.query(
        'UPDATE users SET custom_lead_stages = $1::jsonb, updated_at = NOW() WHERE id = $2',
        [JSON.stringify(customStages), userId]
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
      
      logger.info(`Custom stage updated for user ${userId}: ${oldStageName} -> ${actualNewName}`);
      return customStages;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error updating custom stage:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete a custom stage
   * Sets lead_stage to NULL for all contacts that had this stage
   */
  static async deleteCustomStage(
    userId: string, 
    stageName: string
  ): Promise<CustomLeadStage[]> {
    const client = await pool.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Get existing custom stages
      const result = await client.query(
        'SELECT custom_lead_stages FROM users WHERE id = $1',
        [userId]
      );
      const customStages: CustomLeadStage[] = result.rows[0]?.custom_lead_stages || [];
      
      // Find the stage to delete
      const stageIndex = customStages.findIndex(
        s => s.name.toLowerCase() === stageName.toLowerCase()
      );
      
      if (stageIndex === -1) {
        // Check if it's a default stage (can't delete default stages)
        const isDefault = DEFAULT_LEAD_STAGES.some(
          s => s.name.toLowerCase() === stageName.toLowerCase()
        );
        if (isDefault) {
          throw new Error('Cannot delete default stages');
        }
        throw new Error(`Stage "${stageName}" not found`);
      }
      
      // Remove the stage
      customStages.splice(stageIndex, 1);
      
      // Save updated stages to users table
      await client.query(
        'UPDATE users SET custom_lead_stages = $1::jsonb, updated_at = NOW() WHERE id = $2',
        [JSON.stringify(customStages), userId]
      );
      
      // Set lead_stage to NULL for all contacts with this stage
      const updateResult = await client.query(
        'UPDATE contacts SET lead_stage = NULL, updated_at = NOW() WHERE user_id = $1 AND LOWER(lead_stage) = LOWER($2)',
        [userId, stageName]
      );
      
      await client.query('COMMIT');
      
      logger.info(`Custom stage deleted for user ${userId}: ${stageName}. Affected contacts: ${updateResult.rowCount}`);
      return customStages;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error deleting custom stage:', error);
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
}

export default LeadStageService;
