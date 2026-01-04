import { CommunicationMessage, AgentRole } from '@/types/agents';

export interface AgentConnection {
  agentId: string;
  role: AgentRole;
  isOnline: boolean;
  lastSeen: Date;
  activeTask?: string;
  status: 'idle' | 'busy' | 'collaborating' | 'offline';
  websocket?: WebSocket;
}

export interface CollaborationSession {
  id: string;
  participants: string[];
  topic: string;
  startTime: Date;
  endTime?: Date;
  messages: CommunicationMessage[];
  status: 'active' | 'paused' | 'completed';
  outcome?: any;
}

export interface RealTimeEvent {
  id: string;
  type: 'agent_status' | 'task_update' | 'collaboration' | 'system' | 'error';
  agentId: string;
  timestamp: Date;
  data: any;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  recipients?: string[];
}

export interface MessageRoute {
  from: string;
  to: string | string[];
  messageType: string;
  priority: number;
  retryCount: number;
  maxRetries: number;
  timeout: number;
}

export class CommunicationBus {
  private connections: Map<string, AgentConnection> = new Map();
  private collaborationSessions: Map<string, CollaborationSession> = new Map();
  private messageQueue: Map<string, CommunicationMessage[]> = new Map();
  private eventHandlers: Map<string, ((event: RealTimeEvent) => void)[]> = new Map();
  private isRunning: boolean = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private messageProcessor: NodeJS.Timeout | null = null;

  // WebSocket server simulation (in real implementation would use actual WebSocket server)
  private webSocketClients: Map<string, WebSocket> = new Map();
  private readonly port: number = 8080;

  constructor() {
    this.initializeCommunicationBus();
  }

  // Initialize the communication bus
  private initializeCommunicationBus(): void {
    console.log('[CommunicationBus] Initializing real-time communication system...');

    // Start heartbeat monitoring
    this.startHeartbeat();

    // Start message processing
    this.startMessageProcessor();

    // Initialize event handlers
    this.initializeEventHandlers();

    this.isRunning = true;
    console.log('[CommunicationBus] Communication bus is running');
  }

  // Register agent for real-time communication
  async registerAgent(agentId: string, role: AgentRole): Promise<void> {
    const connection: AgentConnection = {
      agentId,
      role,
      isOnline: true,
      lastSeen: new Date(),
      status: 'idle'
    };

    this.connections.set(agentId, connection);

    // Initialize message queue for agent
    this.messageQueue.set(agentId, []);

    // Broadcast agent join event
    await this.broadcastEvent({
      id: `event-${Date.now()}`,
      type: 'agent_status',
      agentId,
      timestamp: new Date(),
      data: { status: 'joined', role },
      priority: 'medium'
    });

    console.log(`[CommunicationBus] Registered agent: ${agentId} (${role})`);
  }

  // Send real-time message between agents
  async sendMessage(message: CommunicationMessage): Promise<void> {
    console.log(`[CommunicationBus] Routing real-time message: ${message.fromAgent} -> ${message.toAgent}`);

    // Add timestamp and routing info
    const enhancedMessage = {
      ...message,
      routedAt: new Date(),
      routingInfo: {
        hops: 0,
        path: [message.fromAgent],
        deliveryAttempts: 0
      }
    };

    if (message.toAgent === 'broadcast') {
      await this.broadcastMessage(enhancedMessage);
    } else {
      await this.deliverMessage(enhancedMessage);
    }

    // Create real-time event
    await this.broadcastEvent({
      id: `event-${Date.now()}`,
      type: 'collaboration',
      agentId: message.fromAgent,
      timestamp: new Date(),
      data: { messageType: message.type, recipient: message.toAgent },
      priority: message.priority as any
    });
  }

