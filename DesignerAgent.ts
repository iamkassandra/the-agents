import { BaseAgent } from './BaseAgent';
import { Task, AgentAction } from '@/types/agents';

export interface DesignSystem {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    neutral: string[];
    success: string;
    warning: string;
    error: string;
  };
  typography: {
    fontFamily: string;
    fontSizes: string[];
    fontWeights: number[];
    lineHeights: number[];
  };
  spacing: string[];
  borderRadius: string[];
  shadows: string[];
  breakpoints: string[];
}

export interface BrandIdentity {
  name: string;
  tagline: string;
  logo: {
    primary: string;
    secondary: string;
    icon: string;
  };
  colorPalette: string[];
  personality: string[];
  tone: string;
  targetAudience: string;
}

export class DesignerAgent extends BaseAgent {
  private designSystem: DesignSystem;
  private brandingGuidelines: string[];

  constructor() {
    super(
      'designer-001',
      'UI/UX Designer AI',
      'designer',
      [
        { name: 'UI Design', description: 'Creates beautiful user interfaces', category: 'Design', confidence: 0.88 },
        { name: 'UX Research', description: 'User flow and experience optimization', category: 'Research', confidence: 0.85 },
        { name: 'Branding', description: 'Logo and brand identity creation', category: 'Design', confidence: 0.90 },
        { name: 'Responsive Design', description: 'Mobile-first responsive layouts', category: 'Design', confidence: 0.92 },
        { name: 'Accessibility', description: 'WCAG compliant accessible design', category: 'Design', confidence: 0.86 },
        { name: 'Prototyping', description: 'Interactive prototypes and wireframes', category: 'Design', confidence: 0.84 },
        { name: 'Design Systems', description: 'Scalable design system creation', category: 'Design', confidence: 0.89 }
      ]
    );

    this.designSystem = this.createDefaultDesignSystem();
    this.brandingGuidelines = [
      'Professional yet approachable aesthetic',
      'Sophisticated color palette avoiding gaudy or overly bright colors',
      'Clean typography with excellent readability',
      'Consistent spacing and layout principles',
      'Age-appropriate and tasteful imagery',
      'Mobile-first responsive design',
      'Fast loading and performance optimized',
      'Accessibility compliance (WCAG 2.1 AA)'
    ];
  }

  async processTask(task: Task): Promise<any> {
    console.log(`[Designer] Processing task: ${task.title}`);

    const taskType = this.categorizeDesignTask(task);

    switch (taskType) {
      case 'brand_identity':
        return await this.createBrandIdentity(task);
      case 'ui_design':
        return await this.designUserInterface(task);
      case 'ux_research':
        return await this.conductUXResearch(task);
      case 'design_system':
        return await this.createDesignSystem(task);
      case 'prototype':
        return await this.createPrototype(task);
      case 'responsive_design':
        return await this.optimizeResponsiveDesign(task);
      case 'accessibility':
        return await this.implementAccessibility(task);
      default:
        return await this.handleGenericDesignTask(task);
    }
  }

