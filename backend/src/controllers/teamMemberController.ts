import { Request, Response } from 'express';
import teamMemberService from '../services/teamMemberService';
import { TeamMemberRole } from '../models/TeamMember';
import { logger } from '../utils/logger';

/**
 * Controller for team member management
 */
class TeamMemberController {
  /**
   * Get all team members for the authenticated user's tenant
   */
  async getTeamMembers(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const teamMembers = await teamMemberService.getTeamMembers(userId);
      
      // Don't expose password_hash and invite_token in response
      const sanitizedMembers = teamMembers.map(member => ({
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role,
        is_active: member.is_active,
        password_set: !!member.password_hash,
        invite_pending: !member.password_hash && !!member.invite_token,
        last_login: member.last_login,
        created_at: member.created_at,
      }));

      res.json({ team_members: sanitizedMembers });
    } catch (error) {
      logger.error('Error getting team members:', error);
      res.status(500).json({ error: 'Failed to get team members' });
    }
  }

  /**
   * Invite a new team member
   */
  async inviteTeamMember(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { name, email, role } = req.body;

      // Validate required fields
      if (!name || !email || !role) {
        res.status(400).json({ error: 'Name, email, and role are required' });
        return;
      }

      // Validate role
      if (!['manager', 'agent', 'viewer'].includes(role)) {
        res.status(400).json({ error: 'Invalid role. Must be manager, agent, or viewer' });
        return;
      }

      // Get inviter name from request
      const inviterName = req.user?.name || 'Admin';

      let result;
      try {
        result = await teamMemberService.inviteTeamMember(
          {
            tenant_user_id: userId,
            name,
            email,
            role: role as TeamMemberRole,
          },
          inviterName
        );
      } catch (serviceError) {
        logger.error('Error in inviteTeamMember service:', serviceError);
        res.status(500).json({ error: 'Failed to process invitation' });
        return;
      }

      if (!result || !result.success) {
        res.status(400).json({ error: result?.error || 'Failed to invite team member' });
        return;
      }

      res.status(201).json({
        message: 'Team member invited successfully',
        team_member: {
          id: result.team_member!.id,
          name: result.team_member!.name,
          email: result.team_member!.email,
          role: result.team_member!.role,
          invite_pending: true,
        },
      });
    } catch (error) {
      logger.error('Error inviting team member:', error);
      res.status(500).json({ error: 'Failed to invite team member' });
    }
  }

  /**
   * Update a team member
   */
  async updateTeamMember(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const { name, role, is_active } = req.body;

      // Validate role if provided
      if (role && !['manager', 'agent', 'viewer'].includes(role)) {
        res.status(400).json({ error: 'Invalid role. Must be manager, agent, or viewer' });
        return;
      }

      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (role !== undefined) updates.role = role;
      if (is_active !== undefined) updates.is_active = is_active;

      const updated = await teamMemberService.updateTeamMember(id, userId, updates);

      if (!updated) {
        res.status(404).json({ error: 'Team member not found' });
        return;
      }

      res.json({
        message: 'Team member updated successfully',
        team_member: {
          id: updated.id,
          name: updated.name,
          email: updated.email,
          role: updated.role,
          is_active: updated.is_active,
        },
      });
    } catch (error) {
      logger.error('Error updating team member:', error);
      res.status(500).json({ error: 'Failed to update team member' });
    }
  }

  /**
   * Deactivate a team member
   */
  async deactivateTeamMember(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;

      const deactivated = await teamMemberService.deactivateTeamMember(id, userId);

      if (!deactivated) {
        res.status(404).json({ error: 'Team member not found' });
        return;
      }

      res.json({
        message: 'Team member deactivated successfully',
        team_member: {
          id: deactivated.id,
          is_active: deactivated.is_active,
        },
      });
    } catch (error) {
      logger.error('Error deactivating team member:', error);
      res.status(500).json({ error: 'Failed to deactivate team member' });
    }
  }

  /**
   * Resend invite email to a team member
   */
  async resendInvite(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const inviterName = req.user?.name || 'Admin';

      // Verify team member belongs to this tenant first
      const teamMember = await teamMemberService.getTeamMemberById(id, userId);
      if (!teamMember) {
        res.status(404).json({ error: 'Team member not found' });
        return;
      }

      const result = await teamMemberService.resendInvite(id, inviterName);

      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.json({
        message: 'Invite email resent successfully',
      });
    } catch (error) {
      logger.error('Error resending invite:', error);
      res.status(500).json({ error: 'Failed to resend invite' });
    }
  }

  /**
   * Get team member stats
   */
  async getTeamStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const stats = await teamMemberService.getTeamStats(userId);
      res.json({ stats });
    } catch (error) {
      logger.error('Error getting team stats:', error);
      res.status(500).json({ error: 'Failed to get team stats' });
    }
  }

  /**
   * Get role descriptions for UI
   */
  async getRoleDescriptions(_req: Request, res: Response): Promise<void> {
    try {
      const descriptions = teamMemberService.getRoleDescriptions();
      res.json({ roles: descriptions });
    } catch (error) {
      logger.error('Error getting role descriptions:', error);
      res.status(500).json({ error: 'Failed to get role descriptions' });
    }
  }

  /**
   * Set password using invite token (public endpoint)
   */
  async setPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        res.status(400).json({ error: 'Token and password are required' });
        return;
      }

      // Validate password strength
      if (password.length < 8) {
        res.status(400).json({ error: 'Password must be at least 8 characters long' });
        return;
      }

      const result = await teamMemberService.setPasswordWithToken(token, password);

      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.json({
        message: 'Password set successfully',
        token: result.token,
        refreshToken: result.refreshToken,
        user: {
          id: result.team_member!.id,
          name: result.team_member!.name,
          email: result.team_member!.email,
          role: result.team_member!.role,
          isTeamMember: true,
        },
      });
    } catch (error) {
      logger.error('Error setting password:', error);
      res.status(500).json({ error: 'Failed to set password' });
    }
  }

  /**
   * Validate invite token (public endpoint)
   */
  async validateInviteToken(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;

      if (!token) {
        res.status(400).json({ error: 'Token is required', valid: false });
        return;
      }

      const TeamMemberModel = require('../models/TeamMember').default;
      const teamMember = await TeamMemberModel.findByInviteToken(token);

      if (!teamMember) {
        res.json({ valid: false, message: 'Invalid or expired invite token' });
        return;
      }

      res.json({
        valid: true,
        name: teamMember.name,
        email: teamMember.email,
        role: teamMember.role,
      });
    } catch (error) {
      logger.error('Error validating invite token:', error);
      res.status(500).json({ error: 'Failed to validate token', valid: false });
    }
  }
}

export default new TeamMemberController();
