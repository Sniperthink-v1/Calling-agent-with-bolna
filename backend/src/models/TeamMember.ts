import BaseModel, { BaseModelInterface } from './BaseModel';
import bcrypt from 'bcrypt';

export type TeamMemberRole = 'manager' | 'agent' | 'viewer';

export interface TeamMemberInterface extends BaseModelInterface {
  id: string;
  tenant_user_id: string;
  name: string;
  email: string;
  password_hash?: string;
  role: TeamMemberRole;
  is_active: boolean;
  invite_token?: string | null;
  invite_token_expires?: Date | null;
  password_set_at?: Date | null;
  last_login?: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Role descriptions for UI display
 */
export const TEAM_MEMBER_ROLE_DESCRIPTIONS: Record<TeamMemberRole, { label: string; description: string }> = {
  manager: {
    label: 'Manager',
    description: 'Full access to all leads and campaigns. Can invite and manage team members. Cannot modify billing or account settings.'
  },
  agent: {
    label: 'Agent',
    description: 'Can only view and edit leads assigned to them. When they edit a lead, it automatically gets assigned to them. Limited campaign access.'
  },
  viewer: {
    label: 'Viewer',
    description: 'Read-only access to all leads and analytics. Cannot edit any data or manage team members.'
  }
};

export class TeamMemberModel extends BaseModel<TeamMemberInterface> {
  private readonly SALT_ROUNDS = 10;

  constructor() {
    super('team_members');
  }

  /**
   * Find team members by tenant (owner) user ID
   */
  async findByTenantUserId(tenantUserId: string, activeOnly: boolean = true): Promise<TeamMemberInterface[]> {
    const criteria: Partial<TeamMemberInterface> = { tenant_user_id: tenantUserId };
    if (activeOnly) {
      criteria.is_active = true;
    }
    return await this.findBy(criteria);
  }

  /**
   * Find a team member by email (global lookup for login)
   */
  async findByEmail(email: string): Promise<TeamMemberInterface | null> {
    return await this.findOne({ email: email.toLowerCase() });
  }

  /**
   * Find a team member by invite token
   */
  async findByInviteToken(token: string): Promise<TeamMemberInterface | null> {
    const result = await this.query(
      `SELECT * FROM team_members 
       WHERE invite_token = $1 
       AND invite_token_expires > NOW()
       AND password_hash IS NULL`,
      [token]
    );
    return result.rows[0] || null;
  }

  /**
   * Create a new team member with invite token
   */
  async createTeamMember(data: {
    tenant_user_id: string;
    name: string;
    email: string;
    role: TeamMemberRole;
  }): Promise<{ teamMember: TeamMemberInterface; inviteToken: string }> {
    // Generate secure invite token
    const inviteToken = this.generateInviteToken();
    const inviteTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const teamMember = await this.create({
      tenant_user_id: data.tenant_user_id,
      name: data.name,
      email: data.email.toLowerCase(),
      role: data.role,
      is_active: true,
      invite_token: inviteToken,
      invite_token_expires: inviteTokenExpires
    });

    return { teamMember, inviteToken };
  }

  /**
   * Set password for team member (after accepting invite)
   */
  async setPassword(teamMemberId: string, password: string): Promise<TeamMemberInterface | null> {
    const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);
    
    return await this.update(teamMemberId, {
      password_hash: passwordHash,
      invite_token: null,
      invite_token_expires: null,
      password_set_at: new Date()
    });
  }

  /**
   * Verify password for login
   */
  async verifyPassword(teamMember: TeamMemberInterface, password: string): Promise<boolean> {
    if (!teamMember.password_hash) {
      return false;
    }
    return await bcrypt.compare(password, teamMember.password_hash);
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(teamMemberId: string): Promise<TeamMemberInterface | null> {
    return await this.update(teamMemberId, {
      last_login: new Date()
    });
  }

  /**
   * Update team member details
   */
  async updateTeamMember(
    teamMemberId: string, 
    data: Partial<Pick<TeamMemberInterface, 'name' | 'role' | 'is_active'>>
  ): Promise<TeamMemberInterface | null> {
    return await this.update(teamMemberId, data);
  }

  /**
   * Deactivate a team member
   */
  async deactivate(teamMemberId: string): Promise<TeamMemberInterface | null> {
    return await this.update(teamMemberId, { is_active: false });
  }

  /**
   * Resend invite (regenerate token)
   */
  async resendInvite(teamMemberId: string): Promise<{ teamMember: TeamMemberInterface; inviteToken: string } | null> {
    const existing = await this.findById(teamMemberId);
    if (!existing || existing.password_hash) {
      // Can't resend if already has password set
      return null;
    }

    const inviteToken = this.generateInviteToken();
    const inviteTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const updated = await this.update(teamMemberId, {
      invite_token: inviteToken,
      invite_token_expires: inviteTokenExpires
    });

    if (!updated) return null;
    return { teamMember: updated, inviteToken };
  }

  /**
   * Get team member with tenant info (for auth)
   */
  async getWithTenantInfo(teamMemberId: string): Promise<(TeamMemberInterface & { tenant_email: string; tenant_name: string }) | null> {
    const result = await this.query(
      `SELECT tm.*, u.email as tenant_email, u.name as tenant_name
       FROM team_members tm
       JOIN users u ON tm.tenant_user_id = u.id
       WHERE tm.id = $1`,
      [teamMemberId]
    );
    return result.rows[0] || null;
  }

  /**
   * Check if email is already used (by any user or team member)
   */
  async isEmailTaken(email: string, excludeTeamMemberId?: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase();
    
    // Check users table
    const userResult = await this.query(
      'SELECT 1 FROM users WHERE LOWER(email) = $1 LIMIT 1',
      [normalizedEmail]
    );
    if (userResult.rows.length > 0) return true;

    // Check team_members table
    let teamQuery = 'SELECT 1 FROM team_members WHERE LOWER(email) = $1';
    const params: any[] = [normalizedEmail];
    
    if (excludeTeamMemberId) {
      teamQuery += ' AND id != $2';
      params.push(excludeTeamMemberId);
    }
    teamQuery += ' LIMIT 1';

    const teamResult = await this.query(teamQuery, params);
    return teamResult.rows.length > 0;
  }

  /**
   * Generate a secure invite token
   */
  private generateInviteToken(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Get team member count for a tenant
   */
  async getCountByTenant(tenantUserId: string, activeOnly: boolean = true): Promise<number> {
    let query = 'SELECT COUNT(*) as count FROM team_members WHERE tenant_user_id = $1';
    if (activeOnly) {
      query += ' AND is_active = true';
    }
    const result = await this.query(query, [tenantUserId]);
    return parseInt(result.rows[0].count, 10);
  }
}

export default new TeamMemberModel();
