import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'user';
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date;
  sessionToken?: string;
  refreshToken?: string;
}

interface AuthSession {
  id: string;
  userId: string;
  token: string;
  refreshToken: string;
  expiresAt: Date;
  isActive: boolean;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

interface LoginCredentials {
  username: string;
  password: string;
}

interface AuthResult {
  success: boolean;
  user?: Omit<User, 'passwordHash'>;
  token?: string;
  refreshToken?: string;
  message?: string;
}

export class AuthManager {
  private db: Database.Database;
  private jwtSecret: string;
  private refreshSecret: string;
  private tokenExpiryTime: number = 24 * 60 * 60 * 1000; // 24 hours
  private refreshExpiryTime: number = 30 * 24 * 60 * 60 * 1000; // 30 days

  constructor(dbPath: string = './data/agent-system.db') {
    this.db = new Database(dbPath);

    // Generate secure JWT secrets (in production, use environment variables)
    this.jwtSecret = process.env.JWT_SECRET || this.generateSecureSecret();
    this.refreshSecret = process.env.REFRESH_SECRET || this.generateSecureSecret();

    this.initializeAuthTables();
    this.createDefaultAdminUser();

    console.log('[AuthManager] Authentication system initialized');
  }

  private generateSecureSecret(): string {
    return randomBytes(64).toString('hex');
  }

  private initializeAuthTables(): void {
    // Users table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME,
        session_token TEXT,
        refresh_token TEXT
      )
    `);

    // Auth sessions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS auth_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create indexes
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_token ON auth_sessions(token)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_user ON auth_sessions(user_id)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_active ON auth_sessions(is_active)');
  }

  private async createDefaultAdminUser(): Promise<void> {
    try {
      // Check if admin user already exists
      const existingAdmin = this.getUserByUsername('admin');
      if (existingAdmin) {
        console.log('[AuthManager] Admin user already exists');
        return;
      }

      // Create default admin user for your private access
      const defaultPassword = process.env.ADMIN_PASSWORD || 'secure-admin-2024';
      const passwordHash = await bcrypt.hash(defaultPassword, 12);

      const adminUser: User = {
        id: `user-${Date.now()}`,
        username: 'admin',
        email: 'admin@localhost',
        passwordHash,
        role: 'admin',
        isActive: true,
        createdAt: new Date()
      };

      const stmt = this.db.prepare(`
        INSERT INTO users (id, username, email, password_hash, role, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        adminUser.id,
        adminUser.username,
        adminUser.email,
        adminUser.passwordHash,
        adminUser.role,
        adminUser.isActive ? 1 : 0,
        adminUser.createdAt.toISOString()
      );

