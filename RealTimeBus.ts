export interface RealTimeEvent {
  id: string;
  type: string;
  agentId: string;
  data: any;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface CollaborationSession {
  id: string;
  name: string;
  participants: string[];
  status: 'active' | 'paused' | 'completed';
  startTime: Date;
  endTime?: Date;
  messages: RealTimeMessage[];
  sharedData: Map<string, any>;
}

export interface RealTimeMessage {
  id: string;
  sessionId: string;
  from: string;
  to?: string; // Specific agent or broadcast to all
  type: 'collaboration' | 'task_update' | 'knowledge_share' | 'system_alert' | 'code_execution';
  content: any;
  timestamp: Date;
  acknowledged: string[]; // List of agent IDs who acknowledged
}

export interface WebSocketConnection {
  id: string;
  socket: any;
  agentId?: string;
  subscriptions: Set<string>;
  lastHeartbeat: Date;
  isActive: boolean;
}

export class RealTimeBus {
  private events: Map<string, RealTimeEvent> = new Map();
  private sessions: Map<string, CollaborationSession> = new Map();
  private connections: Map<string, WebSocketConnection> = new Map();
  private eventHandlers: Map<string, Function[]> = new Map();
  private messageQueue: RealTimeMessage[] = [];
  private isProcessingQueue: boolean = false;

  constructor() {
    this.startEventProcessor();
    this.startHeartbeatMonitor();
    console.log('[RealTimeBus] Initialized real-time communication system');
  }

  // WebSocket Connection Management
  addConnection(socket: any, agentId?: string): string {
    const connectionId = `conn-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    const connection: WebSocketConnection = {
      id: connectionId,
      socket,
      agentId,
      subscriptions: new Set(),
      lastHeartbeat: new Date(),
      isActive: true
    };

    this.connections.set(connectionId, connection);

    // Setup socket event handlers
    socket.on('message', (data: string) => {
      this.handleIncomingMessage(connectionId, data);
    });

    socket.on('close', () => {
      this.removeConnection(connectionId);
    });

    socket.on('error', (error: any) => {
      console.error(`[RealTimeBus] Socket error for ${connectionId}:`, error);
      this.removeConnection(connectionId);
    });

    // Send welcome message
    this.sendToConnection(connectionId, {
      type: 'connection_established',
      connectionId,
      agentId,
      timestamp: new Date(),
      capabilities: [
        'real_time_events',
        'collaboration_sessions',
        'knowledge_sharing',
        'task_coordination'
      ]
    });

    console.log(`[RealTimeBus] Connection added: ${connectionId} (Agent: ${agentId || 'client'})`);
    return connectionId;
  }

  removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.isActive = false;
      this.connections.delete(connectionId);
      console.log(`[RealTimeBus] Connection removed: ${connectionId}`);
    }
  }

  private handleIncomingMessage(connectionId: string, data: string): void {
    try {
      const message = JSON.parse(data);
      const connection = this.connections.get(connectionId);

      if (!connection) return;

      switch (message.type) {
        case 'heartbeat':
          connection.lastHeartbeat = new Date();
          this.sendToConnection(connectionId, { type: 'heartbeat_ack', timestamp: new Date() });
          break;

        case 'subscribe':
          connection.subscriptions.add(message.eventType);
          this.sendToConnection(connectionId, {
            type: 'subscription_confirmed',
            eventType: message.eventType,
            timestamp: new Date()
          });
          break;

        case 'unsubscribe':
          connection.subscriptions.delete(message.eventType);
          break;

        case 'agent_message':
          if (connection.agentId) {
            this.broadcastMessage({
              id: `msg-${Date.now()}`,
              sessionId: message.sessionId || 'global',
              from: connection.agentId,
              to: message.to,
              type: message.messageType || 'collaboration',
              content: message.content,
              timestamp: new Date(),
              acknowledged: []
            });
          }
          break;

        case 'collaboration_request':
          this.handleCollaborationRequest(connectionId, message);
          break;
      }
    } catch (error) {
      console.error(`[RealTimeBus] Error handling message from ${connectionId}:`, error);
    }
  }

  private sendToConnection(connectionId: string, data: any): void {
    const connection = this.connections.get(connectionId);
    if (connection && connection.isActive) {
      try {
        if (connection.socket.readyState === 1) { // WebSocket.OPEN
          connection.socket.send(JSON.stringify(data));
        }
      } catch (error) {
        console.error(`[RealTimeBus] Error sending to ${connectionId}:`, error);
        this.removeConnection(connectionId);
      }
    }
  }

  // Event Management
  publishEvent(event: Omit<RealTimeEvent, 'id' | 'timestamp'>): string {
    const eventId = `event-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    const realTimeEvent: RealTimeEvent = {
      id: eventId,
      timestamp: new Date(),
      ...event
    };

    this.events.set(eventId, realTimeEvent);

    // Broadcast to subscribed connections
    this.broadcastEvent(realTimeEvent);

    // Trigger event handlers
    const handlers = this.eventHandlers.get(event.type) || [];
    handlers.forEach(handler => {
      try {
        handler(realTimeEvent);
      } catch (error) {
        console.error(`[RealTimeBus] Error in event handler for ${event.type}:`, error);
      }
    });

    return eventId;
  }

  subscribeToEvents(eventType: string, handler: (event: RealTimeEvent) => void): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  private broadcastEvent(event: RealTimeEvent): void {
    for (const [connectionId, connection] of this.connections.entries()) {
      if (connection.isActive && connection.subscriptions.has(event.type)) {
        this.sendToConnection(connectionId, {
          type: 'event',
          event
        });
      }
    }
  }

  // Collaboration Sessions
  startCollaborationSession(name: string, participants: string[]): string {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    const session: CollaborationSession = {
      id: sessionId,
      name,
      participants,
      status: 'active',
      startTime: new Date(),
      messages: [],
      sharedData: new Map()
    };

    this.sessions.set(sessionId, session);

    // Notify participants
    this.publishEvent({
      type: 'collaboration_started',
      agentId: 'system',
      data: {
        sessionId,
        name,
        participants
      },
      priority: 'high'
    });

    console.log(`[RealTimeBus] Started collaboration session: ${sessionId} with ${participants.length} participants`);
    return sessionId;
  }

  joinCollaborationSession(sessionId: string, agentId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session && session.status === 'active') {
      if (!session.participants.includes(agentId)) {
        session.participants.push(agentId);

        this.publishEvent({
          type: 'agent_joined_collaboration',
          agentId: 'system',
          data: {
            sessionId,
            agentId,
            participantCount: session.participants.length
          },
          priority: 'medium'
        });

        return true;
      }
    }
    return false;
  }

  endCollaborationSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'completed';
      session.endTime = new Date();

      this.publishEvent({
        type: 'collaboration_ended',
        agentId: 'system',
        data: {
          sessionId,
          duration: session.endTime.getTime() - session.startTime.getTime(),
          messageCount: session.messages.length,
          participants: session.participants
        },
        priority: 'medium'
      });

      console.log(`[RealTimeBus] Ended collaboration session: ${sessionId}`);
    }
  }

  // Message Broadcasting
  broadcastMessage(message: RealTimeMessage): void {
    const session = this.sessions.get(message.sessionId);
    if (session) {
      session.messages.push(message);
    }

    this.messageQueue.push(message);

    if (!this.isProcessingQueue) {
      this.processMessageQueue();
    }
  }

  sendDirectMessage(from: string, to: string, content: any, type: string = 'collaboration'): void {
    const message: RealTimeMessage = {
      id: `msg-${Date.now()}`,
      sessionId: 'direct',
      from,
      to,
      type: type as any,
      content,
      timestamp: new Date(),
      acknowledged: []
    };

    this.broadcastMessage(message);
  }

  private async processMessageQueue(): Promise<void> {
    this.isProcessingQueue = true;

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      await this.deliverMessage(message);
    }

    this.isProcessingQueue = false;
  }

  private async deliverMessage(message: RealTimeMessage): Promise<void> {
    // Find target connections
    const targetConnections: WebSocketConnection[] = [];

    if (message.to) {
      // Direct message to specific agent
      for (const connection of this.connections.values()) {
        if (connection.agentId === message.to && connection.isActive) {
          targetConnections.push(connection);
        }
      }
    } else {
      // Broadcast to session participants
      const session = this.sessions.get(message.sessionId);
      if (session) {
        for (const connection of this.connections.values()) {
          if (session.participants.includes(connection.agentId || '') && connection.isActive) {
            targetConnections.push(connection);
          }
        }
      }
    }

    // Deliver message
    for (const connection of targetConnections) {
      this.sendToConnection(connection.id, {
        type: 'message',
        message
      });
    }

    // Publish message event
    this.publishEvent({
      type: 'message_delivered',
      agentId: 'system',
      data: {
        messageId: message.id,
        from: message.from,
        to: message.to,
        deliveredTo: targetConnections.length
      },
      priority: 'low'
    });
  }

  // Task Coordination
  coordinateTask(taskId: string, coordinatorId: string, participants: string[]): void {
    const sessionId = this.startCollaborationSession(`Task Coordination: ${taskId}`, participants);

    this.publishEvent({
      type: 'task_coordination_started',
      agentId: coordinatorId,
      data: {
        taskId,
        sessionId,
        coordinatorId,
        participants
      },
      priority: 'high'
    });

    // Set up task coordination data
    const session = this.sessions.get(sessionId);
    if (session) {
      session.sharedData.set('task_id', taskId);
      session.sharedData.set('coordinator', coordinatorId);
      session.sharedData.set('task_status', 'coordinating');
    }
  }

  updateTaskProgress(taskId: string, agentId: string, progress: any): void {
    this.publishEvent({
      type: 'task_progress_update',
      agentId,
      data: {
        taskId,
        progress,
        timestamp: new Date()
      },
      priority: 'medium'
    });

    // Update relevant collaboration sessions
    for (const session of this.sessions.values()) {
      if (session.sharedData.get('task_id') === taskId) {
        session.sharedData.set(`progress_${agentId}`, progress);
      }
    }
  }

  // Knowledge Sharing
  shareKnowledge(fromAgentId: string, toAgentId: string, knowledge: any): void {
    this.sendDirectMessage(fromAgentId, toAgentId, {
      type: 'knowledge_share',
      knowledge,
      timestamp: new Date()
    }, 'knowledge_share');

    this.publishEvent({
      type: 'knowledge_shared',
      agentId: fromAgentId,
      data: {
        from: fromAgentId,
        to: toAgentId,
        knowledgeType: knowledge.type || 'general',
        size: JSON.stringify(knowledge).length
      },
      priority: 'medium'
    });
  }

  // System Monitoring
  private startEventProcessor(): void {
    setInterval(() => {
      this.cleanupOldEvents();
    }, 60000); // Every minute
  }

  private startHeartbeatMonitor(): void {
    setInterval(() => {
      const now = new Date();
      const timeout = 30000; // 30 seconds

      for (const [connectionId, connection] of this.connections.entries()) {
        if (now.getTime() - connection.lastHeartbeat.getTime() > timeout) {
          console.log(`[RealTimeBus] Connection timeout: ${connectionId}`);
          this.removeConnection(connectionId);
        }
      }
    }, 10000); // Every 10 seconds
  }

  private cleanupOldEvents(): void {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [eventId, event] of this.events.entries()) {
      if (now.getTime() - event.timestamp.getTime() > maxAge) {
        this.events.delete(eventId);
      }
    }
  }

  private handleCollaborationRequest(connectionId: string, request: any): void {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.agentId) return;

    switch (request.action) {
      case 'start_session':
        const sessionId = this.startCollaborationSession(
          request.name || 'Agent Collaboration',
          request.participants || [connection.agentId]
        );
        this.sendToConnection(connectionId, {
          type: 'collaboration_session_started',
          sessionId,
          timestamp: new Date()
        });
        break;

      case 'join_session':
        const joined = this.joinCollaborationSession(request.sessionId, connection.agentId);
        this.sendToConnection(connectionId, {
          type: 'collaboration_join_result',
          success: joined,
          sessionId: request.sessionId,
          timestamp: new Date()
        });
        break;

      case 'end_session':
        this.endCollaborationSession(request.sessionId);
        break;
    }
  }

  // Public API
  getActiveConnections(): number {
    return Array.from(this.connections.values()).filter(c => c.isActive).length;
  }

  getActiveSessions(): CollaborationSession[] {
    return Array.from(this.sessions.values()).filter(s => s.status === 'active');
  }

  getRecentEvents(limit: number = 50): RealTimeEvent[] {
    return Array.from(this.events.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  getLiveStatus(): any {
    return {
      activeConnections: this.getActiveConnections(),
      activeSessions: this.getActiveSessions().length,
      recentEvents: this.getRecentEvents(10).length,
      messageQueueSize: this.messageQueue.length,
      totalEvents: this.events.size,
      totalSessions: this.sessions.size,
      uptime: Date.now() - (this.constructor as any).startTime || 0
    };
  }

  // Cleanup
  shutdown(): void {
    // Close all connections
    for (const connection of this.connections.values()) {
      if (connection.socket && connection.socket.close) {
        connection.socket.close();
      }
    }

    // End all sessions
    for (const session of this.sessions.values()) {
      if (session.status === 'active') {
        this.endCollaborationSession(session.id);
      }
    }

    console.log('[RealTimeBus] Shutdown complete');
  }
}

// Static initialization time tracking
(RealTimeBus as any).startTime = Date.now();

// Singleton instance
export const realTimeBus = new RealTimeBus();
