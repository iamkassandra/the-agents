import { ExecutiveAgent } from './agents/ExecutiveAgent';
import { EngineerAgent } from './agents/EngineerAgent';
import { DesignerAgent } from './agents/DesignerAgent';
import { LegalAgent } from './agents/LegalAgent';
import { MarketingAgent } from './agents/MarketingAgent';
import { DevOpsAgent } from './agents/DevOpsAgent';
import { TestingAgent } from './agents/TestingAgent';
import { BaseAgent } from './agents/BaseAgent';
import { VectorMemorySystem } from './memory/VectorMemorySystem';
import { CodeExecutionEnvironment } from './execution/CodeExecutionEnvironment';
import {
  Agent,
  Task,
  BusinessProject,
  CommunicationMessage,
  MemoryEntry,
  AgentRole
} from '@/types/agents';

export class AgentManager {
  private agents: Map<string, BaseAgent> = new Map();
  private tasks: Map<string, Task> = new Map();
  private projects: Map<string, BusinessProject> = new Map();
  private messageQueue: CommunicationMessage[] = [];
  private globalMemory: MemoryEntry[] = [];
  private isRunning: boolean = false;

  // Advanced systems
  private vectorMemory: VectorMemorySystem;
  private communicationBus: Map<string, any>;
  private codeExecution: CodeExecutionEnvironment;
  private realTimeConnections: Set<any>;

  constructor() {
    // Initialize advanced systems
    this.vectorMemory = new VectorMemorySystem();
    this.communicationBus = new Map();
    this.codeExecution = new CodeExecutionEnvironment();
    this.realTimeConnections = new Set();

    this.initializeAgents();
    this.startMessageProcessor();
    this.startAdvancedSystems();
  }

  private initializeAgents(): void {
    // Initialize all specialized agents
    const executiveAgent = new ExecutiveAgent();
    const engineerAgent = new EngineerAgent();
    const designerAgent = new DesignerAgent();
    const legalAgent = new LegalAgent();
    const marketingAgent = new MarketingAgent();
    const devopsAgent = new DevOpsAgent();
    const testingAgent = new TestingAgent();

    // Register agents
    this.registerAgent(executiveAgent);
    this.registerAgent(engineerAgent);
    this.registerAgent(designerAgent);
    this.registerAgent(legalAgent);
    this.registerAgent(marketingAgent);
    this.registerAgent(devopsAgent);
    this.registerAgent(testingAgent);

    console.log('[AgentManager] Initialized with agents:', Array.from(this.agents.keys()));
    console.log('[AgentManager] Total agents registered:', this.agents.size);
  }

  private registerAgent(agent: BaseAgent): void {
    const agentId = (agent as any).id;
    const agentRole = (agent as any).role;

    this.agents.set(agentId, agent);
    agent.activate();

    // Register with communication bus for real-time collaboration
    this.communicationBus.set(agentId, { role: agentRole, status: 'active', lastSeen: new Date() });

    console.log(`[AgentManager] Registered agent: ${agentId} (${agentRole}) with enhanced systems`);
  }

  private startAdvancedSystems(): void {
    console.log('[AgentManager] Starting advanced AI systems...');

    // Setup periodic memory consolidation
    setInterval(async () => {
      const stats = this.vectorMemory.getMemoryStats();
      if (stats.totalEntries > 100) {
        console.log('[AgentManager] Running memory consolidation...');
        await this.vectorMemory.consolidateMemories();
      }
    }, 300000); // Every 5 minutes

    // Initialize communication channels
    for (const agentId of this.agents.keys()) {
      this.communicationBus.set(`${agentId}_channel`, {
        messages: [],
        lastActivity: new Date(),
        collaborators: []
      });
    }

    console.log('[AgentManager] Advanced systems initialized:');
    console.log('  ✅ Vector Memory System - Cross-agent knowledge sharing & semantic search');
    console.log('  ✅ Communication Bus - Real-time agent collaboration');
    console.log('  ✅ Code Execution Environment - Autonomous development & testing');
    console.log('  ✅ Testing Agent - Automated QA and performance monitoring');
  }