  // Start collaboration session between agents
  async startCollaboration(participants: string[], topic: string): Promise<string> {
    const sessionId = `collab-${Date.now()}`;

    const session: CollaborationSession = {
      id: sessionId,
      participants,
      topic,
      startTime: new Date(),
      messages: [],
      status: 'active'
    };

    this.collaborationSessions.set(sessionId, session);

    // Notify all participants
    for (const agentId of participants) {
      const connection = this.connections.get(agentId);
      if (connection) {
        connection.status = 'collaborating';
      }

      await this.sendMessage({
        id: `collab-invite-${Date.now()}`,
        fromAgent: 'system',
        toAgent: agentId,
        type: 'collaboration',
        content: {
          sessionId,
          topic,
          participants,
          action: 'join_collaboration'
        },
        timestamp: new Date(),
        priority: 'high',
        requiresResponse: true
      });
    }

    // Broadcast collaboration started event
    await this.broadcastEvent({
      id: `event-${Date.now()}`,
      type: 'collaboration',
      agentId: 'system',
      timestamp: new Date(),
      data: { action: 'session_started', sessionId, participants, topic },
      priority: 'high'
    });

    console.log(`[CommunicationBus] Started collaboration session: ${sessionId} with ${participants.length} agents`);
    return sessionId;
  }

  // Real-time task coordination
  async coordinateTask(taskId: string, assignedAgent: string, collaborators: string[] = []): Promise<void> {
    // Update agent status
    const connection = this.connections.get(assignedAgent);
    if (connection) {
      connection.activeTask = taskId;
      connection.status = 'busy';
    }

    // Notify primary agent
    await this.sendMessage({
      id: `task-assign-${Date.now()}`,
      fromAgent: 'system',
      toAgent: assignedAgent,
      type: 'task_assignment',
      content: {
        taskId,
        collaborators,
        priority: 'high',
        realTimeUpdates: true
      },
      timestamp: new Date(),
      priority: 'high',
      requiresResponse: true
    });

    // Notify collaborators
    for (const collaboratorId of collaborators) {
      await this.sendMessage({
        id: `collab-request-${Date.now()}`,
        fromAgent: 'system',
        toAgent: collaboratorId,
        type: 'collaboration',
        content: {
          taskId,
          primaryAgent: assignedAgent,
          role: 'collaborator'
        },
        timestamp: new Date(),
        priority: 'medium',
        requiresResponse: false
      });
    }

    // Broadcast task coordination event
    await this.broadcastEvent({
      id: `event-${Date.now()}`,
      type: 'task_update',
      agentId: assignedAgent,
      timestamp: new Date(),
      data: { action: 'task_assigned', taskId, collaborators },
      priority: 'medium'
    });
  }

  // Live progress tracking
  async updateTaskProgress(taskId: string, agentId: string, progress: any): Promise<void> {
    // Broadcast progress update
    await this.broadcastEvent({
      id: `event-${Date.now()}`,
      type: 'task_update',
      agentId,
      timestamp: new Date(),
      data: {
        action: 'progress_update',
        taskId,
        progress,
        timestamp: new Date()
      },
      priority: 'medium'
    });

    // Notify interested agents (task owner, collaborators, executive)
    const interestedAgents = await this.getInterestedAgents(taskId);
    for (const interestedAgent of interestedAgents) {
      if (interestedAgent !== agentId) {
        await this.sendMessage({
          id: `progress-update-${Date.now()}`,
          fromAgent: agentId,
          toAgent: interestedAgent,
          type: 'status_update',
          content: {
            taskId,
            progress,
            updateType: 'progress'
          },
          timestamp: new Date(),
          priority: 'low',
          requiresResponse: false
        });
      }
    }
  }

  // Real-time decision making
  async requestDecision(requesterId: string, decision: any, urgency: 'low' | 'medium' | 'high' | 'urgent'): Promise<string> {
    const decisionId = `decision-${Date.now()}`;

    // Determine who should participate in decision
    const decisionMakers = await this.getDecisionMakers(decision.type, urgency);

    // Send decision request to relevant agents
    for (const agentId of decisionMakers) {
      await this.sendMessage({
        id: `decision-request-${Date.now()}`,
        fromAgent: requesterId,
        toAgent: agentId,
        type: 'question',
        content: {
          decisionId,
          decision,
          urgency,
          deadline: this.calculateDecisionDeadline(urgency)
        },
        timestamp: new Date(),
        priority: urgency as any,
        requiresResponse: true
      });
    }

    // Broadcast decision request
    await this.broadcastEvent({
      id: `event-${Date.now()}`,
      type: 'collaboration',
      agentId: requesterId,
      timestamp: new Date(),
      data: {
        action: 'decision_requested',
        decisionId,
        urgency,
        participants: decisionMakers
      },
      priority: urgency as any
    });

    return decisionId;
  }