      console.log('[AuthManager] Default admin user created');
      console.log(`[AuthManager] Username: admin`);
      console.log(`[AuthManager] Password: ${defaultPassword}`);
      console.log('[AuthManager] ⚠️  Change the default password in production!');

    } catch (error) {
      console.error('[AuthManager] Error creating default admin user:', error);
    }
  }

  // Authentication methods
  public async login(credentials: LoginCredentials, ipAddress?: string, userAgent?: string): Promise<AuthResult> {
    try {
      const { username, password } = credentials;

      // Get user by username
      const user = this.getUserByUsername(username);
      if (!user) {
        return {
          success: false,
          message: 'Invalid username or password'
        };
      }

      // Check if user is active
      if (!user.isActive) {
        return {
          success: false,
          message: 'Account is deactivated'
        };
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return {
          success: false,
          message: 'Invalid username or password'
        };
      }

      // Generate tokens
      const { token, refreshToken } = this.generateTokens(user);

      // Create auth session
      const session: AuthSession = {
        id: `session-${Date.now()}`,
        userId: user.id,
        token,
        refreshToken,
        expiresAt: new Date(Date.now() + this.tokenExpiryTime),
        isActive: true,
        ipAddress,
        userAgent,
        createdAt: new Date()
      };

      this.saveAuthSession(session);

      // Update user last login
      this.updateUserLastLogin(user.id);

      // Return safe user data (without password hash)
      const { passwordHash, ...safeUser } = user;

      return {
        success: true,
        user: safeUser,
        token,
        refreshToken,
        message: 'Login successful'
      };

    } catch (error) {
      console.error('[AuthManager] Login error:', error);
      return {
        success: false,
        message: 'Login failed due to server error'
      };
    }
  }

  public async logout(token: string): Promise<boolean> {
    try {
      // Deactivate session
      const stmt = this.db.prepare(`
        UPDATE auth_sessions
        SET is_active = FALSE
        WHERE token = ? AND is_active = TRUE
      `);

      const result = stmt.run(token);
      return result.changes > 0;

    } catch (error) {
      console.error('[AuthManager] Logout error:', error);
      return false;
    }
  }

  public async validateToken(token: string): Promise<User | null> {
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, this.jwtSecret) as any;

      // Check if session is still active
      const session = this.getActiveSession(token);
      if (!session || !session.isActive || session.expiresAt < new Date()) {
        return null;
      }

      // Get user
      const user = this.getUserById(decoded.userId);
      if (!user || !user.isActive) {
        return null;
      }

      return user;

    } catch (error) {
      console.error('[AuthManager] Token validation error:', error);
      return null;
    }
  }

  public async refreshToken(refreshToken: string): Promise<AuthResult> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.refreshSecret) as any;

      // Get session
      const session = this.getSessionByRefreshToken(refreshToken);
      if (!session || !session.isActive) {
        return {
          success: false,
          message: 'Invalid refresh token'
        };
      }

      // Get user
      const user = this.getUserById(decoded.userId);
      if (!user || !user.isActive) {
        return {
          success: false,
          message: 'User not found or inactive'
        };
      }

      // Generate new tokens
      const tokens = this.generateTokens(user);

      // Update session with new tokens
      this.updateSessionTokens(session.id, tokens.token, tokens.refreshToken);

      const { passwordHash, ...safeUser } = user;

      return {
        success: true,
        user: safeUser,
        token: tokens.token,
        refreshToken: tokens.refreshToken,
        message: 'Token refreshed successfully'
      };

    } catch (error) {
      console.error('[AuthManager] Token refresh error:', error);
      return {
        success: false,
        message: 'Token refresh failed'
      };
    }
  }

  // User management
  public async createUser(userData: {
    username: string;
    email: string;
    password: string;
    role?: 'admin' | 'user';
  }): Promise<AuthResult> {
    try {
      const { username, email, password, role = 'user' } = userData;

      // Check if user already exists
      if (this.getUserByUsername(username) || this.getUserByEmail(email)) {
        return {
          success: false,
          message: 'User already exists'
        };
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      const user: User = {
        id: `user-${Date.now()}`,
        username,
        email,
        passwordHash,
        role,
        isActive: true,
        createdAt: new Date()
      };

      const stmt = this.db.prepare(`
        INSERT INTO users (id, username, email, password_hash, role, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        user.id,
        user.username,
        user.email,
        user.passwordHash,
        user.role,
        user.isActive ? 1 : 0,
        user.createdAt.toISOString()
      );

      const { passwordHash: _, ...safeUser } = user;

      return {
        success: true,
        user: safeUser,
        message: 'User created successfully'
      };

    } catch (error) {
      console.error('[AuthManager] User creation error:', error);
      return {
        success: false,
        message: 'User creation failed'
      };
    }
  }

  public async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      const user = this.getUserById(userId);
      if (!user) return false;

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValidPassword) return false;

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 12);

      // Update password
      const stmt = this.db.prepare('UPDATE users SET password_hash = ? WHERE id = ?');
      const result = stmt.run(newPasswordHash, userId);

      return result.changes > 0;

    } catch (error) {
      console.error('[AuthManager] Password change error:', error);
      return false;
    }
  }

  // Helper methods
  private generateTokens(user: User): { token: string; refreshToken: string } {
    const tokenPayload = {
      userId: user.id,
      username: user.username,
      role: user.role
    };

    const token = jwt.sign(tokenPayload, this.jwtSecret, {
      expiresIn: '24h',
      issuer: 'ai-agent-team',
      subject: user.id
    });

    const refreshToken = jwt.sign({ userId: user.id }, this.refreshSecret, {
      expiresIn: '30d',
      issuer: 'ai-agent-team',
      subject: user.id
    });

    return { token, refreshToken };
  }

  private getUserByUsername(username: string): User | null {
    const stmt = this.db.prepare('SELECT * FROM users WHERE username = ?');
    const row = stmt.get(username) as any;

    if (!row) return null;

    return {
      id: row.id,
      username: row.username,
      email: row.email,
      passwordHash: row.password_hash,
      role: row.role,
      isActive: row.is_active === 1,
      createdAt: new Date(row.created_at),
      lastLogin: row.last_login ? new Date(row.last_login) : undefined
    };
  }

  private getUserByEmail(email: string): User | null {
    const stmt = this.db.prepare('SELECT * FROM users WHERE email = ?');
    const row = stmt.get(email) as any;

    if (!row) return null;

    return {
      id: row.id,
      username: row.username,
      email: row.email,
      passwordHash: row.password_hash,
      role: row.role,
      isActive: row.is_active === 1,
      createdAt: new Date(row.created_at),
      lastLogin: row.last_login ? new Date(row.last_login) : undefined
    };
  }

  private getUserById(userId: string): User | null {
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
    const row = stmt.get(userId) as any;

    if (!row) return null;

    return {
      id: row.id,
      username: row.username,
      email: row.email,
      passwordHash: row.password_hash,
      role: row.role,
      isActive: row.is_active === 1,
      createdAt: new Date(row.created_at),
      lastLogin: row.last_login ? new Date(row.last_login) : undefined
    };
  }

  private saveAuthSession(session: AuthSession): void {
    const stmt = this.db.prepare(`
      INSERT INTO auth_sessions (
        id, user_id, token, refresh_token, expires_at, is_active, ip_address, user_agent, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      session.id,
      session.userId,
      session.token,
      session.refreshToken,
      session.expiresAt.toISOString(),
      session.isActive ? 1 : 0,
      session.ipAddress || null,
      session.userAgent || null,
      session.createdAt.toISOString()
    );
  }

  private getActiveSession(token: string): AuthSession | null {
    const stmt = this.db.prepare(`
      SELECT * FROM auth_sessions
      WHERE token = ? AND is_active = TRUE
    `);

    const row = stmt.get(token) as any;
    if (!row) return null;

    return {
      id: row.id,
      userId: row.user_id,
      token: row.token,
      refreshToken: row.refresh_token,
      expiresAt: new Date(row.expires_at),
      isActive: row.is_active === 1,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: new Date(row.created_at)
    };
  }

  private getSessionByRefreshToken(refreshToken: string): AuthSession | null {
    const stmt = this.db.prepare(`
      SELECT * FROM auth_sessions
      WHERE refresh_token = ? AND is_active = TRUE
    `);

    const row = stmt.get(refreshToken) as any;
    if (!row) return null;

    return {
      id: row.id,
      userId: row.user_id,
      token: row.token,
      refreshToken: row.refresh_token,
      expiresAt: new Date(row.expires_at),
      isActive: row.is_active === 1,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: new Date(row.created_at)
    };
  }

  private updateSessionTokens(sessionId: string, newToken: string, newRefreshToken: string): void {
    const stmt = this.db.prepare(`
      UPDATE auth_sessions
      SET token = ?, refresh_token = ?, expires_at = ?
      WHERE id = ?
    `);

    stmt.run(
      newToken,
      newRefreshToken,
      new Date(Date.now() + this.tokenExpiryTime).toISOString(),
      sessionId
    );
  }

  private updateUserLastLogin(userId: string): void {
    const stmt = this.db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(userId);
  }

  // Session management
  public getUserSessions(userId: string): AuthSession[] {
    const stmt = this.db.prepare(`
      SELECT * FROM auth_sessions
      WHERE user_id = ? AND is_active = TRUE
      ORDER BY created_at DESC
    `);

    const rows = stmt.all(userId) as any[];

    return rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      token: row.token,
      refreshToken: row.refresh_token,
      expiresAt: new Date(row.expires_at),
      isActive: row.is_active === 1,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: new Date(row.created_at)
    }));
  }

  public async terminateAllSessions(userId: string): Promise<boolean> {
    try {
      const stmt = this.db.prepare(`
        UPDATE auth_sessions
        SET is_active = FALSE
        WHERE user_id = ? AND is_active = TRUE
      `);

      const result = stmt.run(userId);
      return result.changes > 0;

    } catch (error) {
      console.error('[AuthManager] Error terminating sessions:', error);
      return false;
    }
  }

  // Cleanup expired sessions
  public cleanupExpiredSessions(): void {
    try {
      const stmt = this.db.prepare(`
        UPDATE auth_sessions
        SET is_active = FALSE
        WHERE expires_at < CURRENT_TIMESTAMP AND is_active = TRUE
      `);

      const result = stmt.run();
      if (result.changes > 0) {
        console.log(`[AuthManager] Cleaned up ${result.changes} expired sessions`);
      }

    } catch (error) {
      console.error('[AuthManager] Error cleaning up sessions:', error);
    }
  }

  // Security utilities
  public getSecurityStats(): any {
    return {
      totalUsers: this.db.prepare('SELECT COUNT(*) as count FROM users').get() as any,
      activeUsers: this.db.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = TRUE').get() as any,
      activeSessions: this.db.prepare('SELECT COUNT(*) as count FROM auth_sessions WHERE is_active = TRUE').get() as any,
      recentLogins: this.db.prepare(`
        SELECT COUNT(*) as count FROM users
        WHERE last_login > datetime('now', '-24 hours')
      `).get() as any
    };
  }

  public close(): void {
    this.db.close();
    console.log('[AuthManager] Authentication system closed');
  }
}

// Singleton instance
export const authManager = new AuthManager();