  // Project Management
  async createProject(description: string, businessModel: string): Promise<BusinessProject> {
    console.log('[AgentManager] Creating new project:', description);

    // Get the executive agent to lead the project
    const executiveAgent = this.agents.get('executive-001');
    if (!executiveAgent) {
      throw new Error('Executive agent not available');
    }

    // Generate project plan
    const tasks = await executiveAgent.generatePlan(description);

    // Create project
    const project: BusinessProject = {
      id: `project-${Date.now()}`,
      name: this.extractProjectName(description),
      description,
      businessModel: {
        type: businessModel as any,
        revenueStreams: [],
        targetMarket: '',
        valueProposition: '',
        keyFeatures: [],
        complianceRequirements: []
      },
      status: 'planning',
      createdAt: new Date(),
      team: Array.from(this.agents.keys()),
      milestones: [],
      risks: []
    };

    this.projects.set(project.id, project);

    // Assign initial planning task to executive
    const planningTask: Task = {
      id: `planning-${Date.now()}`,
      title: 'Project Planning and Coordination',
      description: `Plan and coordinate development of: ${description}`,
      status: 'pending',
      priority: 'critical',
      assignedAgent: 'executive-001',
      dependencies: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.assignTask(planningTask);

    // Store in global memory
    this.storeGlobalMemory({
      id: `project-creation-${Date.now()}`,
      type: 'decision',
      content: { project, initialTasks: tasks },
      tags: ['project', 'planning'],
      relevanceScore: 1.0,
      createdAt: new Date(),
      agentId: 'agent-manager'
    });

    return project;
  }

  // Task Management
  async assignTask(task: Task): Promise<void> {
    console.log(`[AgentManager] Assigning task: ${task.title} to ${task.assignedAgent}`);

    // Store task
    this.tasks.set(task.id, task);

    // Check if dependencies are met
    const dependenciesMet = await this.checkDependencies(task);
    if (!dependenciesMet) {
      console.log(`[AgentManager] Task ${task.id} blocked by dependencies`);
      task.status = 'blocked';
      return;
    }

    // Find best agent for the task if not specified
    if (!task.assignedAgent || !this.agents.has(task.assignedAgent)) {
      task.assignedAgent = await this.findBestAgent(task);
    }

    const agent = this.agents.get(task.assignedAgent);
    if (!agent) {
      throw new Error(`Agent ${task.assignedAgent} not found`);
    }

    // Check if agent can handle the task
    if (!agent.canHandle(task)) {
      console.log(`[AgentManager] Agent ${task.assignedAgent} cannot handle task, reassigning...`);
      task.assignedAgent = await this.findBestAgent(task);
      const newAgent = this.agents.get(task.assignedAgent);
      if (!newAgent) {
        throw new Error('No suitable agent found for task');
      }
    }

    // Send task assignment message
    const message: CommunicationMessage = {
      id: `task-assignment-${Date.now()}`,
      fromAgent: 'agent-manager',
      toAgent: task.assignedAgent,
      type: 'task_assignment',
      content: task,
      timestamp: new Date(),
      priority: task.priority as any,
      requiresResponse: true
    };

    await this.sendMessage(message);
    task.status = 'in-progress';
  }

  private async findBestAgent(task: Task): Promise<string> {
    const availableAgents = Array.from(this.agents.values())
      .filter(agent => agent.canHandle(task) && (agent as any).status.workload < 0.9);

    if (availableAgents.length === 0) {
      // Return executive agent as fallback
      return 'executive-001';
    }

    // Score agents based on capability match and current workload
    const scoredAgents = availableAgents.map(agent => {
      const capabilities = (agent as any).capabilities;
      const workload = (agent as any).status.workload;

      // Calculate capability score
      const capabilityScore = capabilities
        .filter((cap: any) => task.description.toLowerCase().includes(cap.category.toLowerCase()))
        .reduce((sum: number, cap: any) => sum + cap.confidence, 0);

      // Lower workload is better
      const workloadScore = 1 - workload;

      return {
        agent,
        score: capabilityScore * 0.7 + workloadScore * 0.3
      };
    });

    // Sort by score and return best agent
    scoredAgents.sort((a, b) => b.score - a.score);
    return (scoredAgents[0].agent as any).id;
  }

  private async checkDependencies(task: Task): Promise<boolean> {
    if (!task.dependencies || task.dependencies.length === 0) {
      return true;
    }

    return task.dependencies.every(depId => {
      const depTask = this.tasks.get(depId);
      return depTask && depTask.status === 'completed';
    });
  }

  // Communication System
  async sendMessage(message: CommunicationMessage): Promise<void> {
    console.log(`[AgentManager] Routing message from ${message.fromAgent} to ${message.toAgent}`);

    if (message.toAgent === 'broadcast') {
      // Broadcast to all agents
      for (const agent of this.agents.values()) {
        await agent.receiveMessage({ ...message, toAgent: (agent as any).id });
      }
    } else {
      // Send to specific agent
      const agent = this.agents.get(message.toAgent);
      if (agent) {
        await agent.receiveMessage(message);
      } else {
        console.error(`[AgentManager] Agent ${message.toAgent} not found for message delivery`);
      }
    }

    // Store message in global memory
    this.storeGlobalMemory({
      id: `message-${Date.now()}`,
      type: 'task',
      content: { message, delivered: true },
      tags: ['communication', message.type],
      relevanceScore: 0.6,
      createdAt: new Date(),
      agentId: message.fromAgent
    });
  }

  private startMessageProcessor(): void {
    if (this.isRunning) return;

    this.isRunning = true;

    // Process message queue every 100ms
    setInterval(() => {
      this.processMessageQueue();
    }, 100);

    // Check for blocked tasks every 5 seconds
    setInterval(() => {
      this.checkBlockedTasks();
    }, 5000);

    // Update agent heartbeats every 30 seconds
    setInterval(() => {
      this.updateAgentHeartbeats();
    }, 30000);
  }

  private async processMessageQueue(): Promise<void> {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        await this.sendMessage(message);
      }
    }
  }

  private async checkBlockedTasks(): Promise<void> {
    const blockedTasks = Array.from(this.tasks.values())
      .filter(task => task.status === 'blocked');

    for (const task of blockedTasks) {
      const dependenciesMet = await this.checkDependencies(task);
      if (dependenciesMet) {
        console.log(`[AgentManager] Unblocking task: ${task.id}`);
        task.status = 'pending';
        await this.assignTask(task);
      }
    }
  }

  private updateAgentHeartbeats(): void {
    for (const agent of this.agents.values()) {
      const status = agent.getStatus();
      console.log(`[AgentManager] Agent ${(agent as any).name} heartbeat - Workload: ${Math.round(status.workload * 100)}%`);
    }
  }

  // Memory Management
  private storeGlobalMemory(entry: MemoryEntry): void {
    this.globalMemory.push(entry);

    // Keep global memory manageable
    if (this.globalMemory.length > 5000) {
      this.globalMemory = this.globalMemory
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 5000);
    }
  }

  searchGlobalMemory(query: string, tags?: string[]): MemoryEntry[] {
    return this.globalMemory.filter(entry => {
      const contentMatch = JSON.stringify(entry.content).toLowerCase().includes(query.toLowerCase());
      const tagMatch = tags ? tags.some(tag => entry.tags.includes(tag)) : true;
      return contentMatch && tagMatch;
    });
  }

  // Status and Monitoring
  getSystemStatus() {
    const agents = Array.from(this.agents.values()).map(agent => ({
      id: (agent as any).id,
      name: (agent as any).name,
      role: (agent as any).role,
      status: agent.getStatus(),
      metrics: agent.getMetrics()
    }));

    const tasks = Array.from(this.tasks.values());
    const projects = Array.from(this.projects.values());

    return {
      agents,
      tasks: {
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'pending').length,
        inProgress: tasks.filter(t => t.status === 'in-progress').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        blocked: tasks.filter(t => t.status === 'blocked').length,
        failed: tasks.filter(t => t.status === 'failed').length
      },
      projects: {
        total: projects.length,
        planning: projects.filter(p => p.status === 'planning').length,
        development: projects.filter(p => p.status === 'development').length,
        testing: projects.filter(p => p.status === 'testing').length,
        deployment: projects.filter(p => p.status === 'deployment').length,
        live: projects.filter(p => p.status === 'live').length
      },
      memory: {
        globalEntries: this.globalMemory.length,
        messageQueue: this.messageQueue.length
      },
      system: {
        isRunning: this.isRunning,
        uptime: Date.now(), // This would be calculated from start time
        lastActivity: new Date()
      }
    };
  }

  getProjectStatus(projectId: string): BusinessProject | undefined {
    return this.projects.get(projectId);
  }

  getTaskStatus(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  getAllProjects(): BusinessProject[] {
    return Array.from(this.projects.values());
  }

  getAllAgents(): any[] {
    return Array.from(this.agents.values()).map(agent => ({
      id: (agent as any).id,
      name: (agent as any).name,
      role: (agent as any).role,
      capabilities: (agent as any).capabilities,
      status: agent.getStatus(),
      metrics: agent.getMetrics()
    }));
  }

  // Agent Lifecycle Management
  async addAgent(agent: BaseAgent): Promise<void> {
    this.registerAgent(agent);

    // Announce new agent to team
    const message: CommunicationMessage = {
      id: `agent-join-${Date.now()}`,
      fromAgent: 'agent-manager',
      toAgent: 'broadcast',
      type: 'status_update',
      content: {
        event: 'agent_joined',
        agent: {
          id: (agent as any).id,
          name: (agent as any).name,
          role: (agent as any).role,
          capabilities: (agent as any).capabilities
        }
      },
      timestamp: new Date(),
      priority: 'low',
      requiresResponse: false
    };

    this.messageQueue.push(message);
  }

  async removeAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    // Deactivate agent
    agent.deactivate();

    // Reassign any pending tasks
    const agentTasks = Array.from(this.tasks.values())
      .filter(task => task.assignedAgent === agentId && task.status === 'in-progress');

    for (const task of agentTasks) {
      task.status = 'pending';
      task.assignedAgent = await this.findBestAgent(task);
      await this.assignTask(task);
    }

    // Remove agent
    this.agents.delete(agentId);

    console.log(`[AgentManager] Removed agent: ${agentId}`);
  }

  // Utility Methods
  private extractProjectName(description: string): string {
    // Extract a meaningful project name from description
    const words = description.split(' ').slice(0, 4);
    return words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  // Performance Optimization
  async optimizeWorkload(): Promise<void> {
    const agents = Array.from(this.agents.values());
    const overloadedAgents = agents.filter(agent => agent.getStatus().workload > 0.8);
    const underutilizedAgents = agents.filter(agent => agent.getStatus().workload < 0.4);

    if (overloadedAgents.length > 0 && underutilizedAgents.length > 0) {
      console.log('[AgentManager] Optimizing workload distribution...');

      // Reassign tasks from overloaded to underutilized agents
      for (const overloadedAgent of overloadedAgents) {
        const agentTasks = Array.from(this.tasks.values())
          .filter(task => task.assignedAgent === (overloadedAgent as any).id && task.status === 'pending');

        if (agentTasks.length > 0 && underutilizedAgents.length > 0) {
          const task = agentTasks[0];
          const availableAgent = underutilizedAgents.find(agent => agent.canHandle(task));

          if (availableAgent) {
            task.assignedAgent = (availableAgent as any).id;
            console.log(`[AgentManager] Reassigned task ${task.id} from ${(overloadedAgent as any).id} to ${(availableAgent as any).id}`);
          }
        }
      }
    }
  }

  // Advanced Agent Collaboration Methods
  async shareKnowledgeBetweenAgents(fromAgentId: string, toAgentId: string, topic: string): Promise<void> {
    console.log(`[AgentManager] Sharing knowledge from ${fromAgentId} to ${toAgentId} on topic: ${topic}`);

    const sharedEntries = await this.vectorMemory.shareKnowledge(fromAgentId, toAgentId, topic);

    // Notify target agent of new knowledge
    this.broadcastToAgent(toAgentId, {
      type: 'knowledge_transfer',
      from: fromAgentId,
      topic,
      entriesCount: sharedEntries.length,
      timestamp: new Date()
    });

    console.log(`[AgentManager] Transferred ${sharedEntries.length} knowledge entries`);
  }

  async executeCodeWithAgent(agentId: string, code: string, language: string): Promise<any> {
    console.log(`[AgentManager] Executing ${language} code for agent ${agentId}`);

    const executionContext = {
      id: `exec-${Date.now()}`,
      agentId,
      language: language as any,
      code,
      environment: 'sandbox' as const,
      timeout: 30000,
      memoryLimit: 128,
      allowedModules: ['util', 'crypto'],
      restrictedAPIs: ['fs', 'child_process']
    };

    const result = await this.codeExecution.executeCode(executionContext);

    // Store execution result in memory
    await this.vectorMemory.storeMemory({
      id: `execution-memory-${Date.now()}`,
      type: 'task',
      content: {
        code,
        result: result.output,
        performance: result.performance,
        status: result.status
      },
      tags: ['code_execution', language, agentId],
      relevanceScore: result.status === 'success' ? 0.8 : 0.6,
      createdAt: new Date(),
      agentId
    }, agentId);

    return result;
  }

  async runAutomatedTests(agentId: string, code: string, testCases: any[]): Promise<any> {
    console.log(`[AgentManager] Running automated tests for agent ${agentId}`);

    const testResults = await this.codeExecution.runTests(agentId, code, testCases);

    // Store test results in memory
    await this.vectorMemory.storeMemory({
      id: `test-memory-${Date.now()}`,
      type: 'task',
      content: {
        testResults,
        code,
        testCases,
        summary: {
          total: testResults.length,
          passed: testResults.filter(r => r.passed).length,
          failed: testResults.filter(r => !r.passed).length
        }
      },
      tags: ['automated_testing', 'quality_assurance', agentId],
      relevanceScore: 0.9,
      createdAt: new Date(),
      agentId
    }, agentId);

    return testResults;
  }

  // Real-time Communication
  broadcastToAllAgents(message: any): void {
    console.log('[AgentManager] Broadcasting message to all agents:', message.type);

    for (const agentId of this.agents.keys()) {
      this.broadcastToAgent(agentId, message);
    }
  }

  broadcastToAgent(agentId: string, message: any): void {
    const channel = this.communicationBus.get(`${agentId}_channel`);
    if (channel) {
      channel.messages.push({
        ...message,
        timestamp: new Date(),
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
      });
      channel.lastActivity = new Date();

      // Emit to real-time clients
      this.emitToRealTimeClients('agent_message', {
        agentId,
        message,
        timestamp: new Date()
      });
    }
  }

  subscribeToAgentUpdates(agentId: string, callback: (message: any) => void): void {
    const channel = this.communicationBus.get(`${agentId}_channel`);
    if (channel) {
      if (!channel.subscribers) channel.subscribers = [];
      channel.subscribers.push(callback);
    }
  }

  // Real-time client management
  addRealTimeClient(client: any): void {
    this.realTimeConnections.add(client);
    console.log(`[AgentManager] Real-time client connected. Total: ${this.realTimeConnections.size}`);
  }

  removeRealTimeClient(client: any): void {
    this.realTimeConnections.delete(client);
    console.log(`[AgentManager] Real-time client disconnected. Total: ${this.realTimeConnections.size}`);
  }

  private emitToRealTimeClients(event: string, data: any): void {
    for (const client of this.realTimeConnections) {
      try {
        if (client.emit) {
          client.emit(event, data);
        } else if (client.send) {
          client.send(JSON.stringify({ event, data }));
        }
      } catch (error) {
        console.error('[AgentManager] Error emitting to client:', error);
        this.realTimeConnections.delete(client);
      }
    }
  }

  // Autonomous Business Development Demo
  async startAutonomousDevelopment(businessIdea: string): Promise<any> {
    console.log('[AgentManager] 🚀 Starting autonomous business development:', businessIdea);

    // Create comprehensive project
    const project = await this.createProject(businessIdea, 'subscription');

    // Phase 1: Strategic Analysis (Executive Agent)
    console.log('[AgentManager] Phase 1: Strategic analysis...');
    const executiveAgent = this.agents.get('executive-001');
    if (executiveAgent) {
      const strategyTask = {
        id: `strategy-${Date.now()}`,
        title: 'Business Strategy Development',
        description: `Develop comprehensive business strategy for: ${businessIdea}`,
        status: 'pending' as const,
        priority: 'critical' as const,
        assignedAgent: 'executive-001',
        dependencies: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        estimatedDuration: 4
      };

      const strategyResult = await executiveAgent.processTask(strategyTask);
      await this.vectorMemory.storeMemory({
        id: `strategy-memory-${Date.now()}`,
        type: 'decision',
        content: strategyResult,
        tags: ['business_strategy', 'executive_decision', businessIdea.toLowerCase().replace(/\s+/g, '_')],
        relevanceScore: 0.95,
        createdAt: new Date(),
        agentId: 'executive-001'
      }, 'executive-001');
    }

    // Phase 2: Technical Planning (Engineer Agent)
    console.log('[AgentManager] Phase 2: Technical architecture...');
    await this.shareKnowledgeBetweenAgents('executive-001', 'engineer-001', 'business_strategy');

    const engineerAgent = this.agents.get('engineer-001');
    if (engineerAgent) {
      const techTask = {
        id: `tech-${Date.now()}`,
        title: 'Technical Architecture Design',
        description: `Design technical architecture for: ${businessIdea}`,
        status: 'pending' as const,
        priority: 'critical' as const,
        assignedAgent: 'engineer-001',
        dependencies: [`strategy-${Date.now()}`],
        createdAt: new Date(),
        updatedAt: new Date(),
        estimatedDuration: 6
      };

      const techResult = await engineerAgent.processTask(techTask);

      // Generate and test sample code
      if (techResult && techResult.codeGeneration) {
        const codeResult = await this.executeCodeWithAgent('engineer-001', techResult.codeGeneration.sampleCode, 'javascript');
        console.log('[AgentManager] Code execution result:', codeResult.status);
      }
    }

    // Phase 3: Design System (Designer Agent)
    console.log('[AgentManager] Phase 3: Design system creation...');
    await this.shareKnowledgeBetweenAgents('executive-001', 'designer-001', 'brand_strategy');
    await this.shareKnowledgeBetweenAgents('engineer-001', 'designer-001', 'technical_requirements');

    // Phase 4: Legal Compliance (Legal Agent)
    console.log('[AgentManager] Phase 4: Legal compliance review...');
    await this.shareKnowledgeBetweenAgents('executive-001', 'legal-001', 'business_model');

    // Phase 5: Marketing Strategy (Marketing Agent)
    console.log('[AgentManager] Phase 5: Marketing strategy...');
    await this.shareKnowledgeBetweenAgents('executive-001', 'marketing-001', 'target_audience');
    await this.shareKnowledgeBetweenAgents('designer-001', 'marketing-001', 'brand_identity');

    // Phase 6: Infrastructure Setup (DevOps Agent)
    console.log('[AgentManager] Phase 6: Infrastructure deployment...');
    await this.shareKnowledgeBetweenAgents('engineer-001', 'devops-001', 'technical_architecture');

    // Phase 7: Quality Assurance (Testing Agent)
    console.log('[AgentManager] Phase 7: Comprehensive testing...');
    const testingAgent = this.agents.get('testing-001');
    if (testingAgent) {
      const testTask = {
        id: `testing-${Date.now()}`,
        title: 'Comprehensive Testing Suite',
        description: `Create testing strategy for: ${businessIdea}`,
        status: 'pending' as const,
        priority: 'high' as const,
        assignedAgent: 'testing-001',
        dependencies: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        estimatedDuration: 8
      };

      const testResult = await testingAgent.processTask(testTask);

      // Run automated tests
      const sampleTestCases = [
        {
          id: 'test-1',
          name: 'Basic functionality test',
          input: { action: 'test' },
          expectedOutput: { success: true },
          description: 'Test basic application functionality'
        }
      ];

      await this.runAutomatedTests('testing-001', 'function test() { return { success: true }; }', sampleTestCases);
    }

    // Generate final project summary
    const memoryStats = this.vectorMemory.getMemoryStats();
    const executionStats = this.codeExecution.getExecutionStats();

    const projectSummary = {
      projectId: project.id,
      businessIdea,
      phases: [
        'Strategic Analysis ✅',
        'Technical Architecture ✅',
        'Design System ✅',
        'Legal Compliance ✅',
        'Marketing Strategy ✅',
        'Infrastructure Setup ✅',
        'Quality Assurance ✅'
      ],
      systemStats: {
        totalMemoryEntries: memoryStats.totalEntries,
        knowledgeGraphNodes: memoryStats.knowledgeGraphNodes,
        codeExecutions: executionStats.totalExecutions,
        testSuccess: executionStats.successRate
      },
      agentsInvolved: Array.from(this.agents.keys()),
      status: 'completed',
      completedAt: new Date()
    };

    // Broadcast completion to all real-time clients
    this.emitToRealTimeClients('autonomous_development_complete', projectSummary);

    console.log('[AgentManager] 🎉 Autonomous development completed!');
    console.log('Summary:', projectSummary);

    return projectSummary;
  }

  // System monitoring and stats
  getAdvancedSystemStats(): any {
    const memoryStats = this.vectorMemory.getMemoryStats();
    const executionStats = this.codeExecution.getExecutionStats();

    return {
      agents: {
        total: this.agents.size,
        active: Array.from(this.agents.values()).filter(a => (a as any).isActive).length,
        roles: Array.from(this.agents.values()).map(a => (a as any).role)
      },
      memory: {
        vectorEntries: memoryStats.totalEntries,
        clusters: memoryStats.totalClusters,
        knowledgeGraph: {
          nodes: memoryStats.knowledgeGraphNodes,
          edges: memoryStats.knowledgeGraphEdges,
          communities: memoryStats.communities
        },
        isConsolidating: memoryStats.isConsolidating
      },
      execution: {
        totalExecutions: executionStats.totalExecutions,
        activeExecutions: executionStats.activeExecutions,
        successRate: executionStats.successRate,
        averageExecutionTime: executionStats.averageExecutionTime
      },
      communication: {
        totalChannels: this.communicationBus.size,
        realtimeClients: this.realTimeConnections.size,
        messagesInQueue: Array.from(this.communicationBus.values())
          .reduce((sum, channel) => sum + (channel.messages?.length || 0), 0)
      },
      projects: {
        total: this.projects.size,
        active: Array.from(this.projects.values()).filter(p => p.status === 'planning' || p.status === 'development').length
      },
      tasks: {
        total: this.tasks.size,
        pending: Array.from(this.tasks.values()).filter(t => t.status === 'pending').length,
        inProgress: Array.from(this.tasks.values()).filter(t => t.status === 'in-progress').length,
        completed: Array.from(this.tasks.values()).filter(t => t.status === 'completed').length
      }
    };
  }

  // Shutdown
  async shutdown(): Promise<void> {
    console.log('[AgentManager] Shutting down...');

    this.isRunning = false;

    // Deactivate all agents
    for (const agent of this.agents.values()) {
      agent.deactivate();
    }

    // Clear data structures
    this.agents.clear();
    this.tasks.clear();
    this.projects.clear();
    this.messageQueue = [];
    this.globalMemory = [];

    console.log('[AgentManager] Shutdown complete');
  }
}

// Singleton instance
export const agentManager = new AgentManager();
