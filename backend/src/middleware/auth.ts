import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { AuthUser, AuthenticatedRequest, TeamMemberRole } from '../types/auth';
import { TimezoneCacheService } from '../services/timezoneCacheService';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      userId?: string;
      isTeamMember?: boolean;
      teamMemberId?: string;
      teamMemberRole?: TeamMemberRole;
    }
  }
}

// Re-export for convenience
export { AuthenticatedRequest };

/**
 * Authentication middleware that validates JWT tokens
 * Supports both owner/user tokens and team member tokens
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = authService.extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      res.status(401).json({
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authorization token is required',
          timestamp: new Date(),
        },
      });
      return;
    }

    // First try to validate as team member session
    const teamMemberSession = await authService.validateTeamMemberSession(token);
    
    if (teamMemberSession) {
      // This is a team member - get their info and set up request
      const teamMemberUser: AuthUser = {
        id: teamMemberSession.userId, // Tenant's user ID for data access
        email: teamMemberSession.email,
        name: teamMemberSession.name || '', // Use team member's name
        credits: 0,
        isTeamMember: true,
        teamMemberId: teamMemberSession.teamMemberId,
        teamMemberRole: teamMemberSession.role,
      };
      
      req.user = teamMemberUser;
      req.userId = teamMemberSession.userId;
      req.isTeamMember = true;
      req.teamMemberId = teamMemberSession.teamMemberId;
      req.teamMemberRole = teamMemberSession.role;
      
      next();
      return;
    }

    // Try to validate as regular user session
    const user = await authService.validateSession(token);
    
    if (!user) {
      res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
          timestamp: new Date(),
        },
      });
      return;
    }

    // Attach user information to request
    req.user = user;
    req.userId = user.id;
    req.isTeamMember = false;
    
    // Cache user timezone for subsequent requests
    if (user.timezone) {
      TimezoneCacheService.cacheUserTimezone(
        user.id,
        user.timezone,
        user.timezone_auto_detected || false,
        user.timezone_manually_set || false
      );
    }
    
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(401).json({
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
        timestamp: new Date(),
      },
    });
    return;
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token provided
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = authService.extractTokenFromHeader(req.headers.authorization);
    
    if (token) {
      const user = await authService.validateSession(token);
      if (user) {
        req.user = user;
        req.userId = user.id;
        
        // Cache user timezone for subsequent requests
        if (user.timezone) {
          TimezoneCacheService.cacheUserTimezone(
            user.id,
            user.timezone,
            user.timezone_auto_detected || false,
            user.timezone_manually_set || false
          );
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    // Continue without authentication
    next();
  }
};

/**
 * Middleware to ensure user is authenticated (stricter check)
 */
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || !req.userId) {
    res.status(401).json({
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'User must be authenticated to access this resource',
        timestamp: new Date(),
      },
    });
    return;
  }
  
  next();
};

/**
 * Middleware to ensure user has admin privileges
 */
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || !req.userId) {
    res.status(401).json({
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'User must be authenticated to access this resource',
        timestamp: new Date(),
      },
    });
    return;
  }
  
  // Check if user has admin role
  if ((req.user as any).role !== 'admin' && (req.user as any).role !== 'super_admin') {
    res.status(403).json({
      error: {
        code: 'INSUFFICIENT_PRIVILEGES',
        message: 'Admin privileges required to access this resource',
        timestamp: new Date(),
      },
    });
    return;
  }
  
  next();
};

/**
 * Middleware to ensure user has super admin privileges
 */
export const requireSuperAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || !req.userId) {
    res.status(401).json({
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'User must be authenticated to access this resource',
        timestamp: new Date(),
      },
    });
    return;
  }
  
  // Check if user has super admin role
  if ((req.user as any).role !== 'super_admin') {
    res.status(403).json({
      error: {
        code: 'INSUFFICIENT_PRIVILEGES',
        message: 'Super admin privileges required to access this resource',
        timestamp: new Date(),
      },
    });
    return;
  }
  
  next();
};

/**
 * Middleware to ensure user is the owner (not a team member)
 * Used for owner-only operations like team management
 */
export const requireOwner = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || !req.userId) {
    res.status(401).json({
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'User must be authenticated to access this resource',
        timestamp: new Date(),
      },
    });
    return;
  }
  
  if (req.isTeamMember) {
    res.status(403).json({
      error: {
        code: 'OWNER_REQUIRED',
        message: 'Only the account owner can access this resource',
        timestamp: new Date(),
      },
    });
    return;
  }
  
  next();
};

/**
 * Middleware to ensure team member has at least manager role
 * Managers have full access to leads and campaigns
 */
export const requireManagerOrOwner = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || !req.userId) {
    res.status(401).json({
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'User must be authenticated to access this resource',
        timestamp: new Date(),
      },
    });
    return;
  }
  
  // Owners always have access
  if (!req.isTeamMember) {
    next();
    return;
  }
  
  // For team members, check if they have manager role
  if (req.teamMemberRole !== 'manager') {
    res.status(403).json({
      error: {
        code: 'INSUFFICIENT_PRIVILEGES',
        message: 'Manager privileges required to access this resource',
        timestamp: new Date(),
      },
    });
    return;
  }
  
  next();
};

/**
 * Middleware to ensure team member can edit leads
 * Both managers and agents can edit leads (agents only their assigned ones)
 */
export const requireLeadEditAccess = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || !req.userId) {
    res.status(401).json({
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'User must be authenticated to access this resource',
        timestamp: new Date(),
      },
    });
    return;
  }
  
  // Owners always have access
  if (!req.isTeamMember) {
    next();
    return;
  }
  
  // Viewers cannot edit
  if (req.teamMemberRole === 'viewer') {
    res.status(403).json({
      error: {
        code: 'INSUFFICIENT_PRIVILEGES',
        message: 'Viewers cannot edit leads',
        timestamp: new Date(),
      },
    });
    return;
  }
  
  // Managers and agents can edit (agents will have additional filtering in the service)
  next();
};

/**
 * Middleware to ensure user is not a viewer
 * Used for operations that viewers should not be able to do
 */
export const requireNotViewer = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || !req.userId) {
    res.status(401).json({
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'User must be authenticated to access this resource',
        timestamp: new Date(),
      },
    });
    return;
  }
  
  // Owners and non-viewers can access
  if (!req.isTeamMember || req.teamMemberRole !== 'viewer') {
    next();
    return;
  }
  
  res.status(403).json({
    error: {
      code: 'INSUFFICIENT_PRIVILEGES',
      message: 'Viewers cannot perform this action',
      timestamp: new Date(),
    },
  });
};