  async generatePlan(objective: string): Promise<Task[]> {
    console.log(`[Designer] Generating design plan for: ${objective}`);

    const tasks: Task[] = [];
    const baseTime = Date.now();

    // Phase 1: Research and Strategy
    tasks.push({
      id: `ux-research-${baseTime}`,
      title: 'UX Research and User Personas',
      description: 'Research target audience and create detailed user personas',
      status: 'pending',
      priority: 'high',
      assignedAgent: this.id,
      dependencies: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      estimatedDuration: 8
    });

    tasks.push({
      id: `brand-identity-${baseTime}`,
      title: 'Brand Identity Development',
      description: 'Create comprehensive brand identity including logo, colors, and guidelines',
      status: 'pending',
      priority: 'high',
      assignedAgent: this.id,
      dependencies: [`ux-research-${baseTime}`],
      createdAt: new Date(),
      updatedAt: new Date(),
      estimatedDuration: 12
    });

    // Phase 2: Design System
    tasks.push({
      id: `design-system-${baseTime}`,
      title: 'Design System Creation',
      description: 'Build comprehensive design system with components and guidelines',
      status: 'pending',
      priority: 'critical',
      assignedAgent: this.id,
      dependencies: [`brand-identity-${baseTime}`],
      createdAt: new Date(),
      updatedAt: new Date(),
      estimatedDuration: 16
    });

    // Phase 3: UI Design
    tasks.push({
      id: `wireframes-${baseTime}`,
      title: 'Wireframe Development',
      description: 'Create detailed wireframes for all key user flows',
      status: 'pending',
      priority: 'high',
      assignedAgent: this.id,
      dependencies: [`design-system-${baseTime}`],
      createdAt: new Date(),
      updatedAt: new Date(),
      estimatedDuration: 10
    });

    tasks.push({
      id: `ui-mockups-${baseTime}`,
      title: 'High-Fidelity UI Mockups',
      description: 'Design pixel-perfect UI mockups for all screens',
      status: 'pending',
      priority: 'high',
      assignedAgent: this.id,
      dependencies: [`wireframes-${baseTime}`],
      createdAt: new Date(),
      updatedAt: new Date(),
      estimatedDuration: 20
    });

    // Phase 4: Prototyping and Testing
    tasks.push({
      id: `interactive-prototype-${baseTime}`,
      title: 'Interactive Prototype',
      description: 'Build clickable prototype for user testing',
      status: 'pending',
      priority: 'medium',
      assignedAgent: this.id,
      dependencies: [`ui-mockups-${baseTime}`],
      createdAt: new Date(),
      updatedAt: new Date(),
      estimatedDuration: 12
    });

    tasks.push({
      id: `accessibility-audit-${baseTime}`,
      title: 'Accessibility Implementation',
      description: 'Ensure WCAG 2.1 AA compliance across all designs',
      status: 'pending',
      priority: 'high',
      assignedAgent: this.id,
      dependencies: [`interactive-prototype-${baseTime}`],
      createdAt: new Date(),
      updatedAt: new Date(),
      estimatedDuration: 8
    });

    return tasks;
  }

  async validateOutput(output: any): Promise<boolean> {
    if (!output) return false;

    if (output.brandIdentity) {
      return this.validateBrandIdentity(output.brandIdentity);
    }

    if (output.designSystem) {
      return this.validateDesignSystem(output.designSystem);
    }

    if (output.uiDesign) {
      return this.validateUIDesign(output.uiDesign);
    }

    return true;
  }

