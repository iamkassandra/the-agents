import { MemoryEntry } from '@/types/agents';

export interface VectorEntry {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    agentId: string;
    timestamp: Date;
    type: 'experience' | 'knowledge' | 'decision' | 'skill' | 'pattern';
    tags: string[];
    importance: number; // 0-1 scale
    context: string;
    relationships: string[]; // IDs of related entries
  };
  accessCount: number;
  lastAccessed: Date;
  relevanceScore: number;
}

export interface MemoryCluster {
  id: string;
  centroid: number[];
  entries: string[]; // Entry IDs
  theme: string;
  coherenceScore: number;
  lastUpdated: Date;
}

export interface KnowledgeGraph {
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge>;
  communities: Map<string, Community>;
}

export interface GraphNode {
  id: string;
  type: 'concept' | 'agent' | 'task' | 'skill' | 'decision';
  properties: Record<string, any>;
  embedding: number[];
  connections: string[]; // Edge IDs
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'related_to' | 'learned_from' | 'depends_on' | 'improves' | 'conflicts_with';
  weight: number;
  confidence: number;
  metadata: Record<string, any>;
}

export interface Community {
  id: string;
  nodes: string[];
  topic: string;
  coherence: number;
  importance: number;
}

export interface SearchResult {
  entry: VectorEntry;
  similarity: number;
  explanation: string;
  relatedEntries: VectorEntry[];
}

export interface MemoryConsolidation {
  clustersFormed: number;
  patternsIdentified: string[];
  obsoleteEntriesRemoved: number;
  knowledgeGraphUpdated: boolean;
  insights: string[];
}

export class VectorMemorySystem {
  private vectors: Map<string, VectorEntry> = new Map();
  private clusters: Map<string, MemoryCluster> = new Map();
  private knowledgeGraph: KnowledgeGraph;
  private embeddingDimension: number = 384; // Sentence-BERT embedding size
  private consolidationThreshold: number = 1000; // Trigger consolidation after N entries
  private maxMemorySize: number = 50000; // Maximum number of entries
  private isConsolidating: boolean = false;

  constructor() {
    this.knowledgeGraph = {
      nodes: new Map(),
      edges: new Map(),
      communities: new Map()
    };

    // Start periodic consolidation
    this.startConsolidationCycle();
  }

