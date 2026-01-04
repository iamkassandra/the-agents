import { MemoryEntry } from '@/types/agents';

export interface VectorEmbedding {
  id: string;
  vector: number[];
  metadata: MemoryEntry;
  timestamp: Date;
  agentId: string;
  tags: string[];
}

export interface SearchResult {
  embedding: VectorEmbedding;
  similarity: number;
  relevance: number;
}

export interface MemoryCluster {
  id: string;
  centroid: number[];
  members: VectorEmbedding[];
  topic: string;
  createdAt: Date;
  lastUpdated: Date;
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  clusters: MemoryCluster[];
}

export interface KnowledgeNode {
  id: string;
  type: 'agent' | 'task' | 'decision' | 'insight' | 'error';
  content: any;
  embedding: number[];
  connections: string[];
  importance: number;
}

export interface KnowledgeEdge {
  from: string;
  to: string;
  weight: number;
  type: 'similarity' | 'dependency' | 'causation' | 'collaboration';
  metadata: any;
}

export class VectorMemoryStore {
  private embeddings: Map<string, VectorEmbedding> = new Map();
  private clusters: Map<string, MemoryCluster> = new Map();
  private knowledgeGraph: KnowledgeGraph;
  private dimensionality: number = 384; // Simulated embedding dimension
  private readonly maxMemorySize: number = 10000;
  private readonly clusterThreshold: number = 0.8;

  constructor() {
    this.knowledgeGraph = {
      nodes: [],
      edges: [],
      clusters: []
    };
  }

  // Generate embeddings (simulated - in production would use actual embedding model)
  private async generateEmbedding(text: string): Promise<number[]> {
    // Simulated embedding generation
    // In production, this would call OpenAI embeddings API or use a local model
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Array(this.dimensionality).fill(0);

    // Simple hash-based embedding simulation
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      for (let j = 0; j < word.length; j++) {
        const charCode = word.charCodeAt(j);
        const index = (charCode * (i + 1)) % this.dimensionality;
        embedding[index] += Math.sin(charCode * (j + 1)) * 0.1;
      }
    }