  protected async performAction(action: AgentAction): Promise<any> {
    switch (action.type) {
      case 'create_brand_identity':
        return await this.developBrandIdentity(action.parameters);
      case 'design_ui_components':
        return await this.designUIComponents(action.parameters);
      case 'conduct_ux_research':
        return await this.performUXResearch(action.parameters);
      case 'create_prototype':
        return await this.buildPrototype(action.parameters);
      case 'optimize_accessibility':
        return await this.enhanceAccessibility(action.parameters);
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  private categorizeDesignTask(task: Task): string {
    const description = task.description.toLowerCase();
    const title = task.title.toLowerCase();

    if (description.includes('brand') || description.includes('logo') || title.includes('brand')) {
      return 'brand_identity';
    }
    if (description.includes('ui') || description.includes('interface') || title.includes('ui')) {
      return 'ui_design';
    }
    if (description.includes('ux') || description.includes('user experience') || description.includes('research')) {
      return 'ux_research';
    }
    if (description.includes('design system') || description.includes('component') || title.includes('system')) {
      return 'design_system';
    }
    if (description.includes('prototype') || description.includes('wireframe') || title.includes('prototype')) {
      return 'prototype';
    }
    if (description.includes('responsive') || description.includes('mobile') || title.includes('responsive')) {
      return 'responsive_design';
    }
    if (description.includes('accessibility') || description.includes('wcag') || title.includes('accessibility')) {
      return 'accessibility';
    }

    return 'generic_design';
  }

  private async createBrandIdentity(task: Task): Promise<BrandIdentity> {
    console.log(`[Designer] Creating brand identity`);

    const brandIdentity: BrandIdentity = {
      name: 'EliteConnect', // This would be dynamic based on project
      tagline: 'Premium connections, verified professionals',
      logo: {
        primary: 'Modern wordmark with sophisticated typography',
        secondary: 'Simplified version for small applications',
        icon: 'Elegant symbol representing connection and trust'
      },
      colorPalette: [
        '#1a1a2e', // Deep navy primary
        '#16213e', // Dark blue secondary
        '#c9a96e', // Sophisticated gold accent
        '#f8f9fa', // Clean white
        '#6c757d', // Professional gray
        '#28a745', // Success green
        '#dc3545'  // Error red
      ],
      personality: [
        'Sophisticated',
        'Trustworthy',
        'Professional',
        'Discreet',
        'Premium',
        'Secure'
      ],
      tone: 'Professional yet approachable, emphasizing privacy and quality',
      targetAudience: 'Adults seeking premium services with discretion and professionalism'
    };

    this.storeMemory({
      id: `brand-identity-${Date.now()}`,
      type: 'decision',
      content: { brandIdentity, guidelines: this.brandingGuidelines },
      tags: ['branding', 'identity', 'design'],
      relevanceScore: 0.95,
      createdAt: new Date(),
      agentId: this.id
    });

    return brandIdentity;
  }

  private async designUserInterface(task: Task): Promise<any> {
    console.log(`[Designer] Designing user interface`);

    const uiDesign = {
      layoutSystem: {
        grid: '12-column responsive grid system',
        breakpoints: {
          mobile: '320px - 768px',
          tablet: '768px - 1024px',
          desktop: '1024px+'
        },
        containers: 'Max-width containers with responsive padding'
      },
      components: {
        navigation: {
          desktop: 'Top navigation with logo, search, and user menu',
          mobile: 'Bottom tab navigation with hamburger menu',
          features: ['Sticky header', 'Search autocomplete', 'User avatar dropdown']
        },
        cards: {
          profileCard: 'Clean card design with photo, basic info, and CTA',
          featureCard: 'Highlighting premium features and benefits',
          reviewCard: 'User testimonials with ratings and verification'
        },
        forms: {
          style: 'Clean, modern form design with proper validation',
          inputs: 'Rounded corners, focus states, error handling',
          buttons: 'Primary, secondary, and ghost button variations'
        },
        modals: {
          types: ['Registration', 'Age verification', 'Profile editing', 'Messaging'],
          animations: 'Smooth slide-up on mobile, centered on desktop'
        }
      },
      colorUsage: {
        primary: 'CTAs, active states, key actions',
        secondary: 'Supporting elements, secondary actions',
        accent: 'Premium features, highlights, badges',
        neutral: 'Text, backgrounds, borders',
        semantic: 'Success, warning, error states'
      },
      typography: {
        headings: 'Bold, clear hierarchy with consistent spacing',
        body: 'Readable fonts optimized for long-form content',
        captions: 'Smaller text for metadata and supporting info'
      },
      iconography: {
        style: 'Minimalist line icons with consistent stroke width',
        usage: 'Navigation, features, status indicators',
        customIcons: 'Brand-specific icons for unique features'
      }
    };

    return uiDesign;
  }

  private async conductUXResearch(task: Task): Promise<any> {
    console.log(`[Designer] Conducting UX research`);

    const uxResearch = {
      userPersonas: [
        {
          name: 'Premium Service Provider',
          age: '25-45',
          goals: ['Attract quality clients', 'Manage bookings efficiently', 'Build professional reputation'],
          painPoints: ['Unreliable platforms', 'Safety concerns', 'Payment issues'],
          techComfort: 'High',
          platforms: ['Mobile-first', 'Desktop for management']
        },
        {
          name: 'Discerning Client',
          age: '30-55',
          goals: ['Find verified professionals', 'Discreet transactions', 'Quality service'],
          painPoints: ['Fake profiles', 'Complicated booking', 'Privacy concerns'],
          techComfort: 'Medium-High',
          platforms: ['Mobile primary', 'Desktop secondary']
        }
      ],
      userJourneys: {
        serviceProvider: [
          'Account creation & verification',
          'Profile setup & photo upload',
          'Subscription selection',
          'Listing management',
          'Client communication',
          'Booking management',
          'Payment processing'
        ],
        client: [
          'Browse & search listings',
          'View detailed profiles',
          'Verify provider credentials',
          'Initiate contact',
          'Book services',
          'Secure payment',
          'Leave reviews'
        ]
      },
      keyInsights: [
        'Trust and verification are paramount',
        'Mobile experience must be seamless',
        'Privacy controls need to be granular',
        'Payment process should be discreet',
        'Search and filtering are critical features',
        'Communication tools must be secure'
      ],
      designPrinciples: [
        'Privacy by design',
        'Mobile-first approach',
        'Trust through transparency',
        'Sophisticated aesthetics',
        'Intuitive navigation',
        'Performance optimization'
      ]
    };

    return uxResearch;
  }

  private async createDesignSystem(task: Task): Promise<DesignSystem> {
    console.log(`[Designer] Creating comprehensive design system`);

    const designSystem: DesignSystem = {
      colors: {
        primary: '#1a1a2e',
        secondary: '#16213e',
        accent: '#c9a96e',
        neutral: ['#ffffff', '#f8f9fa', '#e9ecef', '#dee2e6', '#ced4da', '#adb5bd', '#6c757d', '#495057', '#343a40', '#212529'],
        success: '#28a745',
        warning: '#ffc107',
        error: '#dc3545'
      },
      typography: {
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSizes: ['0.75rem', '0.875rem', '1rem', '1.125rem', '1.25rem', '1.5rem', '1.875rem', '2.25rem', '3rem'],
        fontWeights: [400, 500, 600, 700],
        lineHeights: [1.2, 1.4, 1.5, 1.6]
      },
      spacing: ['0', '0.25rem', '0.5rem', '0.75rem', '1rem', '1.25rem', '1.5rem', '2rem', '2.5rem', '3rem', '4rem', '5rem'],
      borderRadius: ['0', '0.125rem', '0.25rem', '0.5rem', '0.75rem', '1rem', '9999px'],
      shadows: [
        'none',
        '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      ],
      breakpoints: ['320px', '768px', '1024px', '1280px', '1536px']
    };

    this.designSystem = designSystem;
    return designSystem;
  }

  private async createPrototype(task: Task): Promise<any> {
    console.log(`[Designer] Creating interactive prototype`);

    const prototype = {
      tool: 'Figma with interactive components',
      features: [
        'Clickable navigation between screens',
        'Form interactions and validation states',
        'Hover and focus states for all interactive elements',
        'Mobile gestures and animations',
        'Loading states and micro-interactions'
      ],
      screens: [
        {
          name: 'Landing Page',
          components: ['Hero section', 'Search bar', 'Category grid', 'Featured profiles'],
          interactions: ['Search functionality', 'Category filtering', 'CTA buttons']
        },
        {
          name: 'Search Results',
          components: ['Filter sidebar', 'Profile grid/list', 'Map view toggle'],
          interactions: ['Filter application', 'View switching', 'Profile preview']
        },
        {
          name: 'Profile Detail',
          components: ['Photo gallery', 'Info sections', 'Contact options', 'Reviews'],
          interactions: ['Gallery navigation', 'Contact forms', 'Review submission']
        },
        {
          name: 'User Dashboard',
          components: ['Profile management', 'Analytics', 'Messages', 'Settings'],
          interactions: ['Profile editing', 'Message threads', 'Settings updates']
        }
      ],
      userFlows: [
        'Guest user browsing and search',
        'User registration and verification',
        'Profile creation and management',
        'Service booking and communication',
        'Payment and subscription management'
      ],
      testingPlan: [
        'Usability testing with target users',
        'A/B testing for key conversion flows',
        'Accessibility testing with screen readers',
        'Performance testing on various devices'
      ]
    };

    return prototype;
  }

  private async optimizeResponsiveDesign(task: Task): Promise<any> {
    const responsiveStrategy = {
      approach: 'Mobile-first progressive enhancement',
      breakpoints: this.designSystem.breakpoints,
      layoutAdaptations: {
        navigation: 'Top bar on desktop, bottom tabs on mobile',
        grids: 'Flexible grid system that adapts to screen size',
        modals: 'Full-screen on mobile, centered on desktop',
        forms: 'Single column on mobile, multi-column on desktop'
      },
      touchTargets: 'Minimum 44px for mobile interactions',
      imageOptimization: 'Responsive images with multiple breakpoints',
      performance: 'Critical CSS inlined, progressive loading'
    };

    return responsiveStrategy;
  }

  private async implementAccessibility(task: Task): Promise<any> {
    const accessibilityPlan = {
      compliance: 'WCAG 2.1 AA standards',
      colorContrast: 'Minimum 4.5:1 ratio for normal text, 3:1 for large text',
      keyboardNavigation: 'Full keyboard accessibility with visible focus indicators',
      screenReaders: 'Semantic HTML with proper ARIA labels and roles',
      images: 'Descriptive alt text for all meaningful images',
      forms: 'Clear labels, error messages, and instructions',
      testing: [
        'Automated accessibility testing with axe-core',
        'Manual testing with screen readers',
        'Keyboard-only navigation testing',
        'Color blindness simulation testing'
      ],
      documentation: 'Accessibility guidelines for development team'
    };

    return accessibilityPlan;
  }

  private async handleGenericDesignTask(task: Task): Promise<any> {
    return {
      status: 'completed',
      message: `Design task completed: ${task.title}`,
      designSystem: this.designSystem,
      guidelines: this.brandingGuidelines,
      recommendations: [
        'Follow established design system',
        'Maintain consistency across all touchpoints',
        'Test designs with real users',
        'Ensure accessibility compliance'
      ]
    };
  }

  // Implementation methods for actions
  private async developBrandIdentity(parameters: any): Promise<BrandIdentity> {
    return await this.createBrandIdentity({} as Task);
  }

  private async designUIComponents(parameters: any): Promise<any> {
    return await this.designUserInterface({} as Task);
  }

  private async performUXResearch(parameters: any): Promise<any> {
    return await this.conductUXResearch({} as Task);
  }

  private async buildPrototype(parameters: any): Promise<any> {
    return await this.createPrototype({} as Task);
  }

  private async enhanceAccessibility(parameters: any): Promise<any> {
    return await this.implementAccessibility({} as Task);
  }

  // Helper methods
  private createDefaultDesignSystem(): DesignSystem {
    return {
      colors: {
        primary: '#1a1a2e',
        secondary: '#16213e',
        accent: '#c9a96e',
        neutral: ['#ffffff', '#f8f9fa', '#e9ecef', '#dee2e6', '#ced4da', '#adb5bd', '#6c757d', '#495057', '#343a40', '#212529'],
        success: '#28a745',
        warning: '#ffc107',
        error: '#dc3545'
      },
      typography: {
        fontFamily: '"Inter", sans-serif',
        fontSizes: ['0.75rem', '0.875rem', '1rem', '1.125rem', '1.25rem', '1.5rem', '1.875rem', '2.25rem', '3rem'],
        fontWeights: [400, 500, 600, 700],
        lineHeights: [1.2, 1.4, 1.5, 1.6]
      },
      spacing: ['0', '0.25rem', '0.5rem', '0.75rem', '1rem', '1.25rem', '1.5rem', '2rem', '2.5rem', '3rem', '4rem', '5rem'],
      borderRadius: ['0', '0.125rem', '0.25rem', '0.5rem', '0.75rem', '1rem', '9999px'],
      shadows: [
        'none',
        '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      ],
      breakpoints: ['320px', '768px', '1024px', '1280px', '1536px']
    };
  }

  // Validation methods
  private validateBrandIdentity(brandIdentity: BrandIdentity): boolean {
    return !!(
      brandIdentity.name &&
      brandIdentity.tagline &&
      brandIdentity.logo &&
      brandIdentity.colorPalette?.length > 0 &&
      brandIdentity.personality?.length > 0
    );
  }

  private validateDesignSystem(designSystem: DesignSystem): boolean {
    return !!(
      designSystem.colors &&
      designSystem.typography &&
      designSystem.spacing?.length > 0 &&
      designSystem.borderRadius?.length > 0
    );
  }

  private validateUIDesign(uiDesign: any): boolean {
    return !!(
      uiDesign.layoutSystem &&
      uiDesign.components &&
      uiDesign.colorUsage &&
      uiDesign.typography
    );
  }
}
