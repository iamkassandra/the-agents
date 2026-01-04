import Database from 'better-sqlite3';
import { Agent, Task, BusinessProject, MemoryEntry, CommunicationMessage, AgentMetrics } from '@/types/agents';

interface DatabaseSchema {
  agents: Agent;
  tasks: Task;
  projects: BusinessProject;
  memory_entries: MemoryEntry;
  messages: CommunicationMessage;
  agent_metrics: AgentMetrics & { agentId: string; timestamp: Date };
  system_logs: {
    id: string;
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
    data?: any;
    timestamp: Date;
    source: string;
  };
  user_sessions: {
    id: string;
    userId: string;
    agentId?: string;
    sessionStart: Date;
    sessionEnd?: Date;
    actionsCount: number;
    lastActivity: Date;
  };
}

export class DatabaseManager {
  private db: Database.Database;
  private isInitialized: boolean = false;

  constructor(dbPath: string = './data/agent-system.db') {
    // Ensure data directory exists
    const fs = require('fs');
    const path = require('path');

    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.initializeDatabase();
    console.log(`[DatabaseManager] Initialized with database: ${dbPath}`);
  }

  private initializeDatabase(): void {
    try {
      // Enable WAL mode for better concurrent access
      this.db.exec('PRAGMA journal_mode = WAL');
      this.db.exec('PRAGMA synchronous = NORMAL');
      this.db.exec('PRAGMA cache_size = 1000');

      // Create tables
      this.createAgentsTable();
      this.createTasksTable();
      this.createProjectsTable();
      this.createMemoryEntriesTable();
      this.createMessagesTable();
      this.createAgentMetricsTable();
      this.createSystemLogsTable();
      this.createUserSessionsTable();

      // Create indexes for performance
      this.createIndexes();

      this.isInitialized = true;
      console.log('[DatabaseManager] Database schema initialized successfully');

    } catch (error) {
      console.error('[DatabaseManager] Error initializing database:', error);
      throw error;
    }
  }

