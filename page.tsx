"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Agent, Task, BusinessProject, AgentRole } from '@/types/agents';
import Link from 'next/link';
import {
  Clock,
  Users,
  Brain,
  Zap,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Activity,
  Rocket,
  FileText,
  Code,
  TestTube,
  Database
} from 'lucide-react';

// Mock data for demonstration
const mockAgents: Agent[] = [
  {
    id: 'executive-001',
    name: 'Executive AI',
    role: 'executive',
    description: 'Strategic planning and orchestration',
    capabilities: [
      { name: 'Business Planning', description: 'Creates comprehensive business strategies', category: 'Strategy', confidence: 0.95 },
      { name: 'Task Orchestration', description: 'Coordinates team activities', category: 'Management', confidence: 0.92 },
      { name: 'Risk Assessment', description: 'Identifies and mitigates project risks', category: 'Analysis', confidence: 0.88 }
    ],
    status: {
      isActive: true,
      currentTask: 'project-planning-001',
      lastHeartbeat: new Date(),
      workload: 0.7,
      availableCapabilities: []
    },
    configuration: {},
    metrics: {
      tasksCompleted: 47,
      tasksInProgress: 3,
      averageCompletionTime: 2.4,
      successRate: 0.94,
      lastActiveTime: new Date(),
      totalUptime: 156.7
    }
  },
  {
    id: 'engineer-001',
    name: 'Full-Stack Engineer AI',
    role: 'engineer',
    description: 'Full-stack development and API creation',
    capabilities: [
      { name: 'Frontend Development', description: 'React, Vue, Svelte development', category: 'Development', confidence: 0.91 },
      { name: 'Backend Development', description: 'Node.js, Python, database design', category: 'Development', confidence: 0.89 },
      { name: 'API Design', description: 'REST and GraphQL APIs', category: 'Development', confidence: 0.93 },
      { name: 'Database Architecture', description: 'SQL and NoSQL database design', category: 'Development', confidence: 0.87 }
    ],
    status: {
      isActive: true,
      currentTask: 'backend-api-001',
      lastHeartbeat: new Date(),
      workload: 0.85,
      availableCapabilities: []
    },
    configuration: {},
    metrics: {
      tasksCompleted: 82,
      tasksInProgress: 2,
      averageCompletionTime: 4.1,
      successRate: 0.87,
      lastActiveTime: new Date(),
      totalUptime: 203.5
    }
  },
  {
    id: 'designer-001',
    name: 'UI/UX Designer AI',
    role: 'designer',
    description: 'User experience and visual design',
    capabilities: [
      { name: 'UI Design', description: 'Creates beautiful user interfaces', category: 'Design', confidence: 0.88 },
      { name: 'UX Research', description: 'User flow and experience optimization', category: 'Research', confidence: 0.85 },
      { name: 'Branding', description: 'Logo and brand identity creation', category: 'Design', confidence: 0.90 },
      { name: 'Responsive Design', description: 'Mobile-first responsive layouts', category: 'Design', confidence: 0.92 }
    ],
    status: {
      isActive: true,
      currentTask: 'brand-identity-001',
      lastHeartbeat: new Date(),
      workload: 0.6,
      availableCapabilities: []
    },
    configuration: {},
    metrics: {
      tasksCompleted: 63,
      tasksInProgress: 2,
      averageCompletionTime: 3.2,
      successRate: 0.91,
      lastActiveTime: new Date(),
      totalUptime: 178.3
    }
  },
  {
    id: 'legal-001',
    name: 'Legal & Compliance AI',
    role: 'legal',
    description: 'Legal compliance and regulatory oversight',
    capabilities: [
      { name: 'GDPR Compliance', description: 'European data protection compliance', category: 'Legal', confidence: 0.94 },
      { name: 'Content Moderation', description: 'Automated content policy enforcement', category: 'Compliance', confidence: 0.88 },
      { name: 'Age Verification', description: 'Legal age verification systems', category: 'Compliance', confidence: 0.92 },
      { name: '2257 Compliance', description: 'US adult content record keeping', category: 'Legal', confidence: 0.89 }
    ],
    status: {
      isActive: true,
      currentTask: 'compliance-audit-001',
      lastHeartbeat: new Date(),
      workload: 0.8,
      availableCapabilities: []
    },
    configuration: {},
    metrics: {
      tasksCompleted: 28,
      tasksInProgress: 3,
      averageCompletionTime: 2.1,
      successRate: 0.98,
      lastActiveTime: new Date(),
      totalUptime: 98.7
    }
  },
  {
    id: 'marketing-001',
    name: 'Marketing Strategist AI',
    role: 'marketing',
    description: 'Digital marketing and growth strategies',
    capabilities: [
      { name: 'SEO Optimization', description: 'Search engine optimization strategies', category: 'Marketing', confidence: 0.86 },
      { name: 'Content Creation', description: 'Marketing content and campaigns', category: 'Content', confidence: 0.83 },
      { name: 'Launch Strategy', description: 'Product and service launch planning', category: 'Strategy', confidence: 0.85 },
      { name: 'Analytics & Reporting', description: 'Marketing performance analysis', category: 'Analytics', confidence: 0.88 }
    ],
    status: {
      isActive: true,
      currentTask: 'seo-strategy-001',
      lastHeartbeat: new Date(),
      workload: 0.5,
      availableCapabilities: []
    },
    configuration: {},
    metrics: {
      tasksCompleted: 41,
      tasksInProgress: 2,
      averageCompletionTime: 3.7,
      successRate: 0.85,
      lastActiveTime: new Date(),
      totalUptime: 167.2
    }
  },
  {
    id: 'devops-001',
    name: 'DevOps Engineer AI',
    role: 'devops',
    description: 'Infrastructure and deployment automation',
    capabilities: [
      { name: 'CI/CD Pipelines', description: 'Automated build and deployment', category: 'Infrastructure', confidence: 0.92 },
      { name: 'Cloud Infrastructure', description: 'AWS, GCP, Azure management', category: 'Infrastructure', confidence: 0.87 },
      { name: 'Monitoring & Alerting', description: 'System health and performance tracking', category: 'Operations', confidence: 0.89 },
      { name: 'Security & Compliance', description: 'Infrastructure security best practices', category: 'Security', confidence: 0.86 }
    ],
    status: {
      isActive: true,
      currentTask: 'infrastructure-setup-001',
      lastHeartbeat: new Date(),
      workload: 0.4,
      availableCapabilities: []
    },
    configuration: {},
    metrics: {
      tasksCompleted: 34,
      tasksInProgress: 1,
      averageCompletionTime: 1.8,
      successRate: 0.96,
      lastActiveTime: new Date(),
      totalUptime: 142.1
    }
  },
  {
    id: 'testing-001',
    name: 'QA & Testing AI',
    role: 'testing',
    description: 'Automated testing, quality assurance, and performance monitoring',
    capabilities: [
      { name: 'Automated Testing', description: 'Unit, integration, and E2E test creation', category: 'Testing', confidence: 0.93 },
      { name: 'Performance Testing', description: 'Load testing and performance optimization', category: 'Performance', confidence: 0.89 },
      { name: 'Security Testing', description: 'Vulnerability scanning and security audits', category: 'Security', confidence: 0.91 },
      { name: 'Quality Assurance', description: 'Code quality analysis and best practices', category: 'Quality', confidence: 0.90 }
    ],
    status: {
      isActive: true,
      currentTask: 'test-strategy-001',
      lastHeartbeat: new Date(),
      workload: 0.6,
      availableCapabilities: []
    },
    configuration: {},
    metrics: {
      tasksCompleted: 52,
      tasksInProgress: 2,
      averageCompletionTime: 2.7,
      successRate: 0.98,
      lastActiveTime: new Date(),
      totalUptime: 189.4
    }
  }
];

