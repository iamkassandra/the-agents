import { WebSocketServer, WebSocket } from 'ws';
import { createServer, IncomingMessage } from 'http';
import { parse } from 'url';
import { agentManager } from '../AgentManager';
import { realTimeBus } from '../communication/RealTimeBus';

interface ClientConnection {
  id: string;
  ws: WebSocket;
  subscriptions: Set<string>;
  lastHeartbeat: Date;
  isAuthenticated: boolean;
  userId?: string;
  agentId?: string;
}

interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: number;
  messageId: string;
}

export class AgentWebSocketServer {
  private server: WebSocketServer;
  private clients: Map<string, ClientConnection> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(port: number = 8080) {
    // Create HTTP server for WebSocket upgrade
    const httpServer = createServer();

    // Create WebSocket server
    this.server = new WebSocketServer({
      server: httpServer,
      path: '/ws/agents'
    });

    this.setupWebSocketHandlers();
    this.startHeartbeat();
    this.startCleanup();

    // Start server
    httpServer.listen(port, () => {
      console.log(`[WebSocketServer] Agent communication server started on port ${port}`);
      console.log(`[WebSocketServer] WebSocket endpoint: ws://localhost:${port}/ws/agents`);
    });
  }

  private setupWebSocketHandlers(): void {
    this.server.on('connection', (ws: WebSocket, request: IncomingMessage) => {
      const url = parse(request.url || '', true);
      const clientId = this.generateClientId();

      const client: ClientConnection = {
        id: clientId,
        ws,
        subscriptions: new Set(),
        lastHeartbeat: new Date(),
        isAuthenticated: false,
        userId: url.query.userId as string,
        agentId: url.query.agentId as string
      };

      this.clients.set(clientId, client);

      console.log(`[WebSocketServer] Client connected: ${clientId}`);

      // Send welcome message
      this.sendToClient(clientId, {
        type: 'connection_established',
        payload: {
          clientId,
          serverTime: new Date(),
          capabilities: [
            'agent_communication',
            'real_time_updates',
            'task_monitoring',
            'system_events',
            'live_collaboration'
          ]
        },
        timestamp: Date.now(),
        messageId: this.generateMessageId()
      });

      // Register with real-time bus
      realTimeBus.addConnection(ws, client.agentId);

      // Setup client event handlers
      ws.on('message', (data: Buffer) => {
        this.handleClientMessage(clientId, data);
      });

      ws.on('close', () => {
        this.handleClientDisconnect(clientId);
      });

      ws.on('error', (error: Error) => {
        console.error(`[WebSocketServer] Client error ${clientId}:`, error);
        this.handleClientDisconnect(clientId);
      });

      ws.on('pong', () => {
        const client = this.clients.get(clientId);
        if (client) {
          client.lastHeartbeat = new Date();
        }
      });
    });

    this.server.on('error', (error) => {
      console.error('[WebSocketServer] Server error:', error);
    });
  }

  private handleClientMessage(clientId: string, data: Buffer): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const message: WebSocketMessage = JSON.parse(data.toString());