  // Core Memory Operations
  async storeMemory(memoryEntry: MemoryEntry, agentId: string): Promise<string> {
    console.log(`[VectorMemory] Storing memory from agent: ${agentId}`);

    const embedding = await this.generateEmbedding(memoryEntry.content);

    const vectorEntry: VectorEntry = {
      id: `vector-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: this.extractTextContent(memoryEntry.content),
      embedding,
      metadata: {
        agentId,
        timestamp: memoryEntry.createdAt,
        type: this.categorizeMemoryType(memoryEntry),
        tags: memoryEntry.tags,
        importance: memoryEntry.relevanceScore,
        context: this.extractContext(memoryEntry),
        relationships: []
      },
      accessCount: 0,
      lastAccessed: new Date(),
      relevanceScore: memoryEntry.relevanceScore
    };

    // Find related memories
    const relatedMemories = await this.findSimilarMemories(embedding, 5, 0.7);
    vectorEntry.metadata.relationships = relatedMemories.map(r => r.entry.id);

    // Store in vector space
    this.vectors.set(vectorEntry.id, vectorEntry);

    // Update knowledge graph
    await this.updateKnowledgeGraph(vectorEntry);

    // Check if consolidation is needed
    if (this.vectors.size > this.consolidationThreshold && !this.isConsolidating) {
      this.scheduleConsolidation();
    }

    return vectorEntry.id;
  }

  async searchMemories(query: string, agentId?: string, limit: number = 10): Promise<SearchResult[]> {
    console.log(`[VectorMemory] Searching memories for: ${query}`);

    const queryEmbedding = await this.generateEmbedding(query);
    const similarities = new Map<string, number>();

    // Calculate similarities
    for (const [id, entry] of this.vectors.entries()) {
      // Filter by agent if specified
      if (agentId && entry.metadata.agentId !== agentId) continue;

      const similarity = this.cosineSimilarity(queryEmbedding, entry.embedding);
      similarities.set(id, similarity);
    }

    // Sort by similarity and get top results
    const sortedResults = Array.from(similarities.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    const searchResults: SearchResult[] = [];

    for (const [id, similarity] of sortedResults) {
      const entry = this.vectors.get(id)!;

      // Update access tracking
      entry.accessCount++;
      entry.lastAccessed = new Date();

      // Find related entries
      const relatedEntries = await this.getRelatedEntries(entry, 3);

      searchResults.push({
        entry,
        similarity,
        explanation: this.generateExplanation(query, entry, similarity),
        relatedEntries
      });
    }

    return searchResults;
  }

  async shareKnowledge(fromAgentId: string, toAgentId: string, topic: string): Promise<VectorEntry[]> {
    console.log(`[VectorMemory] Sharing knowledge from ${fromAgentId} to ${toAgentId} on topic: ${topic}`);

    // Find relevant memories from source agent
    const relevantMemories = await this.searchMemories(topic, fromAgentId, 20);

    // Filter high-quality, transferable knowledge
    const transferableKnowledge = relevantMemories
      .filter(result =>
        result.similarity > 0.6 &&
        result.entry.metadata.importance > 0.7 &&
        this.isTransferable(result.entry, toAgentId)
      )
      .map(result => result.entry);

    // Create knowledge transfer entries for target agent
    const transferEntries: VectorEntry[] = [];

    for (const sourceEntry of transferableKnowledge) {
      const transferEntry: VectorEntry = {
        id: `transfer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        content: this.adaptKnowledgeForAgent(sourceEntry.content, toAgentId),
        embedding: [...sourceEntry.embedding], // Copy embedding
        metadata: {
          agentId: toAgentId,
          timestamp: new Date(),
          type: 'knowledge',
          tags: [...sourceEntry.metadata.tags, 'transferred_knowledge'],
          importance: sourceEntry.metadata.importance * 0.8, // Slightly reduce importance
          context: `Transferred from ${fromAgentId}: ${sourceEntry.metadata.context}`,
          relationships: [sourceEntry.id]
        },
        accessCount: 0,
        lastAccessed: new Date(),
        relevanceScore: sourceEntry.relevanceScore * 0.8
      };

      this.vectors.set(transferEntry.id, transferEntry);
      transferEntries.push(transferEntry);

      // Create bidirectional relationship
      sourceEntry.metadata.relationships.push(transferEntry.id);
    }

