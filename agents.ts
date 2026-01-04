export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedAgent: string;
  dependencies: string[];
  createdAt: Date;
  updatedAt: Date;
  estimatedDuration?: number;
  actualDuration?: number;
  result?: any;
  errors?: string[];
}

export interface AgentCapability {
  name: string;
  description: string;
  category: string;
  confidence: number; // 0-1
}

export interface AgentStatus {
  isActive: boolean;
  currentTask?: string;
  lastHeartbeat: Date;
  workload: number; // 0-1 scale
  availableCapabilities: AgentCapability[];
}

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  description: string;
  capabilities: AgentCapability[];
  status: AgentStatus;
  configuration: Record<string, any>;
  metrics: AgentMetrics;
}

export interface AgentMetrics {
  tasksCompleted: number;
  tasksInProgress: number;
  averageCompletionTime: number;
  successRate: number;
  lastActiveTime: Date;
  totalUptime: number;
}

export interface BusinessProject {
  id: string;
  name: string;
  description: string;
  businessModel: BusinessModel;
  status: 'planning' | 'development' | 'testing' | 'deployment' | 'live' | 'maintenance';
  createdAt: Date;
  targetLaunchDate?: Date;
  budget?: number;
  team: string[]; // agent IDs
  milestones: Milestone[];
  risks: Risk[];
}

export interface BusinessModel {
  type: 'subscription' | 'marketplace' | 'advertising' | 'freemium' | 'one-time';
  revenueStreams: string[];
  targetMarket: string;
  valueProposition: string;
  keyFeatures: string[];
  complianceRequirements: string[];
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  targetDate: Date;
  status: 'pending' | 'in-progress' | 'completed' | 'delayed';
  tasks: string[]; // task IDs
  dependencies: string[];
}

export interface Risk {
  id: string;
  title: string;
  description: string;
  category: 'technical' | 'legal' | 'market' | 'financial' | 'operational';
  probability: number; // 0-1
  impact: number; // 0-1
  mitigation: string;
  status: 'identified' | 'mitigated' | 'resolved' | 'accepted';
}

export interface MemoryEntry {
  id: string;
  type: 'task' | 'decision' | 'insight' | 'error' | 'feedback';
  content: any;
  tags: string[];
  relevanceScore: number;
  createdAt: Date;
  agentId: string;
  projectId?: string;
}

export interface CommunicationMessage {
  id: string;
  fromAgent: string;
  toAgent: string | 'broadcast';
  type: 'task_assignment' | 'status_update' | 'question' | 'collaboration' | 'error_report';
  content: any;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  requiresResponse: boolean;
}

export type AgentRole =
  | 'executive'
  | 'engineer'
  | 'designer'
  | 'app-developer'
  | 'devops'
  | 'legal'
  | 'marketing'
  | 'testing'
  | 'data-analyst'
  | 'security';

export interface AgentAction {
  id: string;
  type: string;
  parameters: Record<string, any>;
  result?: any;
  error?: string;
  timestamp: Date;
  duration?: number;
}

export interface ComplianceCheck {
  id: string;
  type: 'content' | 'age_verification' | 'privacy' | 'data_protection' | 'payment';
  status: 'pending' | 'passed' | 'failed' | 'requires_review';
  details: string;
  region: string;
  checkedAt: Date;
  checkedBy: string;
}

export interface DeploymentEnvironment {
  id: string;
  name: string;
  type: 'development' | 'staging' | 'production';
  url?: string;
  status: 'active' | 'inactive' | 'deploying' | 'failed';
  lastDeployment?: Date;
  version?: string;
  health: {
    uptime: number;
    responseTime: number;
    errorRate: number;
  };
}

export interface TechStack {
  frontend: string[];
  backend: string[];
  database: string[];
  infrastructure: string[];
  thirdPartyServices: string[];
  paymentProcessors: string[];
}

export interface MarketingCampaign {
  id: string;
  name: string;
  type: 'seo' | 'social' | 'email' | 'influencer' | 'paid_ads';
  status: 'draft' | 'active' | 'paused' | 'completed';
  budget: number;
  targetAudience: string;
  metrics: {
    reach: number;
    engagement: number;
    conversions: number;
    roi: number;
  };
  startDate: Date;
  endDate?: Date;
}

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  tests: TestCase[];
  configuration: any;
}

export interface TestResult {
  suite: string;
  tests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage?: number;
}

export interface TestCase {
  id: string;
  name: string;
  description: string;
  input: any;
  expectedOutput: any;
}

export interface PerformanceMetrics {
  responseTime: {
    average: number;
    p50: number;
    p90: number;
    p95: number;
    p99: number;
    max: number;
  };
  throughput: {
    requestsPerSecond: number;
    peakRPS: number;
    sustainedRPS: number;
  };
  resourceUtilization: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
  loadTesting?: {
    concurrent_users: number;
    duration_minutes: number;
    ramp_up_time: number;
    success_rate: number;
    error_rate: number;
  };
  stressTesting?: {
    breaking_point: number;
    recovery_time: number;
    stability_rating: number;
  };
  webVitals?: {
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    firstInputDelay: number;
    cumulativeLayoutShift: number;
    timeToInteractive: number;
  };
}