  private createAgentsTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        description TEXT,
        capabilities TEXT, -- JSON
        status TEXT, -- JSON
        configuration TEXT, -- JSON
        metrics TEXT, -- JSON
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  private createTasksTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL CHECK (status IN ('pending', 'in-progress', 'completed', 'failed', 'blocked')),
        priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
        assigned_agent TEXT,
        dependencies TEXT, -- JSON array
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        estimated_duration INTEGER,
        actual_duration INTEGER,
        result TEXT, -- JSON
        errors TEXT, -- JSON array
        project_id TEXT,
        FOREIGN KEY (assigned_agent) REFERENCES agents(id),
        FOREIGN KEY (project_id) REFERENCES projects(id)
      )
    `);
  }

  private createProjectsTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        business_model TEXT, -- JSON
        status TEXT NOT NULL CHECK (status IN ('planning', 'development', 'testing', 'deployment', 'live', 'maintenance')),
        created_at DATETIME NOT NULL,
        target_launch_date DATETIME,
        budget REAL,
        team TEXT, -- JSON array
        milestones TEXT, -- JSON
        risks TEXT, -- JSON
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  private createMemoryEntriesTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memory_entries (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('task', 'decision', 'insight', 'error', 'feedback')),
        content TEXT, -- JSON
        tags TEXT, -- JSON array
        relevance_score REAL NOT NULL,
        created_at DATETIME NOT NULL,
        agent_id TEXT NOT NULL,
        project_id TEXT,
        embedding_vector TEXT, -- JSON for vector search
        FOREIGN KEY (agent_id) REFERENCES agents(id),
        FOREIGN KEY (project_id) REFERENCES projects(id)
      )
    `);
  }

  private createMessagesTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        from_agent TEXT NOT NULL,
        to_agent TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('task_assignment', 'status_update', 'question', 'collaboration', 'error_report')),
        content TEXT, -- JSON
        timestamp DATETIME NOT NULL,
        priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        requires_response BOOLEAN NOT NULL,
        response_id TEXT,
        project_id TEXT,
        FOREIGN KEY (from_agent) REFERENCES agents(id),
        FOREIGN KEY (response_id) REFERENCES messages(id),
        FOREIGN KEY (project_id) REFERENCES projects(id)
      )
    `);
  }

  private createAgentMetricsTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agent_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id TEXT NOT NULL,
        tasks_completed INTEGER NOT NULL,
        tasks_in_progress INTEGER NOT NULL,
        average_completion_time REAL NOT NULL,
        success_rate REAL NOT NULL,
        last_active_time DATETIME NOT NULL,
        total_uptime REAL NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agent_id) REFERENCES agents(id)
      )
    `);
  }

  private createSystemLogsTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS system_logs (
        id TEXT PRIMARY KEY,
        level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error', 'debug')),
        message TEXT NOT NULL,
        data TEXT, -- JSON
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        source TEXT NOT NULL
      )
    `);
  }

  private createUserSessionsTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        agent_id TEXT,
        session_start DATETIME NOT NULL,
        session_end DATETIME,
        actions_count INTEGER DEFAULT 0,
        last_activity DATETIME NOT NULL,
        FOREIGN KEY (agent_id) REFERENCES agents(id)
      )
    `);
  }

  private createIndexes(): void {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_agents_role ON agents(role)',
      'CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_agent ON tasks(assigned_agent)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)',
      'CREATE INDEX IF NOT EXISTS idx_memory_agent ON memory_entries(agent_id)',
      'CREATE INDEX IF NOT EXISTS idx_memory_project ON memory_entries(project_id)',
      'CREATE INDEX IF NOT EXISTS idx_memory_type ON memory_entries(type)',
      'CREATE INDEX IF NOT EXISTS idx_memory_created ON memory_entries(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_messages_from ON messages(from_agent)',
      'CREATE INDEX IF NOT EXISTS idx_messages_to ON messages(to_agent)',
      'CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_agent_metrics_agent ON agent_metrics(agent_id)',
      'CREATE INDEX IF NOT EXISTS idx_agent_metrics_timestamp ON agent_metrics(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level)',
      'CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_sessions_agent ON user_sessions(agent_id)'
    ];

    indexes.forEach(sql => {
      try {
        this.db.exec(sql);
      } catch (error) {
        console.warn(`[DatabaseManager] Index creation warning:`, error);
      }
    });
  }

  // Agent Management
  public async saveAgent(agent: Agent): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO agents (
        id, name, role, description, capabilities, status, configuration, metrics, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    stmt.run(
      agent.id,
      agent.name,
      agent.role,
      agent.description,
      JSON.stringify(agent.capabilities),
      JSON.stringify(agent.status),
      JSON.stringify(agent.configuration),
      JSON.stringify(agent.metrics)
    );

    console.log(`[DatabaseManager] Saved agent: ${agent.id}`);
  }

  public getAgent(agentId: string): Agent | null {
    const stmt = this.db.prepare('SELECT * FROM agents WHERE id = ?');
    const row = stmt.get(agentId) as any;

    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      role: row.role,
      description: row.description,
      capabilities: JSON.parse(row.capabilities),
      status: JSON.parse(row.status),
      configuration: JSON.parse(row.configuration),
      metrics: JSON.parse(row.metrics)
    };
  }

  public getAllAgents(): Agent[] {
    const stmt = this.db.prepare('SELECT * FROM agents ORDER BY created_at DESC');
    const rows = stmt.all() as any[];

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      role: row.role,
      description: row.description,
      capabilities: JSON.parse(row.capabilities),
      status: JSON.parse(row.status),
      configuration: JSON.parse(row.configuration),
      metrics: JSON.parse(row.metrics)
    }));
  }

  // Task Management
  public async saveTask(task: Task): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO tasks (
        id, title, description, status, priority, assigned_agent, dependencies,
        created_at, updated_at, estimated_duration, actual_duration, result, errors, project_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      task.id,
      task.title,
      task.description,
      task.status,
      task.priority,
      task.assignedAgent,
      JSON.stringify(task.dependencies),
      task.createdAt.toISOString(),
      task.updatedAt.toISOString(),
      task.estimatedDuration,
      task.actualDuration,
      task.result ? JSON.stringify(task.result) : null,
      task.errors ? JSON.stringify(task.errors) : null,
      (task as any).projectId || null
    );

    console.log(`[DatabaseManager] Saved task: ${task.id}`);
  }

  public getTask(taskId: string): Task | null {
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
    const row = stmt.get(taskId) as any;

    if (!row) return null;

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      assignedAgent: row.assigned_agent,
      dependencies: JSON.parse(row.dependencies),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      estimatedDuration: row.estimated_duration,
      actualDuration: row.actual_duration,
      result: row.result ? JSON.parse(row.result) : undefined,
      errors: row.errors ? JSON.parse(row.errors) : undefined
    };
  }

  public getAllTasks(): Task[] {
    const stmt = this.db.prepare('SELECT * FROM tasks ORDER BY created_at DESC');
    const rows = stmt.all() as any[];

    return rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      assignedAgent: row.assigned_agent,
      dependencies: JSON.parse(row.dependencies),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      estimatedDuration: row.estimated_duration,
      actualDuration: row.actual_duration,
      result: row.result ? JSON.parse(row.result) : undefined,
      errors: row.errors ? JSON.parse(row.errors) : undefined
    }));
  }

  public getTasksByAgent(agentId: string): Task[] {
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE assigned_agent = ? ORDER BY created_at DESC');
    const rows = stmt.all(agentId) as any[];

    return rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      assignedAgent: row.assigned_agent,
      dependencies: JSON.parse(row.dependencies),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      estimatedDuration: row.estimated_duration,
      actualDuration: row.actual_duration,
      result: row.result ? JSON.parse(row.result) : undefined,
      errors: row.errors ? JSON.parse(row.errors) : undefined
    }));
  }

  // Project Management
  public async saveProject(project: BusinessProject): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO projects (
        id, name, description, business_model, status, created_at, target_launch_date,
        budget, team, milestones, risks, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    stmt.run(
      project.id,
      project.name,
      project.description,
      JSON.stringify(project.businessModel),
      project.status,
      project.createdAt.toISOString(),
      project.targetLaunchDate?.toISOString() || null,
      project.budget || null,
      JSON.stringify(project.team),
      JSON.stringify(project.milestones),
      JSON.stringify(project.risks)
    );

    console.log(`[DatabaseManager] Saved project: ${project.id}`);
  }

  public getProject(projectId: string): BusinessProject | null {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ?');
    const row = stmt.get(projectId) as any;

    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      businessModel: JSON.parse(row.business_model),
      status: row.status,
      createdAt: new Date(row.created_at),
      targetLaunchDate: row.target_launch_date ? new Date(row.target_launch_date) : undefined,
      budget: row.budget,
      team: JSON.parse(row.team),
      milestones: JSON.parse(row.milestones),
      risks: JSON.parse(row.risks)
    };
  }

  public getAllProjects(): BusinessProject[] {
    const stmt = this.db.prepare('SELECT * FROM projects ORDER BY created_at DESC');
    const rows = stmt.all() as any[];

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      businessModel: JSON.parse(row.business_model),
      status: row.status,
      createdAt: new Date(row.created_at),
      targetLaunchDate: row.target_launch_date ? new Date(row.target_launch_date) : undefined,
      budget: row.budget,
      team: JSON.parse(row.team),
      milestones: JSON.parse(row.milestones),
      risks: JSON.parse(row.risks)
    }));
  }

  // Memory Management
  public async saveMemoryEntry(entry: MemoryEntry): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO memory_entries (
        id, type, content, tags, relevance_score, created_at, agent_id, project_id, embedding_vector
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      entry.id,
      entry.type,
      JSON.stringify(entry.content),
      JSON.stringify(entry.tags),
      entry.relevanceScore,
      entry.createdAt.toISOString(),
      entry.agentId,
      entry.projectId || null,
      null // embedding_vector will be added later with vector search
    );

    console.log(`[DatabaseManager] Saved memory entry: ${entry.id}`);
  }

  public getMemoryEntriesByAgent(agentId: string, limit: number = 100): MemoryEntry[] {
    const stmt = this.db.prepare(`
      SELECT * FROM memory_entries
      WHERE agent_id = ?
      ORDER BY relevance_score DESC, created_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(agentId, limit) as any[];

    return rows.map(row => ({
      id: row.id,
      type: row.type,
      content: JSON.parse(row.content),
      tags: JSON.parse(row.tags),
      relevanceScore: row.relevance_score,
      createdAt: new Date(row.created_at),
      agentId: row.agent_id,
      projectId: row.project_id
    }));
  }

  // Message Management
  public async saveMessage(message: CommunicationMessage): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO messages (
        id, from_agent, to_agent, type, content, timestamp, priority, requires_response, project_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      message.id,
      message.fromAgent,
      message.toAgent,
      message.type,
      JSON.stringify(message.content),
      message.timestamp.toISOString(),
      message.priority,
      message.requiresResponse ? 1 : 0,
      (message as any).projectId || null
    );
  }

  public getMessageHistory(agentId: string, limit: number = 50): CommunicationMessage[] {
    const stmt = this.db.prepare(`
      SELECT * FROM messages
      WHERE from_agent = ? OR to_agent = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    const rows = stmt.all(agentId, agentId, limit) as any[];

    return rows.map(row => ({
      id: row.id,
      fromAgent: row.from_agent,
      toAgent: row.to_agent,
      type: row.type,
      content: JSON.parse(row.content),
      timestamp: new Date(row.timestamp),
      priority: row.priority,
      requiresResponse: row.requires_response === 1
    }));
  }

  // Agent Metrics
  public async saveAgentMetrics(agentId: string, metrics: AgentMetrics): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO agent_metrics (
        agent_id, tasks_completed, tasks_in_progress, average_completion_time,
        success_rate, last_active_time, total_uptime
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      agentId,
      metrics.tasksCompleted,
      metrics.tasksInProgress,
      metrics.averageCompletionTime,
      metrics.successRate,
      metrics.lastActiveTime.toISOString(),
      metrics.totalUptime
    );
  }

  public getAgentMetricsHistory(agentId: string, limit: number = 100): (AgentMetrics & { timestamp: Date })[] {
    const stmt = this.db.prepare(`
      SELECT * FROM agent_metrics
      WHERE agent_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    const rows = stmt.all(agentId, limit) as any[];

    return rows.map(row => ({
      tasksCompleted: row.tasks_completed,
      tasksInProgress: row.tasks_in_progress,
      averageCompletionTime: row.average_completion_time,
      successRate: row.success_rate,
      lastActiveTime: new Date(row.last_active_time),
      totalUptime: row.total_uptime,
      timestamp: new Date(row.timestamp)
    }));
  }

  // System Logging
  public async logSystem(level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any, source: string = 'system'): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO system_logs (id, level, message, data, source)
      VALUES (?, ?, ?, ?, ?)
    `);

    const logId = `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    stmt.run(
      logId,
      level,
      message,
      data ? JSON.stringify(data) : null,
      source
    );

    // Also log to console for development
    console.log(`[${level.toUpperCase()}] [${source}] ${message}`, data || '');
  }

  public getSystemLogs(level?: string, limit: number = 100): any[] {
    let stmt;
    let rows;

    if (level) {
      stmt = this.db.prepare('SELECT * FROM system_logs WHERE level = ? ORDER BY timestamp DESC LIMIT ?');
      rows = stmt.all(level, limit);
    } else {
      stmt = this.db.prepare('SELECT * FROM system_logs ORDER BY timestamp DESC LIMIT ?');
      rows = stmt.all(limit);
    }

    return (rows as any[]).map(row => ({
      id: row.id,
      level: row.level,
      message: row.message,
      data: row.data ? JSON.parse(row.data) : null,
      timestamp: new Date(row.timestamp),
      source: row.source
    }));
  }

  // Analytics and Statistics
  public getSystemStats(): any {
    const stats = {
      agents: {
        total: this.db.prepare('SELECT COUNT(*) as count FROM agents').get() as any,
        active: this.db.prepare("SELECT COUNT(*) as count FROM agents WHERE JSON_EXTRACT(status, '$.isActive') = 1").get() as any
      },
      tasks: {
        total: this.db.prepare('SELECT COUNT(*) as count FROM tasks').get() as any,
        pending: this.db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'pending'").get() as any,
        inProgress: this.db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'in-progress'").get() as any,
        completed: this.db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'completed'").get() as any,
        failed: this.db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'failed'").get() as any
      },
      projects: {
        total: this.db.prepare('SELECT COUNT(*) as count FROM projects').get() as any,
        active: this.db.prepare("SELECT COUNT(*) as count FROM projects WHERE status IN ('planning', 'development', 'testing')").get() as any
      },
      memory: {
        totalEntries: this.db.prepare('SELECT COUNT(*) as count FROM memory_entries').get() as any
      },
      messages: {
        totalMessages: this.db.prepare('SELECT COUNT(*) as count FROM messages').get() as any,
        todayMessages: this.db.prepare("SELECT COUNT(*) as count FROM messages WHERE DATE(timestamp) = DATE('now')").get() as any
      }
    };

    return {
      agents: stats.agents,
      tasks: stats.tasks,
      projects: stats.projects,
      memory: stats.memory,
      messages: stats.messages
    };
  }

  // Database Maintenance
  public async vacuum(): Promise<void> {
    this.db.exec('VACUUM');
    console.log('[DatabaseManager] Database vacuumed');
  }

  public async backup(backupPath: string): Promise<void> {
    // Simple backup by copying database file
    const fs = require('fs');
    const path = require('path');

    const backupDir = path.dirname(backupPath);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Close current connection temporarily
    this.db.close();

    // Copy database file
    fs.copyFileSync('./data/agent-system.db', backupPath);

    // Reopen database
    this.db = new Database('./data/agent-system.db');

    console.log(`[DatabaseManager] Database backed up to: ${backupPath}`);
  }

  public close(): void {
    this.db.close();
    console.log('[DatabaseManager] Database connection closed');
  }
}

// Singleton instance
export const databaseManager = new DatabaseManager();