    return transferEntries;
  }

  async learnPattern(entries: VectorEntry[], patternName: string): Promise<VectorEntry> {
    console.log(`[VectorMemory] Learning pattern: ${patternName}`);

    // Analyze entries to extract pattern
    const pattern = await this.extractPattern(entries, patternName);

    // Create pattern embedding by averaging related entries
    const patternEmbedding = this.averageEmbeddings(entries.map(e => e.embedding));

    const patternEntry: VectorEntry = {
      id: `pattern-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: pattern.description,
      embedding: patternEmbedding,
      metadata: {
        agentId: 'system',
        timestamp: new Date(),
        type: 'pattern',
        tags: ['learned_pattern', patternName, ...pattern.tags],
        importance: pattern.importance,
        context: `Pattern learned from ${entries.length} experiences`,
        relationships: entries.map(e => e.id)
      },
      accessCount: 0,
      lastAccessed: new Date(),
      relevanceScore: pattern.importance
    };

    this.vectors.set(patternEntry.id, patternEntry);

    // Update relationships
    for (const entry of entries) {
      entry.metadata.relationships.push(patternEntry.id);
    }

    return patternEntry;
  }

  // Memory Consolidation and Management
  async consolidateMemories(): Promise<MemoryConsolidation> {
    if (this.isConsolidating) {
      console.log(`[VectorMemory] Consolidation already in progress`);
      return this.getLastConsolidationResult();
    }

    this.isConsolidating = true;
    console.log(`[VectorMemory] Starting memory consolidation`);

    try {
      const result: MemoryConsolidation = {
        clustersFormed: 0,
        patternsIdentified: [],
        obsoleteEntriesRemoved: 0,
        knowledgeGraphUpdated: false,
        insights: []
      };

      // 1. Form semantic clusters
      const clusters = await this.formSemanticClusters();
      result.clustersFormed = clusters.length;

      // 2. Identify patterns within clusters
      for (const cluster of clusters) {
        const patterns = await this.identifyClusterPatterns(cluster);
        result.patternsIdentified.push(...patterns);
      }

      // 3. Remove obsolete entries
      const obsoleteCount = await this.removeObsoleteEntries();
      result.obsoleteEntriesRemoved = obsoleteCount;

      // 4. Update knowledge graph
      await this.updateKnowledgeGraphStructure();
      result.knowledgeGraphUpdated = true;

      // 5. Generate insights
      result.insights = await this.generateInsights();

      console.log(`[VectorMemory] Consolidation complete:`, result);
      return result;

    } finally {
      this.isConsolidating = false;
    }
  }

  // Knowledge Graph Operations
  async getKnowledgeGraph(): Promise<KnowledgeGraph> {
    return {
      nodes: new Map(this.knowledgeGraph.nodes),
      edges: new Map(this.knowledgeGraph.edges),
      communities: new Map(this.knowledgeGraph.communities)
    };
  }

  async findKnowledgePaths(sourceId: string, targetId: string): Promise<string[][]> {
    // Find paths between two knowledge nodes
    return this.findShortestPaths(sourceId, targetId, 3); // Max 3 hops
  }

  async getAgentExpertise(agentId: string): Promise<Map<string, number>> {
    const agentMemories = Array.from(this.vectors.values())
      .filter(entry => entry.metadata.agentId === agentId);

    const expertise = new Map<string, number>();

    for (const memory of agentMemories) {
      for (const tag of memory.metadata.tags) {
        const current = expertise.get(tag) || 0;
        expertise.set(tag, current + memory.metadata.importance);
      }
    }

    // Normalize scores
    const maxScore = Math.max(...expertise.values());
    for (const [tag, score] of expertise.entries()) {
      expertise.set(tag, score / maxScore);
    }

    return expertise;
  }

  // Utility Methods
  private async generateEmbedding(text: string): Promise<number[]> {
    // In a real implementation, this would use a model like Sentence-BERT
    // For now, we'll create a simple hash-based embedding
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Array(this.embeddingDimension).fill(0);

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const hash = this.simpleHash(word);

      for (let j = 0; j < this.embeddingDimension; j++) {
        embedding[j] += Math.sin(hash + j) * Math.cos(hash * 2 + j);
      }
    }

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private averageEmbeddings(embeddings: number[][]): number[] {
    const result = new Array(this.embeddingDimension).fill(0);

    for (const embedding of embeddings) {
      for (let i = 0; i < embedding.length; i++) {
        result[i] += embedding[i];
      }
    }

    return result.map(val => val / embeddings.length);
  }

  private extractTextContent(content: any): string {
    if (typeof content === 'string') return content;
    if (typeof content === 'object') {
      return JSON.stringify(content, null, 2);
    }
    return String(content);
  }

  private categorizeMemoryType(entry: MemoryEntry): 'experience' | 'knowledge' | 'decision' | 'skill' | 'pattern' {
    if (entry.type === 'decision') return 'decision';
    if (entry.type === 'task') return 'experience';
    if (entry.tags.includes('skill') || entry.tags.includes('capability')) return 'skill';
    if (entry.tags.includes('pattern') || entry.tags.includes('strategy')) return 'pattern';
    return 'knowledge';
  }

  private extractContext(entry: MemoryEntry): string {
    const context = [
      `Agent: ${entry.agentId}`,
      `Type: ${entry.type}`,
      `Tags: ${entry.tags.join(', ')}`
    ];

    if (typeof entry.content === 'object' && entry.content.context) {
      context.push(`Context: ${entry.content.context}`);
    }

    return context.join(' | ');
  }

  private async findSimilarMemories(embedding: number[], limit: number, threshold: number): Promise<SearchResult[]> {
    const similarities: Array<{ entry: VectorEntry; similarity: number }> = [];

    for (const entry of this.vectors.values()) {
      const similarity = this.cosineSimilarity(embedding, entry.embedding);
      if (similarity >= threshold) {
        similarities.push({ entry, similarity });
      }
    }

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(({ entry, similarity }) => ({
        entry,
        similarity,
        explanation: `${Math.round(similarity * 100)}% similarity`,
        relatedEntries: []
      }));
  }

  private async getRelatedEntries(entry: VectorEntry, limit: number): Promise<VectorEntry[]> {
    const related: VectorEntry[] = [];

    for (const relationId of entry.metadata.relationships) {
      const relatedEntry = this.vectors.get(relationId);
      if (relatedEntry && related.length < limit) {
        related.push(relatedEntry);
      }
    }

    return related;
  }

  private generateExplanation(query: string, entry: VectorEntry, similarity: number): string {
    const reasons: string[] = [];

    if (similarity > 0.9) {
      reasons.push('Very high semantic similarity');
    } else if (similarity > 0.7) {
      reasons.push('High semantic similarity');
    } else if (similarity > 0.5) {
      reasons.push('Moderate semantic similarity');
    }

    if (entry.metadata.importance > 0.8) {
      reasons.push('High importance score');
    }

    if (entry.accessCount > 10) {
      reasons.push('Frequently accessed');
    }

    const commonTags = query.toLowerCase().split(' ')
      .filter(word => entry.metadata.tags.some(tag => tag.toLowerCase().includes(word)));

    if (commonTags.length > 0) {
      reasons.push(`Matches tags: ${commonTags.join(', ')}`);
    }

    return reasons.join('; ');
  }

  private isTransferable(entry: VectorEntry, targetAgentId: string): boolean {
    // Knowledge is transferable if it's general enough and not agent-specific
    const nonTransferableTags = ['personal', 'private', 'agent-specific', 'temporary'];
    const hasNonTransferable = entry.metadata.tags.some(tag =>
      nonTransferableTags.includes(tag.toLowerCase())
    );

    return !hasNonTransferable && entry.metadata.importance > 0.5;
  }

  private adaptKnowledgeForAgent(content: string, targetAgentId: string): string {
    // Simple adaptation - in practice this would be more sophisticated
    return `[Adapted for ${targetAgentId}] ${content}`;
  }

  private async extractPattern(entries: VectorEntry[], patternName: string): Promise<{
    description: string;
    importance: number;
    tags: string[];
  }> {
    // Analyze entries to extract common patterns
    const commonTags = this.findCommonTags(entries);
    const avgImportance = entries.reduce((sum, e) => sum + e.metadata.importance, 0) / entries.length;

    return {
      description: `Pattern "${patternName}" identified from ${entries.length} experiences: ${commonTags.join(', ')}`,
      importance: Math.min(avgImportance * 1.2, 1.0), // Boost pattern importance
      tags: ['pattern', patternName, ...commonTags]
    };
  }

  private findCommonTags(entries: VectorEntry[]): string[] {
    const tagCounts = new Map<string, number>();

    for (const entry of entries) {
      for (const tag of entry.metadata.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }

    const threshold = Math.ceil(entries.length * 0.3); // Tag must appear in 30% of entries
    return Array.from(tagCounts.entries())
      .filter(([_, count]) => count >= threshold)
      .map(([tag, _]) => tag);
  }

  private async updateKnowledgeGraph(entry: VectorEntry): Promise<void> {
    // Add node to knowledge graph
    const node: GraphNode = {
      id: entry.id,
      type: this.mapMemoryTypeToNodeType(entry.metadata.type),
      properties: {
        content: entry.content,
        agentId: entry.metadata.agentId,
        tags: entry.metadata.tags,
        importance: entry.metadata.importance
      },
      embedding: entry.embedding,
      connections: []
    };

    this.knowledgeGraph.nodes.set(entry.id, node);

    // Create edges to related entries
    for (const relatedId of entry.metadata.relationships) {
      if (this.knowledgeGraph.nodes.has(relatedId)) {
        const edgeId = `${entry.id}-${relatedId}`;
        const edge: GraphEdge = {
          id: edgeId,
          source: entry.id,
          target: relatedId,
          type: 'related_to',
          weight: 1.0,
          confidence: 0.8,
          metadata: { created: new Date() }
        };

        this.knowledgeGraph.edges.set(edgeId, edge);

        // Update node connections
        node.connections.push(edgeId);
        const targetNode = this.knowledgeGraph.nodes.get(relatedId)!;
        targetNode.connections.push(edgeId);
      }
    }
  }

  private mapMemoryTypeToNodeType(memoryType: string): 'concept' | 'agent' | 'task' | 'skill' | 'decision' {
    switch (memoryType) {
      case 'experience': return 'task';
      case 'skill': return 'skill';
      case 'decision': return 'decision';
      default: return 'concept';
    }
  }

  private async formSemanticClusters(): Promise<MemoryCluster[]> {
    // Simple k-means clustering implementation
    const k = Math.min(Math.ceil(this.vectors.size / 100), 50); // Dynamic cluster count
    const entries = Array.from(this.vectors.values());

    if (entries.length < k) return [];

    // Initialize centroids randomly
    const centroids: number[][] = [];
    for (let i = 0; i < k; i++) {
      const randomEntry = entries[Math.floor(Math.random() * entries.length)];
      centroids.push([...randomEntry.embedding]);
    }

    // Run k-means for a few iterations
    for (let iter = 0; iter < 10; iter++) {
      const clusters: string[][] = Array(k).fill(null).map(() => []);

      // Assign entries to nearest centroid
      for (const entry of entries) {
        let bestCluster = 0;
        let bestSimilarity = -1;

        for (let i = 0; i < k; i++) {
          const similarity = this.cosineSimilarity(entry.embedding, centroids[i]);
          if (similarity > bestSimilarity) {
            bestSimilarity = similarity;
            bestCluster = i;
          }
        }

        clusters[bestCluster].push(entry.id);
      }

      // Update centroids
      for (let i = 0; i < k; i++) {
        if (clusters[i].length > 0) {
          const clusterEmbeddings = clusters[i].map(id => this.vectors.get(id)!.embedding);
          centroids[i] = this.averageEmbeddings(clusterEmbeddings);
        }
      }
    }

    // Create cluster objects
    const memoryClusters: MemoryCluster[] = [];
    for (let i = 0; i < k; i++) {
      const clusterEntries = Array.from(this.vectors.values())
        .filter(entry => {
          const similarity = this.cosineSimilarity(entry.embedding, centroids[i]);
          return similarity > 0.3; // Minimum similarity threshold
        })
        .map(entry => entry.id);

      if (clusterEntries.length > 2) {
        const cluster: MemoryCluster = {
          id: `cluster-${i}-${Date.now()}`,
          centroid: centroids[i],
          entries: clusterEntries,
          theme: this.generateClusterTheme(clusterEntries),
          coherenceScore: this.calculateCoherence(clusterEntries, centroids[i]),
          lastUpdated: new Date()
        };

        memoryClusters.push(cluster);
        this.clusters.set(cluster.id, cluster);
      }
    }

    return memoryClusters;
  }

  private generateClusterTheme(entryIds: string[]): string {
    const entries = entryIds.map(id => this.vectors.get(id)!);
    const allTags = entries.flatMap(e => e.metadata.tags);
    const tagCounts = new Map<string, number>();

    for (const tag of allTags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }

    const topTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tag]) => tag);

    return topTags.join(' + ');
  }

  private calculateCoherence(entryIds: string[], centroid: number[]): number {
    const entries = entryIds.map(id => this.vectors.get(id)!);
    const similarities = entries.map(entry => this.cosineSimilarity(entry.embedding, centroid));
    return similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length;
  }

  private async identifyClusterPatterns(cluster: MemoryCluster): Promise<string[]> {
    const entries = cluster.entries.map(id => this.vectors.get(id)!);
    const patterns: string[] = [];

    // Find common sequences or patterns in the cluster
    const commonTags = this.findCommonTags(entries);
    if (commonTags.length > 2) {
      patterns.push(`Common theme: ${commonTags.join(', ')}`);
    }

    // Look for temporal patterns
    const timeEntries = entries
      .sort((a, b) => a.metadata.timestamp.getTime() - b.metadata.timestamp.getTime());

    if (timeEntries.length > 3) {
      patterns.push(`Sequential learning pattern in ${cluster.theme}`);
    }

    return patterns;
  }

  private async removeObsoleteEntries(): Promise<number> {
    let removedCount = 0;
    const now = new Date();
    const maxAge = 90 * 24 * 60 * 60 * 1000; // 90 days
    const minAccessCount = 1; // Must be accessed at least once

    for (const [id, entry] of this.vectors.entries()) {
      const age = now.getTime() - entry.metadata.timestamp.getTime();
      const isOld = age > maxAge;
      const isUnused = entry.accessCount < minAccessCount;
      const isLowImportance = entry.metadata.importance < 0.3;

      if (isOld && isUnused && isLowImportance) {
        this.vectors.delete(id);
        this.knowledgeGraph.nodes.delete(id);
        removedCount++;
      }
    }

    return removedCount;
  }

  private async updateKnowledgeGraphStructure(): Promise<void> {
    // Remove orphaned edges
    for (const [edgeId, edge] of this.knowledgeGraph.edges.entries()) {
      if (!this.knowledgeGraph.nodes.has(edge.source) ||
          !this.knowledgeGraph.nodes.has(edge.target)) {
        this.knowledgeGraph.edges.delete(edgeId);
      }
    }

    // Update communities using simple community detection
    await this.detectCommunities();
  }

  private async detectCommunities(): Promise<void> {
    // Simple community detection based on node connections
    const visited = new Set<string>();
    const communities = new Map<string, Community>();

    for (const [nodeId, node] of this.knowledgeGraph.nodes.entries()) {
      if (visited.has(nodeId)) continue;

      const community = this.exploreComponent(nodeId, visited);
      if (community.length > 2) {
        const communityId = `community-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const topic = this.generateCommunityTopic(community);

        communities.set(communityId, {
          id: communityId,
          nodes: community,
          topic,
          coherence: this.calculateCommunityCoherence(community),
          importance: this.calculateCommunityImportance(community)
        });
      }
    }

    this.knowledgeGraph.communities = communities;
  }

  private exploreComponent(startNodeId: string, visited: Set<string>): string[] {
    const component: string[] = [];
    const stack = [startNodeId];

    while (stack.length > 0) {
      const nodeId = stack.pop()!;
      if (visited.has(nodeId)) continue;

      visited.add(nodeId);
      component.push(nodeId);

      const node = this.knowledgeGraph.nodes.get(nodeId);
      if (node) {
        for (const edgeId of node.connections) {
          const edge = this.knowledgeGraph.edges.get(edgeId);
          if (edge) {
            const neighbor = edge.source === nodeId ? edge.target : edge.source;
            if (!visited.has(neighbor)) {
              stack.push(neighbor);
            }
          }
        }
      }
    }

    return component;
  }

  private generateCommunityTopic(nodeIds: string[]): string {
    const nodes = nodeIds.map(id => this.knowledgeGraph.nodes.get(id)!);
    const allTags = nodes.flatMap(n => n.properties.tags || []);
    const tagCounts = new Map<string, number>();

    for (const tag of allTags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }

    const topTag = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])[0];

    return topTag ? topTag[0] : 'Mixed Topics';
  }

  private calculateCommunityCoherence(nodeIds: string[]): number {
    // Calculate how well-connected the community is
    const nodes = nodeIds.map(id => this.knowledgeGraph.nodes.get(id)!);
    let totalConnections = 0;
    let internalConnections = 0;

    for (const node of nodes) {
      totalConnections += node.connections.length;

      for (const edgeId of node.connections) {
        const edge = this.knowledgeGraph.edges.get(edgeId)!;
        const neighbor = edge.source === node.id ? edge.target : edge.source;
        if (nodeIds.includes(neighbor)) {
          internalConnections++;
        }
      }
    }

    return totalConnections > 0 ? internalConnections / totalConnections : 0;
  }

  private calculateCommunityImportance(nodeIds: string[]): number {
    const nodes = nodeIds.map(id => this.knowledgeGraph.nodes.get(id)!);
    const avgImportance = nodes.reduce((sum, n) => sum + (n.properties.importance || 0), 0) / nodes.length;
    return avgImportance;
  }

  private async generateInsights(): Promise<string[]> {
    const insights: string[] = [];

    // Memory distribution insights
    const agentDistribution = new Map<string, number>();
    for (const entry of this.vectors.values()) {
      const count = agentDistribution.get(entry.metadata.agentId) || 0;
      agentDistribution.set(entry.metadata.agentId, count + 1);
    }

    const topAgent = Array.from(agentDistribution.entries())
      .sort((a, b) => b[1] - a[1])[0];

    if (topAgent) {
      insights.push(`Most active agent: ${topAgent[0]} with ${topAgent[1]} memories`);
    }

    // Knowledge concentration
    const topicDistribution = new Map<string, number>();
    for (const entry of this.vectors.values()) {
      for (const tag of entry.metadata.tags) {
        const count = topicDistribution.get(tag) || 0;
        topicDistribution.set(tag, count + 1);
      }
    }

    const topTopic = Array.from(topicDistribution.entries())
      .sort((a, b) => b[1] - a[1])[0];

    if (topTopic) {
      insights.push(`Most common topic: ${topTopic[0]} (${topTopic[1]} occurrences)`);
    }

    // Cluster analysis
    if (this.clusters.size > 0) {
      const avgClusterSize = Array.from(this.clusters.values())
        .reduce((sum, c) => sum + c.entries.length, 0) / this.clusters.size;
      insights.push(`Average cluster size: ${Math.round(avgClusterSize)} memories`);
    }

    return insights;
  }

  private findShortestPaths(sourceId: string, targetId: string, maxHops: number): string[][] {
    const paths: string[][] = [];
    const visited = new Set<string>();

    const dfs = (currentId: string, path: string[], hops: number) => {
      if (hops > maxHops) return;
      if (currentId === targetId) {
        paths.push([...path, currentId]);
        return;
      }

      visited.add(currentId);
      const node = this.knowledgeGraph.nodes.get(currentId);

      if (node) {
        for (const edgeId of node.connections) {
          const edge = this.knowledgeGraph.edges.get(edgeId);
          if (edge) {
            const neighbor = edge.source === currentId ? edge.target : edge.source;
            if (!visited.has(neighbor)) {
              dfs(neighbor, [...path, currentId], hops + 1);
            }
          }
        }
      }

      visited.delete(currentId);
    };

    dfs(sourceId, [], 0);
    return paths.slice(0, 10); // Return top 10 paths
  }

  private startConsolidationCycle(): void {
    // Run consolidation every hour
    setInterval(async () => {
      if (this.vectors.size > this.consolidationThreshold) {
        await this.consolidateMemories();
      }
    }, 60 * 60 * 1000); // 1 hour
  }

  private scheduleConsolidation(): void {
    // Schedule consolidation for next tick to avoid blocking
    setTimeout(() => this.consolidateMemories(), 0);
  }

  private getLastConsolidationResult(): MemoryConsolidation {
    return {
      clustersFormed: this.clusters.size,
      patternsIdentified: [],
      obsoleteEntriesRemoved: 0,
      knowledgeGraphUpdated: false,
      insights: ['Consolidation in progress...']
    };
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  // Public API for system status
  getMemoryStats(): {
    totalEntries: number;
    totalClusters: number;
    knowledgeGraphNodes: number;
    knowledgeGraphEdges: number;
    communities: number;
    isConsolidating: boolean;
  } {
    return {
      totalEntries: this.vectors.size,
      totalClusters: this.clusters.size,
      knowledgeGraphNodes: this.knowledgeGraph.nodes.size,
      knowledgeGraphEdges: this.knowledgeGraph.edges.size,
      communities: this.knowledgeGraph.communities.size,
      isConsolidating: this.isConsolidating
    };
  }

  async exportMemories(agentId?: string): Promise<VectorEntry[]> {
    const entries = Array.from(this.vectors.values());
    return agentId
      ? entries.filter(entry => entry.metadata.agentId === agentId)
      : entries;
  }

  async importMemories(entries: VectorEntry[]): Promise<number> {
    let imported = 0;
    for (const entry of entries) {
      if (!this.vectors.has(entry.id)) {
        this.vectors.set(entry.id, entry);
        await this.updateKnowledgeGraph(entry);
        imported++;
      }
    }
    return imported;
  }
}
