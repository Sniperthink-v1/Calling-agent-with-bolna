import TeamMemberModel, { TeamMemberInterface, TeamMemberRole, TEAM_MEMBER_ROLE_DESCRIPTIONS } from '../models/TeamMember';
import { emailService } from './emailService';
import { authService } from './authService';
import { logger } from '../utils/logger';

interface CreateTeamMemberInput {
  tenant_user_id: string;
  name: string;
  email: string;
  role: TeamMemberRole;
}

interface InviteResult {
  success: boolean;
  team_member?: TeamMemberInterface;
  invite_url?: string;
  error?: string;
}

interface TeamMemberStats {
  total: number;
  by_role: Record<TeamMemberRole, number>;
  active: number;
  pending_invite: number;
}

class TeamMemberService {
  private frontendUrl: string;

  constructor() {
    this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  }

  /**
   * Invite a new team member - creates the member and sends invite email
   */
  async inviteTeamMember(input: CreateTeamMemberInput, inviterName: string): Promise<InviteResult> {
    try {
      // Check if email is already taken
      const emailTaken = await TeamMemberModel.isEmailTaken(input.email);
      if (emailTaken) {
        return {
          success: false,
          error: 'Email is already registered as a user or team member'
        };
      }

      // Create the team member with invite token
      const result = await TeamMemberModel.createTeamMember(input);
      if (!result || !result.teamMember) {
        return {
          success: false,
          error: 'Failed to create team member'
        };
      }

      const { teamMember, inviteToken } = result;

      // Generate invite URL
      const inviteUrl = `${this.frontendUrl}/set-password?token=${inviteToken}`;

      // Send invite email
      const emailSent = await this.sendInviteEmail(
        teamMember.email,
        teamMember.name,
        inviterName,
        input.role,
        inviteUrl
      );

      if (!emailSent) {
        logger.warn(`Failed to send invite email to ${teamMember.email}, but team member was created`);
      }

      return {
        success: true,
        team_member: teamMember,
        invite_url: inviteUrl
      };
    } catch (error) {
      logger.error('Error inviting team member:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Send the invite email to a team member
   */
  private async sendInviteEmail(
    email: string,
    memberName: string,
    inviterName: string,
    role: TeamMemberRole,
    inviteUrl: string
  ): Promise<boolean> {
    try {
      const roleDescription = TEAM_MEMBER_ROLE_DESCRIPTIONS[role];
      
      const subject = `You've been invited to join as a ${roleDescription.label}`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to the Team!</h2>
          <p>Hi ${memberName},</p>
          <p><strong>${inviterName}</strong> has invited you to join as a <strong>${roleDescription.label}</strong>.</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #555;">Your Role: ${roleDescription.label}</h4>
            <p style="margin: 0; color: #666;">${roleDescription.description}</p>
          </div>

          <p>To get started, please set your password by clicking the button below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" 
               style="background-color: #4f46e5; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;
                      font-weight: bold;">
              Set Your Password
            </a>
          </div>

          <p style="color: #888; font-size: 12px;">
            This invitation link will expire in 7 days. If you didn't expect this invitation, 
            please ignore this email.
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #888; font-size: 12px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${inviteUrl}" style="color: #4f46e5;">${inviteUrl}</a>
          </p>
        </div>
      `;

      const text = `
        Welcome to the Team!

        Hi ${memberName},

        ${inviterName} has invited you to join as a ${roleDescription.label}.

        Your Role: ${roleDescription.label}
        ${roleDescription.description}

        To get started, please set your password by visiting:
        ${inviteUrl}

        This invitation link will expire in 7 days.
      `;

      await emailService.sendTeamInviteEmail({
        to: email,
        subject,
        html,
        text
      });

      logger.info(`Invite email sent to ${email}`);
      return true;
    } catch (error) {
      logger.error('Error sending invite email:', error);
      return false;
    }
  }

  /**
   * Resend invite email to a team member
   */
  async resendInvite(teamMemberId: string, inviterName: string): Promise<InviteResult> {
    try {
      const result = await TeamMemberModel.resendInvite(teamMemberId);
      if (!result) {
        return {
          success: false,
          error: 'Team member not found or already activated'
        };
      }

      // Model returns { teamMember, inviteToken }
      const { teamMember, inviteToken } = result;
      const inviteUrl = `${this.frontendUrl}/set-password?token=${inviteToken}`;

      const emailSent = await this.sendInviteEmail(
        teamMember.email,
        teamMember.name,
        inviterName,
        teamMember.role,
        inviteUrl
      );

      return {
        success: true,
        team_member: teamMember,
        invite_url: emailSent ? inviteUrl : undefined,
        error: emailSent ? undefined : 'Invite token regenerated but email failed to send'
      };
    } catch (error) {
      logger.error('Error resending invite:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Set password for a team member using invite token
   */
  async setPasswordWithToken(token: string, password: string): Promise<{
    success: boolean;
    team_member?: TeamMemberInterface;
    token?: string;
    refreshToken?: string;
    error?: string;
  }> {
    try {
      // Find team member by token
      const teamMember = await TeamMemberModel.findByInviteToken(token);
      if (!teamMember) {
        return {
          success: false,
          error: 'Invalid or expired invite token'
        };
      }

      // Set the password
      const updated = await TeamMemberModel.setPassword(teamMember.id, password);
      if (!updated) {
        return {
          success: false,
          error: 'Failed to set password'
        };
      }

      // Generate JWT tokens using authService for team member
      const tokens = authService.generateTeamMemberTokens(updated);

      // Create session for the team member
      await authService.createTeamMemberSession(
        updated.id,
        updated.tenant_user_id,
        tokens.token,
        tokens.refreshToken
      );

      return {
        success: true,
        team_member: updated,
        token: tokens.token,
        refreshToken: tokens.refreshToken
      };
    } catch (error) {
      logger.error('Error setting password with token:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Authenticate a team member
   */
  async authenticate(email: string, password: string): Promise<{
    success: boolean;
    team_member?: TeamMemberInterface;
    tenant_info?: any;
    token?: string;
    refreshToken?: string;
    error?: string;
  }> {
    try {
      // Find team member by email
      const teamMember = await TeamMemberModel.findByEmail(email);
      if (!teamMember) {
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      // Check if password is set
      if (!teamMember.password_hash) {
        return {
          success: false,
          error: 'Password not set. Please use your invite link to set a password.'
        };
      }

      // Check if active
      if (!teamMember.is_active) {
        return {
          success: false,
          error: 'Account is deactivated. Please contact your administrator.'
        };
      }

      // Verify password
      const isValid = await TeamMemberModel.verifyPassword(teamMember, password);
      if (!isValid) {
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      // Update last login
      await TeamMemberModel.updateLastLogin(teamMember.id);

      // Get tenant info
      const memberWithTenant = await TeamMemberModel.getWithTenantInfo(teamMember.id);

      // Generate JWT tokens using authService
      const tokens = authService.generateTeamMemberTokens(teamMember);

      // Create session for team member
      await authService.createTeamMemberSession(
        teamMember.id,
        teamMember.tenant_user_id,
        tokens.token,
        tokens.refreshToken
      );

      return {
        success: true,
        team_member: teamMember,
        tenant_info: memberWithTenant?.tenant_user_id ? {
          user_id: memberWithTenant.tenant_user_id,
          company_name: (memberWithTenant as any).company_name,
          owner_email: (memberWithTenant as any).owner_email
        } : undefined,
        token: tokens.token,
        refreshToken: tokens.refreshToken
      };
    } catch (error) {
      logger.error('Error authenticating team member:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get all team members for a tenant
   */
  async getTeamMembers(tenantUserId: string): Promise<TeamMemberInterface[]> {
    return await TeamMemberModel.findByTenantUserId(tenantUserId);
  }

  /**
   * Get team member by ID
   */
  async getTeamMemberById(id: string, tenantUserId: string): Promise<TeamMemberInterface | null> {
    const member = await TeamMemberModel.getWithTenantInfo(id);
    if (member && member.tenant_user_id === tenantUserId) {
      return member;
    }
    return null;
  }

  /**
   * Update a team member
   */
  async updateTeamMember(
    id: string,
    tenantUserId: string,
    updates: Partial<Pick<TeamMemberInterface, 'name' | 'role' | 'is_active'>>
  ): Promise<TeamMemberInterface | null> {
    // First verify the team member belongs to this tenant
    const member = await this.getTeamMemberById(id, tenantUserId);
    if (!member) {
      return null;
    }

    return await TeamMemberModel.updateTeamMember(id, updates);
  }

  /**
   * Deactivate a team member
   */
  async deactivateTeamMember(id: string, tenantUserId: string): Promise<TeamMemberInterface | null> {
    const member = await this.getTeamMemberById(id, tenantUserId);
    if (!member) {
      return null;
    }

    return await TeamMemberModel.deactivate(id);
  }

  /**
   * Get team member stats for a tenant
   */
  async getTeamStats(tenantUserId: string): Promise<TeamMemberStats> {
    const members = await this.getTeamMembers(tenantUserId);

    const stats: TeamMemberStats = {
      total: members.length,
      by_role: {
        manager: 0,
        agent: 0,
        viewer: 0
      },
      active: 0,
      pending_invite: 0
    };

    members.forEach(member => {
      stats.by_role[member.role]++;
      if (member.is_active && member.password_hash) {
        stats.active++;
      }
      if (!member.password_hash && member.invite_token) {
        stats.pending_invite++;
      }
    });

    return stats;
  }

  /**
   * Get role descriptions for UI
   */
  getRoleDescriptions(): typeof TEAM_MEMBER_ROLE_DESCRIPTIONS {
    return TEAM_MEMBER_ROLE_DESCRIPTIONS;
  }

  /**
   * Check if a user can perform an action based on their role
   */
  canPerformAction(role: TeamMemberRole, action: 'view_all_leads' | 'edit_leads' | 'manage_campaigns' | 'manage_team'): boolean {
    const permissions: Record<TeamMemberRole, string[]> = {
      manager: ['view_all_leads', 'edit_leads', 'manage_campaigns', 'manage_team'],
      agent: ['edit_leads'],
      viewer: []
    };

    return permissions[role]?.includes(action) || false;
  }
}

export default new TeamMemberService();