const mockTasks: Task[] = [
  {
    id: 'project-planning-001',
    title: 'Business Model Development',
    description: 'Develop comprehensive business model for adult directory platform',
    status: 'in-progress',
    priority: 'high',
    assignedAgent: 'executive-001',
    dependencies: [],
    createdAt: new Date(Date.now() - 3600000),
    updatedAt: new Date()
  },
  {
    id: 'backend-api-001',
    title: 'User Authentication API',
    description: 'Build secure authentication system with age verification',
    status: 'in-progress',
    priority: 'critical',
    assignedAgent: 'engineer-001',
    dependencies: ['project-planning-001'],
    createdAt: new Date(Date.now() - 7200000),
    updatedAt: new Date()
  },
  {
    id: 'brand-identity-001',
    title: 'Brand Identity Development',
    description: 'Create comprehensive brand identity including logo, colors, and guidelines',
    status: 'in-progress',
    priority: 'high',
    assignedAgent: 'designer-001',
    dependencies: ['project-planning-001'],
    createdAt: new Date(Date.now() - 5400000),
    updatedAt: new Date()
  },
  {
    id: 'compliance-audit-001',
    title: 'Comprehensive Compliance Audit',
    description: 'Assess all applicable legal requirements and jurisdictions for adult platform',
    status: 'in-progress',
    priority: 'critical',
    assignedAgent: 'legal-001',
    dependencies: ['project-planning-001'],
    createdAt: new Date(Date.now() - 4800000),
    updatedAt: new Date()
  },
  {
    id: 'seo-strategy-001',
    title: 'SEO Strategy Development',
    description: 'Develop comprehensive SEO strategy with keyword research and content planning',
    status: 'in-progress',
    priority: 'medium',
    assignedAgent: 'marketing-001',
    dependencies: ['brand-identity-001'],
    createdAt: new Date(Date.now() - 2400000),
    updatedAt: new Date()
  },
  {
    id: 'infrastructure-setup-001',
    title: 'Cloud Infrastructure Setup',
    description: 'Set up scalable cloud infrastructure with monitoring and security',
    status: 'pending',
    priority: 'high',
    assignedAgent: 'devops-001',
    dependencies: ['backend-api-001'],
    createdAt: new Date(Date.now() - 1800000),
    updatedAt: new Date()
  },
  {
    id: 'age-verification-001',
    title: 'Age Verification System Implementation',
    description: 'Implement robust age verification with multiple verification methods',
    status: 'pending',
    priority: 'critical',
    assignedAgent: 'legal-001',
    dependencies: ['compliance-audit-001'],
    createdAt: new Date(Date.now() - 1200000),
    updatedAt: new Date()
  },
  {
    id: 'content-strategy-001',
    title: 'Content Marketing Strategy',
    description: 'Create comprehensive content marketing strategy and editorial calendar',
    status: 'pending',
    priority: 'medium',
    assignedAgent: 'marketing-001',
    dependencies: ['seo-strategy-001'],
    createdAt: new Date(Date.now() - 600000),
    updatedAt: new Date()
  }
];