  // Agent status management
  async updateAgentStatus(agentId: string, status: AgentConnection['status'], metadata?: any): Promise<void> {
    const connection = this.connections.get(agentId);
    if (!connection) return;

    const previousStatus = connection.status;
    connection.status = status;
    connection.lastSeen = new Date();

    // Broadcast status change if significant
    if (previousStatus !== status) {
      await this.broadcastEvent({
        id: `event-${Date.now()}`,
        type: 'agent_status',
        agentId,
        timestamp: new Date(),
        data: {
          previousStatus,
          newStatus: status,
          metadata
        },
        priority: 'low'
      });
    }
  }

  // Event subscription system
  subscribeToEvents(eventType: string, handler: (event: RealTimeEvent) => void): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  // Get live system status
  getLiveStatus(): any {
    const activeAgents = Array.from(this.connections.values()).filter(c => c.isOnline);
    const activeSessions = Array.from(this.collaborationSessions.values()).filter(s => s.status === 'active');

    return {
      timestamp: new Date(),
      system: {
        isRunning: this.isRunning,
        totalConnections: this.connections.size,
        activeAgents: activeAgents.length,
        activeSessions: activeSessions.length
      },
      agents: activeAgents.map(agent => ({
        id: agent.agentId,
        role: agent.role,
        status: agent.status,
        activeTask: agent.activeTask,
        lastSeen: agent.lastSeen
      })),
      collaborations: activeSessions.map(session => ({
        id: session.id,
        participants: session.participants,
        topic: session.topic,
        duration: Date.now() - session.startTime.getTime(),
        messageCount: session.messages.length
      })),
      messageQueue: {
        totalQueued: Array.from(this.messageQueue.values()).reduce((sum, queue) => sum + queue.length, 0),
        agentQueues: Object.fromEntries(
          Array.from(this.messageQueue.entries()).map(([agentId, messages]) => [agentId, messages.length])
        )
      }
    };
  }

  // Private helper methods
  private async broadcastMessage(message: CommunicationMessage): Promise<void> {
    const activeConnections = Array.from(this.connections.values()).filter(c => c.isOnline);

    for (const connection of activeConnections) {
      if (connection.agentId !== message.fromAgent) {
        const targetedMessage = {
          ...message,
          toAgent: connection.agentId
        };
        await this.deliverMessage(targetedMessage);
      }
    }
  }

  private async deliverMessage(message: CommunicationMessage): Promise<void> {
    const connection = this.connections.get(message.toAgent);

    if (!connection || !connection.isOnline) {
      // Queue message for later delivery
      if (!this.messageQueue.has(message.toAgent)) {
        this.messageQueue.set(message.toAgent, []);
      }
      this.messageQueue.get(message.toAgent)!.push(message);
      return;
    }

    // Simulate WebSocket delivery (in real implementation would use actual WebSocket)
    if (connection.websocket && connection.websocket.readyState === WebSocket.OPEN) {
      connection.websocket.send(JSON.stringify({
        type: 'agent_message',
        data: message
      }));
    }

    console.log(`[CommunicationBus] Delivered message to ${message.toAgent}: ${message.type}`);
  }

