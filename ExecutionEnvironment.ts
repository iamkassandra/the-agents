export interface ExecutionContext {
  id: string;
  agentId: string;
  type: 'javascript' | 'typescript' | 'python' | 'shell' | 'sql';
  code: string;
  inputs?: any;
  environment: 'sandbox' | 'isolated' | 'container';
  timeout: number;
  memoryLimit: number;
  permissions: SecurityPermissions;
  createdAt: Date;
}

export interface SecurityPermissions {
  networkAccess: boolean;
  fileSystemAccess: boolean;
  environmentVariables: boolean;
  processExecution: boolean;
  allowedModules: string[];
  blockedModules: string[];
  maxExecutionTime: number;
  maxMemoryUsage: number;
}

export interface ExecutionResult {
  id: string;
  contextId: string;
  status: 'success' | 'error' | 'timeout' | 'memory_exceeded' | 'permission_denied';
  output: string;
  error?: string;
  executionTime: number;
  memoryUsed: number;
  logs: string[];
  securityViolations: string[];
  createdAt: Date;
  completedAt: Date;
}

export interface SandboxConfig {
  enableNetworking: boolean;
  allowedDomains: string[];
  maxFileSize: number;
  tempDirectory: string;
  timeoutMs: number;
  memoryLimitMB: number;
}

export interface TestCase {
  id: string;
  name: string;
  input: any;
  expectedOutput: any;
  timeout?: number;
}

export interface CodeValidation {
  syntaxValid: boolean;
  securityScore: number;
  vulnerabilities: string[];
  recommendations: string[];
  complexity: number;
  dependencies: string[];
}

export class ExecutionEnvironment {
  private activeExecutions: Map<string, ExecutionContext> = new Map();
  private executionHistory: ExecutionResult[] = [];
  private sandboxConfig: SandboxConfig;
  private isInitialized: boolean = false;

  constructor() {
    this.sandboxConfig = {
      enableNetworking: false,
      allowedDomains: ['localhost', '127.0.0.1'],
      maxFileSize: 1024 * 1024, // 1MB
      tempDirectory: '/tmp/agent-sandbox',
      timeoutMs: 30000, // 30 seconds
      memoryLimitMB: 128
    };

    this.initializeEnvironment();
  }

  private async initializeEnvironment(): Promise<void> {
    console.log('[ExecutionEnvironment] Initializing secure execution environment...');

    // In a real implementation, this would set up Docker containers or isolated VMs
    // For demonstration, we'll simulate the environment
    this.isInitialized = true;

    console.log('[ExecutionEnvironment] Execution environment initialized');
  }