const mockProjects: BusinessProject[] = [
  {
    id: 'project-001',
    name: 'Adult Directory Platform',
    description: 'Comprehensive adult services directory with mobile app',
    businessModel: {
      type: 'subscription',
      revenueStreams: ['Premium Listings', 'Featured Ads', 'Subscription Tiers'],
      targetMarket: 'Adult Services Industry',
      valueProposition: 'Safe, compliant, and user-friendly directory platform',
      keyFeatures: ['Age Verification', 'Secure Payments', 'Location-based Search', 'Reviews & Ratings'],
      complianceRequirements: ['2257 Records', 'GDPR', 'Age Verification', 'Content Moderation']
    },
    status: 'development',
    createdAt: new Date(Date.now() - 86400000),
    targetLaunchDate: new Date(Date.now() + 2592000000), // 30 days from now
    budget: 50000,
    team: ['executive-001', 'engineer-001', 'designer-001', 'devops-001', 'legal-001', 'marketing-001'],
    milestones: [],
    risks: []
  }
];

export default function HomePage() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [selectedBusinessModel, setSelectedBusinessModel] = useState('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in-progress': return 'bg-blue-500';
      case 'failed': return 'bg-red-500';
      case 'blocked': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAgentIcon = (role: AgentRole) => {
    const icons = {
      executive: '🧠',
      engineer: '⚙️',
      designer: '🎨',
      'app-developer': '📱',
      devops: '🚀',
      legal: '⚖️',
      marketing: '📣',
      testing: '🧪',
      'data-analyst': '📊',
      security: '🔒'
    };
    return icons[role] || '🤖';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AI Agent Team Command Center</h1>
            <p className="text-gray-600 mt-1">Autonomous business development and deployment platform with advanced AI capabilities</p>
          </div>
          <div className="flex gap-3">
            <Link href="/demo">
              <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                <Rocket className="mr-2 h-4 w-4" />
                Try Demo
              </Button>
            </Link>
            <Button
              onClick={() => setIsCreateProjectOpen(true)}
              variant="outline"
            >
              Create Project
            </Button>
          </div>
        </div>

        {/* Enhanced Features Banner */}
        <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <h2 className="text-xl font-bold text-gray-900">🚀 Advanced AI Capabilities Now Live!</h2>
              <p className="text-gray-600">Experience autonomous business development with vector memory, real-time collaboration, and code execution</p>
              <div className="flex flex-wrap justify-center gap-4">
                <Badge variant="outline" className="bg-white">
                  <Brain className="mr-1 h-3 w-3" />
                  Vector Memory System
                </Badge>
                <Badge variant="outline" className="bg-white">
                  <Code className="mr-1 h-3 w-3" />
                  Code Execution Environment
                </Badge>
                <Badge variant="outline" className="bg-white">
                  <TestTube className="mr-1 h-3 w-3" />
                  Automated Testing Agent
                </Badge>
                <Badge variant="outline" className="bg-white">
                  <Activity className="mr-1 h-3 w-3" />
                  Real-time Collaboration
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Agents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockAgents.filter(a => a.status.isActive).length}</div>
              <p className="text-xs text-gray-600">of {mockAgents.length} total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockTasks.filter(t => t.status === 'in-progress').length}</div>
              <p className="text-xs text-gray-600">{mockTasks.filter(t => t.status === 'completed').length} completed today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockProjects.length}</div>
              <p className="text-xs text-gray-600">in development</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">91%</div>
              <p className="text-xs text-gray-600">average across all agents</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="agents" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="agents" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockAgents.map((agent) => (
                <Card
                  key={agent.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedAgent(agent)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarFallback className="text-lg">
                          {getAgentIcon(agent.role)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{agent.name}</CardTitle>
                        <p className="text-sm text-gray-600 capitalize">{agent.role}</p>
                      </div>
                      <Badge variant={agent.status.isActive ? "default" : "secondary"}>
                        {agent.status.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-3">{agent.description}</p>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Workload</span>
                        <span>{Math.round(agent.status.workload * 100)}%</span>
                      </div>
                      <Progress value={agent.status.workload * 100} className="h-2" />
                    </div>

                    <div className="mt-3 flex justify-between text-sm text-gray-600">
                      <span>Success Rate: {Math.round(agent.metrics.successRate * 100)}%</span>
                      <span>Tasks: {agent.metrics.tasksCompleted}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <div className="space-y-4">
              {mockTasks.map((task) => (
                <Card key={task.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{task.title}</CardTitle>
                      <div className="flex items-center space-x-2">
                        <Badge className={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                        <Badge className={getStatusColor(task.status)}>
                          {task.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-3">{task.description}</p>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>Assigned to: {mockAgents.find(a => a.id === task.assignedAgent)?.name}</span>
                      <span>Created: {task.createdAt.toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="projects" className="space-y-4">
            <div className="space-y-4">
              {mockProjects.map((project) => (
                <Card key={project.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl">{project.name}</CardTitle>
                      <Badge className="bg-blue-100 text-blue-800 capitalize">
                        {project.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-4">{project.description}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <h4 className="font-semibold mb-2">Business Model</h4>
                        <p className="text-sm text-gray-600 capitalize">{project.businessModel.type}</p>
                        <p className="text-sm text-gray-600">{project.businessModel.valueProposition}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Team</h4>
                        <div className="flex flex-wrap gap-1">
                          {project.team.map(agentId => {
                            const agent = mockAgents.find(a => a.id === agentId);
                            return agent ? (
                              <Badge key={agentId} variant="outline" className="text-xs">
                                {getAgentIcon(agent.role)} {agent.role}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Budget:</span> ${project.budget?.toLocaleString()}
                      </div>
                      <div>
                        <span className="font-medium">Target Launch:</span> {project.targetLaunchDate?.toLocaleDateString()}
                      </div>
                      <div>
                        <span className="font-medium">Created:</span> {project.createdAt.toLocaleDateString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Agent Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockAgents.map((agent) => (
                      <div key={agent.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span>{getAgentIcon(agent.role)}</span>
                          <span className="text-sm">{agent.name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Progress value={agent.metrics.successRate * 100} className="w-20 h-2" />
                          <span className="text-sm text-gray-600 w-12">
                            {Math.round(agent.metrics.successRate * 100)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Overall Uptime</span>
                      <span className="font-semibold">99.7%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Response Time</span>
                      <span className="font-semibold">1.2s</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Active Connections</span>
                      <span className="font-semibold">42</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Memory Usage</span>
                      <span className="font-semibold">67%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Agent Detail Dialog */}
        <Dialog open={selectedAgent !== null} onOpenChange={() => setSelectedAgent(null)}>
          <DialogContent className="max-w-2xl">
            {selectedAgent && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center space-x-3">
                    <span className="text-2xl">{getAgentIcon(selectedAgent.role)}</span>
                    <span>{selectedAgent.name}</span>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-gray-600">{selectedAgent.description}</p>

                  <div>
                    <h4 className="font-semibold mb-2">Capabilities</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {selectedAgent.capabilities.map((capability, index) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-sm">{capability.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {Math.round(capability.confidence * 100)}%
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600">{capability.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Metrics</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>Tasks Completed: {selectedAgent.metrics.tasksCompleted}</div>
                      <div>Success Rate: {Math.round(selectedAgent.metrics.successRate * 100)}%</div>
                      <div>Avg. Completion: {selectedAgent.metrics.averageCompletionTime}h</div>
                      <div>Total Uptime: {selectedAgent.metrics.totalUptime}h</div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Create Project Dialog */}
        <Dialog open={isCreateProjectOpen} onOpenChange={setIsCreateProjectOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Project Description</label>
                <Textarea
                  placeholder="Describe your business idea..."
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Business Model</label>
                <Select value={selectedBusinessModel} onValueChange={setSelectedBusinessModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select business model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subscription">Subscription</SelectItem>
                    <SelectItem value="marketplace">Marketplace</SelectItem>
                    <SelectItem value="advertising">Advertising</SelectItem>
                    <SelectItem value="freemium">Freemium</SelectItem>
                    <SelectItem value="one-time">One-time Purchase</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateProjectOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  // Create project logic would go here
                  setIsCreateProjectOpen(false);
                  setNewProjectDescription('');
                  setSelectedBusinessModel('');
                }}>
                  Create Project
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