    // Normalize the embedding
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / (magnitude || 1));
  }

  // Store memory with vector embedding
  async storeMemory(memory: MemoryEntry): Promise<void> {
    const text = this.extractTextFromMemory(memory);
    const embedding = await this.generateEmbedding(text);

    const vectorEmbedding: VectorEmbedding = {
      id: memory.id,
      vector: embedding,
      metadata: memory,
      timestamp: new Date(),
      agentId: memory.agentId,
      tags: memory.tags
    };

    this.embeddings.set(memory.id, vectorEmbedding);

    // Update knowledge graph
    await this.updateKnowledgeGraph(vectorEmbedding);

    // Perform clustering
    await this.performClustering();

    // Cleanup old memories if needed
    await this.cleanupOldMemories();

    console.log(`[VectorMemory] Stored memory: ${memory.id} from agent ${memory.agentId}`);
  }

  // Semantic search using vector similarity
  async searchSimilar(query: string, limit: number = 10, threshold: number = 0.7): Promise<SearchResult[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    const results: SearchResult[] = [];

    for (const embedding of this.embeddings.values()) {
      const similarity = this.cosineSimilarity(queryEmbedding, embedding.vector);

      if (similarity >= threshold) {
        const relevance = this.calculateRelevance(embedding, similarity);
        results.push({
          embedding,
          similarity,
          relevance
        });
      }
    }

    // Sort by relevance score (combination of similarity and recency)
    results.sort((a, b) => b.relevance - a.relevance);
    return results.slice(0, limit);
  }

  // Search memories by agent
  async searchByAgent(agentId: string, limit: number = 50): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    for (const embedding of this.embeddings.values()) {
      if (embedding.agentId === agentId) {
        results.push({
          embedding,
          similarity: 1.0,
          relevance: this.calculateRelevance(embedding, 1.0)
        });
      }
    }

    results.sort((a, b) => b.relevance - a.relevance);
    return results.slice(0, limit);
  }

  // Search memories by tags
  async searchByTags(tags: string[], limit: number = 20): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    for (const embedding of this.embeddings.values()) {
      const tagMatches = tags.filter(tag => embedding.tags.includes(tag)).length;
      if (tagMatches > 0) {
        const similarity = tagMatches / tags.length;
        results.push({
          embedding,
          similarity,
          relevance: this.calculateRelevance(embedding, similarity)
        });
      }
    }

    results.sort((a, b) => b.relevance - a.relevance);
    return results.slice(0, limit);
  }

  // Find related memories using clustering
  async findRelatedMemories(memoryId: string, limit: number = 5): Promise<SearchResult[]> {
    const embedding = this.embeddings.get(memoryId);
    if (!embedding) return [];

    // Find cluster containing this memory
    const cluster = this.findClusterForMemory(memoryId);
    if (!cluster) {
      // Fallback to similarity search
      const queryText = this.extractTextFromMemory(embedding.metadata);
      return await this.searchSimilar(queryText, limit);
    }

    // Return other memories from the same cluster
    const results: SearchResult[] = [];
    for (const member of cluster.members) {
      if (member.id !== memoryId) {
        const similarity = this.cosineSimilarity(embedding.vector, member.vector);
        results.push({
          embedding: member,
          similarity,
          relevance: this.calculateRelevance(member, similarity)
        });
      }
    }

    results.sort((a, b) => b.relevance - a.relevance);
    return results.slice(0, limit);
  }

  // Get insights from memory clusters
  async getMemoryClusters(): Promise<MemoryCluster[]> {
    return Array.from(this.clusters.values());
  }

  // Get knowledge graph for visualization
  getKnowledgeGraph(): KnowledgeGraph {
    return this.knowledgeGraph;
  }

  // Cross-agent knowledge sharing
  async shareKnowledgeAcrossAgents(sourceAgentId: string, targetAgentIds: string[], topic: string): Promise<SearchResult[]> {
    // Find relevant memories from source agent
    const sourceMemories = await this.searchByAgent(sourceAgentId);
    const topicMemories = sourceMemories.filter(result =>
      this.extractTextFromMemory(result.embedding.metadata).toLowerCase().includes(topic.toLowerCase())
    );

    // Create knowledge sharing entries for target agents
    const sharedKnowledge: SearchResult[] = [];
    for (const memory of topicMemories.slice(0, 10)) { // Limit to top 10
      for (const targetAgentId of targetAgentIds) {
        const sharedMemory: MemoryEntry = {
          id: `shared-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'insight',
          content: {
            originalAgent: sourceAgentId,
            sharedTopic: topic,
            originalMemory: memory.embedding.metadata.content,
            sharedAt: new Date()
          },
          tags: [...memory.embedding.metadata.tags, 'shared-knowledge', topic],
          relevanceScore: memory.relevance,
          createdAt: new Date(),
          agentId: targetAgentId
        };

        await this.storeMemory(sharedMemory);
        sharedKnowledge.push(memory);
      }
    }

    console.log(`[VectorMemory] Shared ${sharedKnowledge.length} knowledge items from ${sourceAgentId} to ${targetAgentIds.length} agents`);
    return sharedKnowledge;
  }

  // Memory consolidation and cleanup
  async consolidateMemories(): Promise<void> {
    console.log('[VectorMemory] Starting memory consolidation...');

    // Group similar memories
    const consolidationGroups: VectorEmbedding[][] = [];
    const processed = new Set<string>();

    for (const embedding of this.embeddings.values()) {
      if (processed.has(embedding.id)) continue;

      const similarMemories = [embedding];
      processed.add(embedding.id);

      for (const other of this.embeddings.values()) {
        if (processed.has(other.id)) continue;

        const similarity = this.cosineSimilarity(embedding.vector, other.vector);
        if (similarity > 0.95) { // Very high similarity threshold for consolidation
          similarMemories.push(other);
          processed.add(other.id);
        }
      }

      if (similarMemories.length > 1) {
        consolidationGroups.push(similarMemories);
      }
    }

    // Consolidate each group into a single enhanced memory
    for (const group of consolidationGroups) {
      await this.consolidateGroup(group);
    }

    console.log(`[VectorMemory] Consolidated ${consolidationGroups.length} memory groups`);
  }

  // Private helper methods
  private extractTextFromMemory(memory: MemoryEntry): string {
    const parts: string[] = [];

    if (typeof memory.content === 'string') {
      parts.push(memory.content);
    } else if (typeof memory.content === 'object') {
      parts.push(JSON.stringify(memory.content));
    }

    parts.push(...memory.tags);
    parts.push(memory.type);

    return parts.join(' ').toLowerCase();
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  private calculateRelevance(embedding: VectorEmbedding, similarity: number): number {
    const recencyWeight = 0.3;
    const similarityWeight = 0.7;

    // Calculate recency score (newer memories are more relevant)
    const ageInHours = (Date.now() - embedding.timestamp.getTime()) / (1000 * 60 * 60);
    const recencyScore = Math.exp(-ageInHours / 24); // Decay over 24 hours

    return (similarity * similarityWeight) + (recencyScore * recencyWeight);
  }

  private async updateKnowledgeGraph(embedding: VectorEmbedding): Promise<void> {
    // Create knowledge node
    const node: KnowledgeNode = {
      id: embedding.id,
      type: embedding.metadata.type as any,
      content: embedding.metadata.content,
      embedding: embedding.vector,
      connections: [],
      importance: embedding.metadata.relevanceScore
    };

    this.knowledgeGraph.nodes.push(node);

    // Find connections to other nodes
    for (const existingNode of this.knowledgeGraph.nodes) {
      if (existingNode.id === node.id) continue;

      const similarity = this.cosineSimilarity(node.embedding, existingNode.embedding);
      if (similarity > 0.8) {
        // Create edge
        const edge: KnowledgeEdge = {
          from: node.id,
          to: existingNode.id,
          weight: similarity,
          type: 'similarity',
          metadata: { similarity, timestamp: new Date() }
        };

        this.knowledgeGraph.edges.push(edge);
        node.connections.push(existingNode.id);
        existingNode.connections.push(node.id);
      }
    }
  }

  private async performClustering(): Promise<void> {
    if (this.embeddings.size < 10) return; // Not enough data for clustering

    // Simple K-means clustering simulation
    const embeddings = Array.from(this.embeddings.values());
    const numClusters = Math.min(Math.floor(embeddings.length / 5), 20);

    // Initialize cluster centroids randomly
    const centroids: number[][] = [];
    for (let i = 0; i < numClusters; i++) {
      const randomEmbedding = embeddings[Math.floor(Math.random() * embeddings.length)];
      centroids.push([...randomEmbedding.vector]);
    }

    // Assign embeddings to clusters
    const clusterAssignments: Map<string, number> = new Map();

    for (const embedding of embeddings) {
      let bestCluster = 0;
      let bestSimilarity = -1;

      for (let i = 0; i < centroids.length; i++) {
        const similarity = this.cosineSimilarity(embedding.vector, centroids[i]);
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestCluster = i;
        }
      }

      clusterAssignments.set(embedding.id, bestCluster);
    }

    // Create cluster objects
    this.clusters.clear();
    for (let i = 0; i < numClusters; i++) {
      const clusterMembers = embeddings.filter(e => clusterAssignments.get(e.id) === i);

      if (clusterMembers.length > 0) {
        const cluster: MemoryCluster = {
          id: `cluster-${i}`,
          centroid: centroids[i],
          members: clusterMembers,
          topic: this.generateClusterTopic(clusterMembers),
          createdAt: new Date(),
          lastUpdated: new Date()
        };

        this.clusters.set(cluster.id, cluster);
      }
    }

    console.log(`[VectorMemory] Created ${this.clusters.size} memory clusters`);
  }

  private generateClusterTopic(members: VectorEmbedding[]): string {
    // Extract common tags and content themes
    const tagFrequency: Map<string, number> = new Map();

    for (const member of members) {
      for (const tag of member.tags) {
        tagFrequency.set(tag, (tagFrequency.get(tag) || 0) + 1);
      }
    }

    // Find most common tags
    const sortedTags = Array.from(tagFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tag]) => tag);

    return sortedTags.join(', ') || 'general';
  }

  private findClusterForMemory(memoryId: string): MemoryCluster | null {
    for (const cluster of this.clusters.values()) {
      if (cluster.members.some(member => member.id === memoryId)) {
        return cluster;
      }
    }
    return null;
  }

  private async consolidateGroup(group: VectorEmbedding[]): Promise<void> {
    if (group.length <= 1) return;

    // Create consolidated memory entry
    const consolidatedContent = {
      type: 'consolidated',
      originalMemories: group.map(e => e.metadata),
      consolidatedAt: new Date(),
      commonThemes: this.extractCommonThemes(group),
      keyInsights: this.extractKeyInsights(group)
    };

    const consolidatedMemory: MemoryEntry = {
      id: `consolidated-${Date.now()}`,
      type: 'insight',
      content: consolidatedContent,
      tags: [...new Set(group.flatMap(e => e.tags)), 'consolidated'],
      relevanceScore: Math.max(...group.map(e => e.metadata.relevanceScore)),
      createdAt: new Date(),
      agentId: 'system'
    };

    // Store consolidated memory
    await this.storeMemory(consolidatedMemory);

    // Remove original memories
    for (const embedding of group) {
      this.embeddings.delete(embedding.id);
    }
  }

  private extractCommonThemes(group: VectorEmbedding[]): string[] {
    const allTags = group.flatMap(e => e.tags);
    const tagFrequency: Map<string, number> = new Map();

    for (const tag of allTags) {
      tagFrequency.set(tag, (tagFrequency.get(tag) || 0) + 1);
    }

    return Array.from(tagFrequency.entries())
      .filter(([, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);
  }

  private extractKeyInsights(group: VectorEmbedding[]): string[] {
    // Extract key insights from the group of memories
    const insights: string[] = [];

    for (const embedding of group) {
      if (embedding.metadata.type === 'insight' || embedding.metadata.type === 'decision') {
        const content = embedding.metadata.content;
        if (typeof content === 'object' && content.insight) {
          insights.push(content.insight);
        } else if (typeof content === 'string') {
          insights.push(content);
        }
      }
    }

    return insights.slice(0, 3); // Top 3 insights
  }

  private async cleanupOldMemories(): Promise<void> {
    if (this.embeddings.size <= this.maxMemorySize) return;

    // Sort by relevance and keep only the most relevant memories
    const sortedEmbeddings = Array.from(this.embeddings.values())
      .sort((a, b) => this.calculateRelevance(b, 1) - this.calculateRelevance(a, 1));

    // Remove least relevant memories
    const toRemove = sortedEmbeddings.slice(this.maxMemorySize);
    for (const embedding of toRemove) {
      this.embeddings.delete(embedding.id);
    }

    console.log(`[VectorMemory] Cleaned up ${toRemove.length} old memories`);
  }

  // Analytics and insights
  getMemoryStats(): any {
    const agentMemoryCounts: Map<string, number> = new Map();
    const tagCounts: Map<string, number> = new Map();

    for (const embedding of this.embeddings.values()) {
      agentMemoryCounts.set(
        embedding.agentId,
        (agentMemoryCounts.get(embedding.agentId) || 0) + 1
      );

      for (const tag of embedding.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }

    return {
      totalMemories: this.embeddings.size,
      totalClusters: this.clusters.size,
      agentDistribution: Object.fromEntries(agentMemoryCounts),
      topTags: Array.from(tagCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
      knowledgeGraphStats: {
        nodes: this.knowledgeGraph.nodes.length,
        edges: this.knowledgeGraph.edges.length,
        avgConnections: this.knowledgeGraph.nodes.reduce((sum, node) => sum + node.connections.length, 0) / this.knowledgeGraph.nodes.length
      }
    };
  }
}