      switch (message.type) {
        case 'heartbeat':
          client.lastHeartbeat = new Date();
          this.sendToClient(clientId, {
            type: 'heartbeat_ack',
            payload: { serverTime: new Date() },
            timestamp: Date.now(),
            messageId: this.generateMessageId()
          });
          break;

        case 'authenticate':
          this.handleAuthentication(clientId, message.payload);
          break;

        case 'subscribe':
          this.handleSubscription(clientId, message.payload);
          break;

        case 'unsubscribe':
          this.handleUnsubscription(clientId, message.payload);
          break;

        case 'agent_command':
          this.handleAgentCommand(clientId, message.payload);
          break;

        case 'task_update':
          this.handleTaskUpdate(clientId, message.payload);
          break;

        case 'system_query':
          this.handleSystemQuery(clientId, message.payload);
          break;

        case 'collaboration_request':
          this.handleCollaborationRequest(clientId, message.payload);
          break;

        default:
          console.warn(`[WebSocketServer] Unknown message type: ${message.type}`);
      }

    } catch (error) {
      console.error(`[WebSocketServer] Error handling message from ${clientId}:`, error);
      this.sendErrorToClient(clientId, 'Invalid message format');
    }
  }

  private async handleAuthentication(clientId: string, payload: any): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      // Import authManager here to avoid circular dependencies
      const { authManager } = await import('../auth/AuthManager');

      if (payload.token) {
        // Validate JWT token
        const user = await authManager.validateToken(payload.token);
        if (user) {
          client.isAuthenticated = true;
          client.userId = user.id;

          this.sendToClient(clientId, {
            type: 'authentication_success',
            payload: {
              userId: user.id,
              username: user.username,
              role: user.role,
              permissions: user.role === 'admin'
                ? ['agent_control', 'task_management', 'system_monitoring', 'user_management']
                : ['agent_control', 'task_management']
            },
            timestamp: Date.now(),
            messageId: this.generateMessageId()
          });

          console.log(`[WebSocketServer] Client ${clientId} authenticated as ${user.username} (${user.role})`);
          return;
        }
      }

      // Authentication failed
      this.sendErrorToClient(clientId, 'Invalid authentication token');

    } catch (error) {
      console.error(`[WebSocketServer] Authentication error for client ${clientId}:`, error);
      this.sendErrorToClient(clientId, 'Authentication failed');
    }
  }

  private handleSubscription(clientId: string, payload: any): void {
    const client = this.clients.get(clientId);
    if (!client || !client.isAuthenticated) {
      this.sendErrorToClient(clientId, 'Authentication required');
      return;
    }

    const { channels } = payload;
    if (Array.isArray(channels)) {
      channels.forEach(channel => client.subscriptions.add(channel));

      this.sendToClient(clientId, {
        type: 'subscription_confirmed',
        payload: { channels, totalSubscriptions: client.subscriptions.size },
        timestamp: Date.now(),
        messageId: this.generateMessageId()
      });

      console.log(`[WebSocketServer] Client ${clientId} subscribed to channels:`, channels);
    }
  }

  private handleUnsubscription(clientId: string, payload: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { channels } = payload;
    if (Array.isArray(channels)) {
      channels.forEach(channel => client.subscriptions.delete(channel));

      this.sendToClient(clientId, {
        type: 'unsubscription_confirmed',
        payload: { channels, totalSubscriptions: client.subscriptions.size },
        timestamp: Date.now(),
        messageId: this.generateMessageId()
      });
    }
  }

  private async handleAgentCommand(clientId: string, payload: any): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client || !client.isAuthenticated) {
      this.sendErrorToClient(clientId, 'Authentication required');
      return;
    }

    try {
      const { agentId, command, parameters } = payload;

      // Forward command to agent manager
      const result = await this.executeAgentCommand(agentId, command, parameters);

      this.sendToClient(clientId, {
        type: 'agent_command_result',
        payload: {
          agentId,
          command,
          result,
          status: 'success'
        },
        timestamp: Date.now(),
        messageId: this.generateMessageId()
      });

      // Broadcast to interested clients
      this.broadcastToSubscribers('agent_events', {
        type: 'agent_command_executed',
        agentId,
        command,
        executedBy: client.userId,
        timestamp: new Date()
      });

    } catch (error) {
      this.sendErrorToClient(clientId, `Command execution failed: ${error}`);
    }
  }

  private async handleTaskUpdate(clientId: string, payload: any): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client || !client.isAuthenticated) return;

    try {
      const { taskId, update } = payload;

      // Update task through agent manager
      const updatedTask = await this.updateTask(taskId, update);

      // Broadcast update to subscribers
      this.broadcastToSubscribers('task_updates', {
        type: 'task_updated',
        taskId,
        update: updatedTask,
        updatedBy: client.userId,
        timestamp: new Date()
      });

    } catch (error) {
      this.sendErrorToClient(clientId, `Task update failed: ${error}`);
    }
  }

  private async handleSystemQuery(clientId: string, payload: any): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client || !client.isAuthenticated) return;

    try {
      const { queryType, parameters } = payload;
      let result;

      switch (queryType) {
        case 'system_status':
          result = agentManager.getAdvancedSystemStats();
          break;
        case 'agent_list':
          result = agentManager.getAllAgents();
          break;
        case 'task_list':
          result = agentManager.getAllTasks();
          break;
        case 'project_list':
          result = agentManager.getAllProjects();
          break;
        default:
          throw new Error(`Unknown query type: ${queryType}`);
      }

      this.sendToClient(clientId, {
        type: 'system_query_result',
        payload: {
          queryType,
          result,
          timestamp: new Date()
        },
        timestamp: Date.now(),
        messageId: this.generateMessageId()
      });

    } catch (error) {
      this.sendErrorToClient(clientId, `System query failed: ${error}`);
    }
  }

  private handleCollaborationRequest(clientId: string, payload: any): void {
    const client = this.clients.get(clientId);
    if (!client || !client.isAuthenticated) return;

    const { action, sessionId, participants } = payload;

    switch (action) {
      case 'start_session':
        const newSessionId = realTimeBus.startCollaborationSession(
          payload.name || 'Live Collaboration',
          participants || [client.userId]
        );

        this.sendToClient(clientId, {
          type: 'collaboration_session_started',
          payload: { sessionId: newSessionId },
          timestamp: Date.now(),
          messageId: this.generateMessageId()
        });
        break;

      case 'join_session':
        const joined = realTimeBus.joinCollaborationSession(sessionId, client.userId || clientId);

        this.sendToClient(clientId, {
          type: 'collaboration_join_result',
          payload: { sessionId, success: joined },
          timestamp: Date.now(),
          messageId: this.generateMessageId()
        });
        break;

      case 'end_session':
        realTimeBus.endCollaborationSession(sessionId);
        break;
    }
  }

  private handleClientDisconnect(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      // Remove from real-time bus
      realTimeBus.removeConnection(clientId);

      // Clean up
      this.clients.delete(clientId);

      console.log(`[WebSocketServer] Client disconnected: ${clientId}`);
    }
  }

  // Helper methods
  private sendToClient(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error(`[WebSocketServer] Error sending to client ${clientId}:`, error);
        this.handleClientDisconnect(clientId);
      }
    }
  }

  private sendErrorToClient(clientId: string, error: string): void {
    this.sendToClient(clientId, {
      type: 'error',
      payload: { message: error },
      timestamp: Date.now(),
      messageId: this.generateMessageId()
    });
  }

  private broadcastToSubscribers(channel: string, data: any): void {
    const message: WebSocketMessage = {
      type: 'broadcast',
      payload: {
        channel,
        data
      },
      timestamp: Date.now(),
      messageId: this.generateMessageId()
    };

    this.clients.forEach((client, clientId) => {
      if (client.subscriptions.has(channel) && client.isAuthenticated) {
        this.sendToClient(clientId, message);
      }
    });
  }

  private async executeAgentCommand(agentId: string, command: string, parameters: any): Promise<any> {
    // Mock implementation - in production, integrate with actual agent commands
    return {
      agentId,
      command,
      parameters,
      executedAt: new Date(),
      status: 'completed',
      result: 'Command executed successfully'
    };
  }

  private async updateTask(taskId: string, update: any): Promise<any> {
    // Mock implementation - in production, integrate with task management
    return {
      taskId,
      update,
      updatedAt: new Date(),
      status: 'updated'
    };
  }

  // Utility methods
  private generateClientId(): string {
    return `client-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  }

  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client, clientId) => {
        if (client.ws.readyState === WebSocket.OPEN) {
          try {
            client.ws.ping();
          } catch (error) {
            console.error(`[WebSocketServer] Heartbeat error for ${clientId}:`, error);
            this.handleClientDisconnect(clientId);
          }
        } else {
          this.handleClientDisconnect(clientId);
        }
      });
    }, 30000); // Every 30 seconds
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = new Date();
      const timeout = 60000; // 1 minute timeout

      this.clients.forEach((client, clientId) => {
        if (now.getTime() - client.lastHeartbeat.getTime() > timeout) {
          console.log(`[WebSocketServer] Client timeout: ${clientId}`);
          this.handleClientDisconnect(clientId);
        }
      });
    }, 30000); // Check every 30 seconds
  }

  // Public API methods
  public getStats(): any {
    return {
      totalClients: this.clients.size,
      authenticatedClients: Array.from(this.clients.values()).filter(c => c.isAuthenticated).length,
      totalSubscriptions: Array.from(this.clients.values())
        .reduce((sum, client) => sum + client.subscriptions.size, 0),
      activeChannels: new Set(
        Array.from(this.clients.values())
          .flatMap(client => Array.from(client.subscriptions))
      ).size,
      uptime: Date.now() - (this.constructor as any).startTime || 0
    };
  }

  public broadcastSystemUpdate(data: any): void {
    this.broadcastToSubscribers('system_updates', data);
  }

  public broadcastAgentUpdate(agentId: string, data: any): void {
    this.broadcastToSubscribers('agent_updates', { agentId, ...data });
  }

  public broadcastTaskUpdate(taskId: string, data: any): void {
    this.broadcastToSubscribers('task_updates', { taskId, ...data });
  }

  // Shutdown
  public shutdown(): void {
    console.log('[WebSocketServer] Shutting down...');

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Close all client connections
    this.clients.forEach((client, clientId) => {
      client.ws.close();
    });

    this.clients.clear();

    // Close server
    this.server.close(() => {
      console.log('[WebSocketServer] Shutdown complete');
    });
  }
}

// Track start time for uptime calculation
(AgentWebSocketServer as any).startTime = Date.now();

// Singleton instance for export
export const agentWebSocketServer = new AgentWebSocketServer(process.env.WS_PORT ? parseInt(process.env.WS_PORT) : 8080);
