import { Agent, Task, AgentAction, MemoryEntry, CommunicationMessage, AgentRole, AgentCapability } from '@/types/agents';

export abstract class BaseAgent {
  protected id: string;
  protected name: string;
  protected role: AgentRole;
  protected capabilities: AgentCapability[];
  protected memory: MemoryEntry[] = [];
  protected actionHistory: AgentAction[] = [];
  protected isActive: boolean = false;
  protected currentTask: Task | null = null;
  protected workload: number = 0;

  constructor(id: string, name: string, role: AgentRole, capabilities: AgentCapability[]) {
    this.id = id;
    this.name = name;
    this.role = role;
    this.capabilities = capabilities;
  }

  // Abstract methods that must be implemented by specialized agents
  abstract processTask(task: Task): Promise<any>;
  abstract generatePlan(objective: string): Promise<Task[]>;
  abstract validateOutput(output: any): Promise<boolean>;

  // Core agent functionality
  async executeAction(action: AgentAction): Promise<any> {
    const startTime = Date.now();

    try {
      this.logAction(action);
      const result = await this.performAction(action);

      action.result = result;
      action.duration = Date.now() - startTime;

      this.actionHistory.push(action);
      this.storeMemory({
        id: `action-${Date.now()}`,
        type: 'task',
        content: { action, result },
        tags: [this.role, action.type],
        relevanceScore: 0.8,
        createdAt: new Date(),
        agentId: this.id
      });

      return result;
    } catch (error) {
      action.error = error instanceof Error ? error.message : 'Unknown error';
      action.duration = Date.now() - startTime;

      this.actionHistory.push(action);
      this.storeMemory({
        id: `error-${Date.now()}`,
        type: 'error',
        content: { action, error },
        tags: [this.role, 'error'],
        relevanceScore: 0.9,
        createdAt: new Date(),
        agentId: this.id
      });

      throw error;
    }
  }

  protected abstract performAction(action: AgentAction): Promise<any>;

