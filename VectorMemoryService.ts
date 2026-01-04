import { MemoryEntry } from '@/types/agents';

export interface VectorEmbedding {
  id: string;
  vector: number[];
  metadata: {
    agentId: string;
    type: string;
    tags: string[];
    relevanceScore: number;
    createdAt: Date;
    projectId?: string;
    taskId?: string;
  };
  content: string;
}

export interface SearchResult {
  embedding: VectorEmbedding;
  similarity: number;
  relevanceScore: number;
}

export interface VectorQuery {
  text?: string;
  vector?: number[];
  agentId?: string;
  tags?: string[];
  type?: string;
  projectId?: string;
  limit?: number;
  threshold?: number;
}

export interface AgentKnowledge {
  agentId: string;
  domain: string;
  concepts: string[];
  experiences: MemoryEntry[];
  patterns: string[];
  lastUpdated: Date;
}

export class VectorMemoryService {
  private embeddings: Map<string, VectorEmbedding> = new Map();
  private agentKnowledge: Map<string, AgentKnowledge> = new Map();
  private dimensions: number = 384; // OpenAI text-embedding-ada-002 dimensions
  private isConnected: boolean = false;

  constructor() {
    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    console.log('[VectorMemory] Initializing vector memory service...');

    // In a real implementation, this would connect to Pinecone, Weaviate, or Chroma
    // For demo purposes, we'll use in-memory storage with simulated embeddings
    this.isConnected = true;

    console.log('[VectorMemory] Vector memory service initialized');
  }

  async storeMemory(entry: MemoryEntry): Promise<string> {
    if (!this.isConnected) {
      await this.initializeService();
    }

    try {
      // Generate embedding for the memory content
      const content = this.extractTextFromMemory(entry);
      const vector = await this.generateEmbedding(content);

      const embedding: VectorEmbedding = {
        id: entry.id,
        vector,
        metadata: {
          agentId: entry.agentId,
          type: entry.type,
          tags: entry.tags,
          relevanceScore: entry.relevanceScore,
          createdAt: entry.createdAt,
          projectId: entry.projectId,
          taskId: entry.content.taskId
        },
        content
      };

      this.embeddings.set(entry.id, embedding);
      await this.updateAgentKnowledge(entry);

      console.log(`[VectorMemory] Stored memory: ${entry.id} for agent: ${entry.agentId}`);
      return entry.id;
    } catch (error) {
      console.error('[VectorMemory] Error storing memory:', error);
      throw error;
    }
  }

  async searchSimilar(query: VectorQuery): Promise<SearchResult[]> {
    try {
      const queryVector = query.vector || await this.generateEmbedding(query.text || '');
      const limit = query.limit || 10;
      const threshold = query.threshold || 0.7;

      const results: SearchResult[] = [];

      for (const [id, embedding] of this.embeddings) {
        // Apply filters
        if (query.agentId && embedding.metadata.agentId !== query.agentId) continue;
        if (query.type && embedding.metadata.type !== query.type) continue;
        if (query.projectId && embedding.metadata.projectId !== query.projectId) continue;
        if (query.tags && !query.tags.some(tag => embedding.metadata.tags.includes(tag))) continue;

        // Calculate similarity
        const similarity = this.cosineSimilarity(queryVector, embedding.vector);

        if (similarity >= threshold) {
          results.push({
            embedding,
            similarity,
            relevanceScore: embedding.metadata.relevanceScore * similarity
          });
        }
      }

      // Sort by relevance score (similarity * original relevance)
      results.sort((a, b) => b.relevanceScore - a.relevanceScore);

      return results.slice(0, limit);
    } catch (error) {
      console.error('[VectorMemory] Error searching memories:', error);
      return [];
    }
  }

  async getAgentKnowledge(agentId: string): Promise<AgentKnowledge | null> {
    return this.agentKnowledge.get(agentId) || null;
  }