  async executeCode(context: ExecutionContext): Promise<ExecutionResult> {
    if (!this.isInitialized) {
      await this.initializeEnvironment();
    }

    const startTime = Date.now();
    const result: ExecutionResult = {
      id: `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      contextId: context.id,
      status: 'success',
      output: '',
      executionTime: 0,
      memoryUsed: 0,
      logs: [],
      securityViolations: [],
      createdAt: new Date(),
      completedAt: new Date()
    };

    try {
      // Security validation
      const validation = await this.validateCode(context);
      if (!validation.syntaxValid) {
        result.status = 'error';
        result.error = 'Syntax validation failed';
        return result;
      }

      if (validation.securityScore < 0.7) {
        result.status = 'permission_denied';
        result.error = 'Code failed security validation';
        result.securityViolations = validation.vulnerabilities;
        return result;
      }

      // Store active execution
      this.activeExecutions.set(result.id, context);

      // Execute based on type
      switch (context.type) {
        case 'javascript':
        case 'typescript':
          result.output = await this.executeJavaScript(context);
          break;
        case 'python':
          result.output = await this.executePython(context);
          break;
        case 'shell':
          result.output = await this.executeShell(context);
          break;
        case 'sql':
          result.output = await this.executeSQL(context);
          break;
        default:
          throw new Error(`Unsupported execution type: ${context.type}`);
      }

      result.status = 'success';
    } catch (error) {
      result.status = 'error';
      result.error = error instanceof Error ? error.message : 'Unknown execution error';
      result.logs.push(`Error: ${result.error}`);
    } finally {
      result.executionTime = Date.now() - startTime;
      result.completedAt = new Date();

      // Cleanup
      this.activeExecutions.delete(result.id);

      // Store in history
      this.executionHistory.push(result);
      this.trimHistory();
    }

    console.log(`[ExecutionEnvironment] Executed ${context.type} code for agent ${context.agentId}: ${result.status}`);
    return result;
  }

  async runTests(code: string, testCases: TestCase[], language: 'javascript' | 'typescript' | 'python'): Promise<any> {
    const testResults = [];

    for (const testCase of testCases) {
      const context: ExecutionContext = {
        id: `test-${Date.now()}-${testCase.id}`,
        agentId: 'testing-agent',
        type: language,
        code: this.wrapCodeForTesting(code, testCase, language),
        inputs: testCase.input,
        environment: 'sandbox',
        timeout: testCase.timeout || 10000,
        memoryLimit: 64,
        permissions: this.getTestingPermissions(),
        createdAt: new Date()
      };

      const result = await this.executeCode(context);

      const testResult = {
        testId: testCase.id,
        name: testCase.name,
        passed: result.status === 'success' && this.compareResults(result.output, testCase.expectedOutput),
        actual: result.output,
        expected: testCase.expectedOutput,
        executionTime: result.executionTime,
        error: result.error,
        logs: result.logs
      };

      testResults.push(testResult);
    }

    const summary = {
      total: testResults.length,
      passed: testResults.filter(t => t.passed).length,
      failed: testResults.filter(t => !t.passed).length,
      successRate: testResults.length > 0 ? testResults.filter(t => t.passed).length / testResults.length : 0,
      results: testResults
    };

    return summary;
  }

  async validateCode(context: ExecutionContext): Promise<CodeValidation> {
    const validation: CodeValidation = {
      syntaxValid: false,
      securityScore: 0,
      vulnerabilities: [],
      recommendations: [],
      complexity: 0,
      dependencies: []
    };

    try {
      // Basic syntax validation
      validation.syntaxValid = await this.checkSyntax(context.code, context.type);

      // Security analysis
      const securityAnalysis = await this.analyzeCodeSecurity(context.code);
      validation.securityScore = securityAnalysis.score;
      validation.vulnerabilities = securityAnalysis.vulnerabilities;

      // Complexity analysis
      validation.complexity = this.calculateComplexity(context.code);

      // Dependency analysis
      validation.dependencies = this.extractDependencies(context.code, context.type);

      // Generate recommendations
      validation.recommendations = this.generateRecommendations(validation);

    } catch (error) {
      validation.vulnerabilities.push(`Validation error: ${error}`);
    }

    return validation;
  }

  async createSandbox(agentId: string, requirements: string[]): Promise<string> {
    const sandboxId = `sandbox-${agentId}-${Date.now()}`;

    // In a real implementation, this would create a Docker container or VM
    console.log(`[ExecutionEnvironment] Created sandbox ${sandboxId} for agent ${agentId} with requirements: ${requirements.join(', ')}`);

    return sandboxId;
  }

  async destroySandbox(sandboxId: string): Promise<void> {
    // In a real implementation, this would destroy the container/VM
    console.log(`[ExecutionEnvironment] Destroyed sandbox ${sandboxId}`);
  }

  async benchmarkCode(code: string, language: 'javascript' | 'typescript' | 'python', iterations: number = 10): Promise<any> {
    const results = [];

    for (let i = 0; i < iterations; i++) {
      const context: ExecutionContext = {
        id: `benchmark-${Date.now()}-${i}`,
        agentId: 'performance-testing',
        type: language,
        code,
        environment: 'isolated',
        timeout: 60000,
        memoryLimit: 256,
        permissions: this.getTestingPermissions(),
        createdAt: new Date()
      };

      const result = await this.executeCode(context);
      results.push({
        iteration: i + 1,
        executionTime: result.executionTime,
        memoryUsed: result.memoryUsed,
        status: result.status
      });
    }

    const successful = results.filter(r => r.status === 'success');
    const executionTimes = successful.map(r => r.executionTime);
    const memoryUsages = successful.map(r => r.memoryUsed);

    return {
      iterations: iterations,
      successful: successful.length,
      failed: results.length - successful.length,
      averageExecutionTime: executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length,
      minExecutionTime: Math.min(...executionTimes),
      maxExecutionTime: Math.max(...executionTimes),
      averageMemoryUsage: memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length,
      results
    };
  }

  getExecutionHistory(agentId?: string, limit: number = 50): ExecutionResult[] {
    let history = this.executionHistory;

    if (agentId) {
      history = history.filter(r => {
        const context = this.activeExecutions.get(r.contextId);
        return context?.agentId === agentId;
      });
    }

    return history.slice(-limit);
  }

  getSystemMetrics(): any {
    const recentResults = this.executionHistory.slice(-100);
    const successfulExecutions = recentResults.filter(r => r.status === 'success');

    return {
      totalExecutions: this.executionHistory.length,
      activeExecutions: this.activeExecutions.size,
      successRate: recentResults.length > 0 ? successfulExecutions.length / recentResults.length : 0,
      averageExecutionTime: successfulExecutions.reduce((sum, r) => sum + r.executionTime, 0) / successfulExecutions.length || 0,
      languageStats: this.getLanguageStats(),
      errorStats: this.getErrorStats(),
      sandboxConfig: this.sandboxConfig
    };
  }

  // Private execution methods
  private async executeJavaScript(context: ExecutionContext): Promise<string> {
    // In a real implementation, this would run in a secure V8 isolate or container
    try {
      // Simulate secure JavaScript execution
      if (context.code.includes('require(') && !context.permissions.allowedModules.includes('fs')) {
        throw new Error('Module access denied');
      }

      // For demonstration, we'll simulate execution
      const mockResult = this.simulateJavaScriptExecution(context.code, context.inputs);
      return JSON.stringify(mockResult);
    } catch (error) {
      throw new Error(`JavaScript execution failed: ${error}`);
    }
  }

  private async executePython(context: ExecutionContext): Promise<string> {
    // In a real implementation, this would run in a secure Python environment
    try {
      // Simulate secure Python execution
      if (context.code.includes('import os') && !context.permissions.environmentVariables) {
        throw new Error('OS module access denied');
      }

      // For demonstration, simulate Python execution
      const mockResult = this.simulatePythonExecution(context.code, context.inputs);
      return JSON.stringify(mockResult);
    } catch (error) {
      throw new Error(`Python execution failed: ${error}`);
    }
  }

  private async executeShell(context: ExecutionContext): Promise<string> {
    // Shell execution is highly restricted
    if (!context.permissions.processExecution) {
      throw new Error('Shell execution not permitted');
    }

    // Only allow very specific, safe commands
    const allowedCommands = ['ls', 'pwd', 'echo', 'date', 'whoami'];
    const command = context.code.trim().split(' ')[0];

    if (!allowedCommands.includes(command)) {
      throw new Error(`Command '${command}' is not allowed`);
    }

    // Simulate safe shell execution
    return `Simulated output for: ${context.code}`;
  }

  private async executeSQL(context: ExecutionContext): Promise<string> {
    // SQL execution with strict validation
    const sql = context.code.toLowerCase().trim();

    // Only allow SELECT statements in sandbox
    if (!sql.startsWith('select')) {
      throw new Error('Only SELECT statements are allowed in sandbox mode');
    }

    // Check for dangerous patterns
    const dangerousPatterns = ['drop', 'delete', 'update', 'insert', 'alter', 'create'];
    for (const pattern of dangerousPatterns) {
      if (sql.includes(pattern)) {
        throw new Error(`SQL statement contains prohibited keyword: ${pattern}`);
      }
    }

    // Simulate SQL execution
    return JSON.stringify({
      query: context.code,
      result: 'Simulated SQL result',
      rowCount: 5
    });
  }

  private async checkSyntax(code: string, type: string): Promise<boolean> {
    // Basic syntax checking simulation
    try {
      switch (type) {
        case 'javascript':
        case 'typescript':
          // Check for basic JavaScript syntax issues
          if (code.includes('function') && !code.includes('{')) return false;
          if (code.split('(').length !== code.split(')').length) return false;
          break;
        case 'python':
          // Basic Python syntax checks
          if (code.includes('def ') && !code.includes(':')) return false;
          break;
        case 'sql':
          // Basic SQL syntax checks
          if (code.toLowerCase().includes('select') && !code.includes('from')) return false;
          break;
      }
      return true;
    } catch {
      return false;
    }
  }

  private async analyzeCodeSecurity(code: string): Promise<{ score: number; vulnerabilities: string[] }> {
    const vulnerabilities: string[] = [];
    let score = 1.0;

    // Check for dangerous patterns
    const dangerousPatterns = [
      { pattern: 'eval(', risk: 0.3, message: 'Use of eval() function' },
      { pattern: 'innerHTML', risk: 0.1, message: 'Direct innerHTML manipulation' },
      { pattern: 'document.write', risk: 0.2, message: 'Use of document.write()' },
      { pattern: 'setTimeout(', risk: 0.1, message: 'Use of setTimeout with string' },
      { pattern: '__import__', risk: 0.3, message: 'Dynamic import in Python' },
      { pattern: 'exec(', risk: 0.4, message: 'Use of exec() function' },
      { pattern: 'system(', risk: 0.5, message: 'System command execution' }
    ];

    for (const { pattern, risk, message } of dangerousPatterns) {
      if (code.includes(pattern)) {
        vulnerabilities.push(message);
        score -= risk;
      }
    }

    return {
      score: Math.max(score, 0),
      vulnerabilities
    };
  }

  private calculateComplexity(code: string): number {
    // Simple cyclomatic complexity calculation
    const complexityKeywords = ['if', 'else', 'for', 'while', 'switch', 'case', 'catch', 'try'];
    let complexity = 1; // Base complexity

    for (const keyword of complexityKeywords) {
      const matches = code.match(new RegExp(`\\b${keyword}\\b`, 'g'));
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  private extractDependencies(code: string, type: string): string[] {
    const dependencies: string[] = [];

    switch (type) {
      case 'javascript':
      case 'typescript':
        // Extract require() and import statements
        const requireMatches = code.match(/require\(['"`]([^'"`]+)['"`]\)/g);
        const importMatches = code.match(/import.*from\s+['"`]([^'"`]+)['"`]/g);

        if (requireMatches) {
          requireMatches.forEach(match => {
            const dep = match.match(/['"`]([^'"`]+)['"`]/)?.[1];
            if (dep) dependencies.push(dep);
          });
        }

        if (importMatches) {
          importMatches.forEach(match => {
            const dep = match.match(/from\s+['"`]([^'"`]+)['"`]/)?.[1];
            if (dep) dependencies.push(dep);
          });
        }
        break;

      case 'python':
        // Extract import statements
        const pythonImports = code.match(/^import\s+(\w+)|^from\s+(\w+)\s+import/gm);
        if (pythonImports) {
          pythonImports.forEach(match => {
            const dep = match.replace(/^(import|from)\s+/, '').split(/\s+/)[0];
            dependencies.push(dep);
          });
        }
        break;
    }

    return [...new Set(dependencies)]; // Remove duplicates
  }

  private generateRecommendations(validation: CodeValidation): string[] {
    const recommendations: string[] = [];

    if (!validation.syntaxValid) {
      recommendations.push('Fix syntax errors before execution');
    }

    if (validation.securityScore < 0.8) {
      recommendations.push('Review and address security vulnerabilities');
    }

    if (validation.complexity > 10) {
      recommendations.push('Consider refactoring to reduce complexity');
    }

    if (validation.dependencies.length > 10) {
      recommendations.push('Consider reducing the number of dependencies');
    }

    return recommendations;
  }

  private getTestingPermissions(): SecurityPermissions {
    return {
      networkAccess: false,
      fileSystemAccess: false,
      environmentVariables: false,
      processExecution: false,
      allowedModules: ['lodash', 'moment', 'axios'],
      blockedModules: ['fs', 'child_process', 'cluster'],
      maxExecutionTime: 30000,
      maxMemoryUsage: 128
    };
  }

  private wrapCodeForTesting(code: string, testCase: TestCase, language: string): string {
    switch (language) {
      case 'javascript':
      case 'typescript':
        return `
          ${code}

          // Test execution
          const input = ${JSON.stringify(testCase.input)};
          const result = main ? main(input) : (typeof exports !== 'undefined' ? exports : {});
          JSON.stringify(result);
        `;

      case 'python':
        return `
          ${code}

          import json

          input_data = ${JSON.stringify(testCase.input)}
          result = main(input_data) if 'main' in locals() else None
          print(json.dumps(result))
        `;

      default:
        return code;
    }
  }

  private compareResults(actual: string, expected: any): boolean {
    try {
      const actualParsed = JSON.parse(actual);
      return JSON.stringify(actualParsed) === JSON.stringify(expected);
    } catch {
      return actual.trim() === String(expected).trim();
    }
  }

  private simulateJavaScriptExecution(code: string, inputs: any): any {
    // Simulate execution results based on code patterns
    if (code.includes('return') && code.includes('function')) {
      return { status: 'function_executed', inputs, output: 'simulated_result' };
    }
    return { status: 'code_executed', result: 'success' };
  }

  private simulatePythonExecution(code: string, inputs: any): any {
    if (code.includes('def ') && code.includes('return')) {
      return { status: 'function_executed', inputs, output: 'simulated_result' };
    }
    return { status: 'code_executed', result: 'success' };
  }

  private getLanguageStats(): any {
    const languageStats = new Map<string, number>();

    for (const result of this.executionHistory.slice(-100)) {
      const context = this.activeExecutions.get(result.contextId);
      if (context) {
        const count = languageStats.get(context.type) || 0;
        languageStats.set(context.type, count + 1);
      }
    }

    return Object.fromEntries(languageStats);
  }

  private getErrorStats(): any {
    const errorStats = new Map<string, number>();

    for (const result of this.executionHistory.slice(-100)) {
      if (result.status !== 'success') {
        const count = errorStats.get(result.status) || 0;
        errorStats.set(result.status, count + 1);
      }
    }

    return Object.fromEntries(errorStats);
  }

  private trimHistory(): void {
    if (this.executionHistory.length > 1000) {
      this.executionHistory = this.executionHistory.slice(-500);
    }
  }
}

// Singleton instance for system-wide code execution
export const executionEnvironment = new ExecutionEnvironment();