  private async broadcastEvent(event: RealTimeEvent): Promise<void> {
    // Trigger event handlers
    const handlers = this.eventHandlers.get(event.type) || [];
    for (const handler of handlers) {
      try {
        handler(event);
      } catch (error) {
        console.error(`[CommunicationBus] Error in event handler:`, error);
      }
    }

    // Broadcast to connected clients
    for (const connection of this.connections.values()) {
      if (connection.isOnline && (!event.recipients || event.recipients.includes(connection.agentId))) {
        if (connection.websocket && connection.websocket.readyState === WebSocket.OPEN) {
          connection.websocket.send(JSON.stringify({
            type: 'system_event',
            data: event
          }));
        }
      }
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.checkAgentHeartbeats();
    }, 30000); // Every 30 seconds
  }

  private startMessageProcessor(): void {
    this.messageProcessor = setInterval(() => {
      this.processQueuedMessages();
    }, 1000); // Every second
  }

  private checkAgentHeartbeats(): void {
    const now = new Date();
    const timeoutThreshold = 2 * 60 * 1000; // 2 minutes

    for (const connection of this.connections.values()) {
      const timeSinceLastSeen = now.getTime() - connection.lastSeen.getTime();

      if (connection.isOnline && timeSinceLastSeen > timeoutThreshold) {
        connection.isOnline = false;
        connection.status = 'offline';

        this.broadcastEvent({
          id: `event-${Date.now()}`,
          type: 'agent_status',
          agentId: connection.agentId,
          timestamp: new Date(),
          data: { status: 'timeout', lastSeen: connection.lastSeen },
          priority: 'medium'
        });

        console.log(`[CommunicationBus] Agent ${connection.agentId} timed out`);
      }
    }
  }

  private async processQueuedMessages(): Promise<void> {
    for (const [agentId, messages] of this.messageQueue.entries()) {
      if (messages.length === 0) continue;

      const connection = this.connections.get(agentId);
      if (connection && connection.isOnline) {
        // Deliver queued messages
        const messagesToDeliver = messages.splice(0, 10); // Limit batch size

        for (const message of messagesToDeliver) {
          await this.deliverMessage(message);
        }
      }
    }
  }

  private initializeEventHandlers(): void {
    // Add default event handlers
    this.subscribeToEvents('error', (event) => {
      console.error(`[CommunicationBus] Error event from ${event.agentId}:`, event.data);
    });

    this.subscribeToEvents('collaboration', (event) => {
      console.log(`[CommunicationBus] Collaboration event from ${event.agentId}:`, event.data.action);
    });
  }

  private async getInterestedAgents(taskId: string): Promise<string[]> {
    // Return agents who should be notified about task updates
    return ['executive-001']; // Executive always interested, plus task owner and collaborators
  }

  private async getDecisionMakers(decisionType: string, urgency: string): Promise<string[]> {
    // Determine who should participate in decision based on type and urgency
    const decisionMakers = ['executive-001']; // Executive always involved

    switch (decisionType) {
      case 'technical':
        decisionMakers.push('engineer-001');
        break;
      case 'design':
        decisionMakers.push('designer-001');
        break;
      case 'legal':
        decisionMakers.push('legal-001');
        break;
      case 'marketing':
        decisionMakers.push('marketing-001');
        break;
      case 'infrastructure':
        decisionMakers.push('devops-001');
        break;
      default:
        // Include all agents for general decisions
        decisionMakers.push('engineer-001', 'designer-001', 'legal-001', 'marketing-001', 'devops-001');
    }

    return decisionMakers;
  }

  private calculateDecisionDeadline(urgency: string): Date {
    const now = new Date();
    let minutes = 60; // Default 1 hour

    switch (urgency) {
      case 'urgent': minutes = 15; break;
      case 'high': minutes = 30; break;
      case 'medium': minutes = 60; break;
      case 'low': minutes = 240; break; // 4 hours
    }

    return new Date(now.getTime() + minutes * 60 * 1000);
  }

  // WebSocket connection management (simplified simulation)
  connectWebSocket(agentId: string): void {
    // In real implementation, this would handle actual WebSocket connections
    const connection = this.connections.get(agentId);
    if (connection) {
      // Simulate WebSocket connection
      connection.websocket = {
        readyState: 1, // OPEN
        send: (data: string) => {
          console.log(`[WebSocket] Sending to ${agentId}:`, JSON.parse(data).type);
        }
      } as WebSocket;

      connection.isOnline = true;
      connection.lastSeen = new Date();
    }
  }

  disconnectWebSocket(agentId: string): void {
    const connection = this.connections.get(agentId);
    if (connection) {
      connection.websocket = undefined;
      connection.isOnline = false;
      connection.status = 'offline';
    }
  }

  // Shutdown and cleanup
  shutdown(): void {
    console.log('[CommunicationBus] Shutting down communication bus...');

    this.isRunning = false;

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.messageProcessor) {
      clearInterval(this.messageProcessor);
    }

    // Close all WebSocket connections
    for (const connection of this.connections.values()) {
      if (connection.websocket) {
        connection.websocket.close();
      }
    }

    this.connections.clear();
    this.collaborationSessions.clear();
    this.messageQueue.clear();
    this.eventHandlers.clear();

    console.log('[CommunicationBus] Shutdown complete');
  }
}

// Singleton instance
export const communicationBus = new CommunicationBus();