  // Memory management
  storeMemory(entry: MemoryEntry): void {
    this.memory.push(entry);

    // Keep memory size manageable (last 1000 entries)
    if (this.memory.length > 1000) {
      this.memory = this.memory
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 1000);
    }
  }

  searchMemory(query: string, tags?: string[]): MemoryEntry[] {
    return this.memory.filter(entry => {
      const contentMatch = JSON.stringify(entry.content).toLowerCase().includes(query.toLowerCase());
      const tagMatch = tags ? tags.some(tag => entry.tags.includes(tag)) : true;
      return contentMatch && tagMatch;
    });
  }

  // Communication
  async sendMessage(message: CommunicationMessage): Promise<void> {
    // This would integrate with the communication bus
    console.log(`[${this.name}] Sending message:`, message);

    this.storeMemory({
      id: `message-${Date.now()}`,
      type: 'task',
      content: { type: 'sent_message', message },
      tags: [this.role, 'communication'],
      relevanceScore: 0.7,
      createdAt: new Date(),
      agentId: this.id
    });
  }

  async receiveMessage(message: CommunicationMessage): Promise<void> {
    console.log(`[${this.name}] Received message:`, message);

    this.storeMemory({
      id: `message-${Date.now()}`,
      type: 'task',
      content: { type: 'received_message', message },
      tags: [this.role, 'communication'],
      relevanceScore: 0.7,
      createdAt: new Date(),
      agentId: this.id
    });

    // Process message based on type
    switch (message.type) {
      case 'task_assignment':
        await this.handleTaskAssignment(message.content);
        break;
      case 'question':
        await this.handleQuestion(message);
        break;
      case 'collaboration':
        await this.handleCollaboration(message.content);
        break;
      default:
        console.log(`[${this.name}] Unknown message type: ${message.type}`);
    }
  }

  protected async handleTaskAssignment(task: Task): Promise<void> {
    this.currentTask = task;
    this.workload = Math.min(this.workload + 0.2, 1.0);

    try {
      const result = await this.processTask(task);

      // Send completion message
      await this.sendMessage({
        id: `completion-${Date.now()}`,
        fromAgent: this.id,
        toAgent: 'executive-001', // Report to executive
        type: 'status_update',
        content: {
          taskId: task.id,
          status: 'completed',
          result
        },
        timestamp: new Date(),
        priority: 'medium',
        requiresResponse: false
      });

      this.currentTask = null;
      this.workload = Math.max(this.workload - 0.2, 0);

    } catch (error) {
      // Send error message
      await this.sendMessage({
        id: `error-${Date.now()}`,
        fromAgent: this.id,
        toAgent: 'executive-001',
        type: 'error_report',
        content: {
          taskId: task.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date(),
        priority: 'high',
        requiresResponse: true
      });
    }
  }

  protected async handleQuestion(message: CommunicationMessage): Promise<void> {
    // Process question and send response
    const response = await this.generateResponse(message.content);

    await this.sendMessage({
      id: `response-${Date.now()}`,
      fromAgent: this.id,
      toAgent: message.fromAgent,
      type: 'status_update',
      content: { question: message.content, response },
      timestamp: new Date(),
      priority: message.priority,
      requiresResponse: false
    });
  }

  protected async handleCollaboration(content: any): Promise<void> {
    // Handle collaboration requests
    console.log(`[${this.name}] Handling collaboration:`, content);
  }

  protected async generateResponse(question: string): Promise<string> {
    // This would integrate with an LLM to generate responses
    return `I understand your question about: ${question}. Let me process this...`;
  }

  // Status and metrics
  getStatus() {
    return {
      isActive: this.isActive,
      currentTask: this.currentTask?.id,
      lastHeartbeat: new Date(),
      workload: this.workload,
      availableCapabilities: this.capabilities
    };
  }

  getMetrics() {
    const completed = this.actionHistory.filter(a => a.result && !a.error).length;
    const failed = this.actionHistory.filter(a => a.error).length;
    const avgDuration = this.actionHistory.reduce((acc, a) => acc + (a.duration || 0), 0) / this.actionHistory.length;

    return {
      tasksCompleted: completed,
      tasksInProgress: this.currentTask ? 1 : 0,
      averageCompletionTime: avgDuration / (1000 * 60 * 60), // Convert to hours
      successRate: completed / (completed + failed) || 0,
      lastActiveTime: new Date(),
      totalUptime: 0 // This would be calculated from actual runtime
    };
  }

  // Utility methods
  protected logAction(action: AgentAction): void {
    console.log(`[${this.name}] Executing action: ${action.type}`, action.parameters);
  }

  activate(): void {
    this.isActive = true;
    console.log(`[${this.name}] Agent activated`);
  }

  deactivate(): void {
    this.isActive = false;
    this.currentTask = null;
    console.log(`[${this.name}] Agent deactivated`);
  }

  // Configuration
  updateConfiguration(config: Record<string, any>): void {
    // Update agent configuration
    console.log(`[${this.name}] Configuration updated:`, config);
  }

  // Capability assessment
  canHandle(task: Task): boolean {
    // Check if agent has relevant capabilities for the task
    const requiredCapabilities = this.extractRequiredCapabilities(task);
    return requiredCapabilities.every(req =>
      this.capabilities.some(cap =>
        cap.name.toLowerCase().includes(req.toLowerCase()) && cap.confidence >= 0.7
      )
    );
  }

  protected extractRequiredCapabilities(task: Task): string[] {
    // Extract capabilities from task description
    const description = task.description.toLowerCase();
    const capabilities: string[] = [];

    if (description.includes('design') || description.includes('ui') || description.includes('ux')) {
      capabilities.push('design');
    }
    if (description.includes('api') || description.includes('backend') || description.includes('database')) {
      capabilities.push('development');
    }
    if (description.includes('deploy') || description.includes('infrastructure') || description.includes('ci/cd')) {
      capabilities.push('infrastructure');
    }
    if (description.includes('legal') || description.includes('compliance') || description.includes('gdpr')) {
      capabilities.push('legal');
    }
    if (description.includes('marketing') || description.includes('seo') || description.includes('content')) {
      capabilities.push('marketing');
    }

    return capabilities;
  }
}