  async shareKnowledgeBetweenAgents(fromAgentId: string, toAgentId: string, domain: string): Promise<MemoryEntry[]> {
    try {
      const fromKnowledge = this.agentKnowledge.get(fromAgentId);
      if (!fromKnowledge) return [];

      // Find relevant memories from the source agent
      const relevantMemories = await this.searchSimilar({
        agentId: fromAgentId,
        tags: [domain],
        limit: 5,
        threshold: 0.8
      });

      const sharedMemories: MemoryEntry[] = [];

      for (const result of relevantMemories) {
        const sharedMemory: MemoryEntry = {
          id: `shared-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'insight',
          content: {
            originalAgent: fromAgentId,
            sharedKnowledge: result.embedding.content,
            domain: domain,
            similarity: result.similarity
          },
          tags: ['shared-knowledge', domain, `from-${fromAgentId}`],
          relevanceScore: result.relevanceScore * 0.8, // Slight reduction for shared knowledge
          createdAt: new Date(),
          agentId: toAgentId
        };

        await this.storeMemory(sharedMemory);
        sharedMemories.push(sharedMemory);
      }

      console.log(`[VectorMemory] Shared ${sharedMemories.length} memories from ${fromAgentId} to ${toAgentId} in domain: ${domain}`);
      return sharedMemories;
    } catch (error) {
      console.error('[VectorMemory] Error sharing knowledge:', error);
      return [];
    }
  }

  async findExpertAgents(domain: string, limit: number = 3): Promise<AgentKnowledge[]> {
    const experts: AgentKnowledge[] = [];

    for (const [agentId, knowledge] of this.agentKnowledge) {
      if (knowledge.domain === domain || knowledge.concepts.includes(domain)) {
        experts.push(knowledge);
      }
    }

    // Sort by experience (number of relevant memories)
    experts.sort((a, b) => b.experiences.length - a.experiences.length);

    return experts.slice(0, limit);
  }

  async getRelatedMemories(memoryId: string, limit: number = 5): Promise<SearchResult[]> {
    const memory = this.embeddings.get(memoryId);
    if (!memory) return [];

    return await this.searchSimilar({
      vector: memory.vector,
      agentId: memory.metadata.agentId,
      limit: limit + 1, // +1 because we'll filter out the original memory
      threshold: 0.6
    }).then(results => results.filter(r => r.embedding.id !== memoryId));
  }

  async summarizeAgentExperience(agentId: string, domain?: string): Promise<string> {
    const knowledge = this.agentKnowledge.get(agentId);
    if (!knowledge) return 'No experience found for this agent.';

    const relevantMemories = domain
      ? await this.searchSimilar({ agentId, tags: [domain], limit: 10 })
      : Array.from(this.embeddings.values())
          .filter(e => e.metadata.agentId === agentId)
          .slice(0, 10)
          .map(e => ({ embedding: e, similarity: 1, relevanceScore: e.metadata.relevanceScore }));

    const experiences = relevantMemories.map(r => r.embedding.content).join(' ');

    // In a real implementation, this would use an LLM to generate a summary
    const summary = `Agent ${agentId} has extensive experience in ${knowledge.domain} with ${knowledge.experiences.length} recorded experiences. Key areas include: ${knowledge.concepts.join(', ')}. Recent activities involve: ${experiences.substring(0, 300)}...`;

    return summary;
  }

  async cleanupOldMemories(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - (daysOld * 24 * 60 * 60 * 1000));
    let cleanedCount = 0;

    for (const [id, embedding] of this.embeddings) {
      if (embedding.metadata.createdAt < cutoffDate && embedding.metadata.relevanceScore < 0.5) {
        this.embeddings.delete(id);
        cleanedCount++;
      }
    }

    console.log(`[VectorMemory] Cleaned up ${cleanedCount} old memories`);
    return cleanedCount;
  }

  async getSystemStats(): Promise<any> {
    const agentStats = new Map<string, number>();
    const typeStats = new Map<string, number>();
    const tagStats = new Map<string, number>();

    for (const [_, embedding] of this.embeddings) {
      // Agent statistics
      const agentCount = agentStats.get(embedding.metadata.agentId) || 0;
      agentStats.set(embedding.metadata.agentId, agentCount + 1);

      // Type statistics
      const typeCount = typeStats.get(embedding.metadata.type) || 0;
      typeStats.set(embedding.metadata.type, typeCount + 1);

      // Tag statistics
      for (const tag of embedding.metadata.tags) {
        const tagCount = tagStats.get(tag) || 0;
        tagStats.set(tag, tagCount + 1);
      }
    }

    return {
      totalMemories: this.embeddings.size,
      totalAgents: this.agentKnowledge.size,
      memoryByAgent: Object.fromEntries(agentStats),
      memoryByType: Object.fromEntries(typeStats),
      topTags: Array.from(tagStats.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count })),
      isConnected: this.isConnected,
      dimensions: this.dimensions
    };
  }

  // Private helper methods
  private extractTextFromMemory(entry: MemoryEntry): string {
    const content = typeof entry.content === 'string'
      ? entry.content
      : JSON.stringify(entry.content);

    return `${entry.type}: ${content} Tags: ${entry.tags.join(', ')}`;
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // In a real implementation, this would call OpenAI's embedding API
    // For demo purposes, we'll generate a simple hash-based embedding
    const embedding = new Array(this.dimensions).fill(0);

    // Simple hash-based embedding for demonstration
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      const index = char % this.dimensions;
      embedding[index] += Math.sin(char * 0.1) * 0.1;
    }

    // Normalize the vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => magnitude > 0 ? val / magnitude : 0);
  }

  private cosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) return 0;

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      magnitudeA += vectorA[i] * vectorA[i];
      magnitudeB += vectorB[i] * vectorB[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) return 0;

    return dotProduct / (magnitudeA * magnitudeB);
  }

  private async updateAgentKnowledge(entry: MemoryEntry): Promise<void> {
    const existingKnowledge = this.agentKnowledge.get(entry.agentId);

    if (existingKnowledge) {
      existingKnowledge.experiences.push(entry);
      existingKnowledge.lastUpdated = new Date();

      // Update concepts based on new entry tags
      for (const tag of entry.tags) {
        if (!existingKnowledge.concepts.includes(tag)) {
          existingKnowledge.concepts.push(tag);
        }
      }

      // Keep only recent experiences (last 100)
      if (existingKnowledge.experiences.length > 100) {
        existingKnowledge.experiences = existingKnowledge.experiences.slice(-100);
      }
    } else {
      // Create new knowledge entry for agent
      const newKnowledge: AgentKnowledge = {
        agentId: entry.agentId,
        domain: this.inferDomainFromAgent(entry.agentId),
        concepts: [...entry.tags],
        experiences: [entry],
        patterns: [],
        lastUpdated: new Date()
      };

      this.agentKnowledge.set(entry.agentId, newKnowledge);
    }
  }

  private inferDomainFromAgent(agentId: string): string {
    const domains: Record<string, string> = {
      'executive-001': 'strategic_planning',
      'engineer-001': 'software_development',
      'designer-001': 'user_experience_design',
      'legal-001': 'legal_compliance',
      'marketing-001': 'digital_marketing',
      'devops-001': 'infrastructure_operations',
      'testing-001': 'quality_assurance'
    };

    return domains[agentId] || 'general';
  }
}

// Singleton instance for shared memory across agents
export const vectorMemoryService = new VectorMemoryService();
