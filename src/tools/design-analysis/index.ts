import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { ImageHandler } from '../../utils/image-handler.js';
import { ColorAnalyzer } from '../../analyzers/color-analyzer.js';
import { CompositionAnalyzer } from '../../analyzers/composition-analyzer.js';
import { TypographyAnalyzer } from '../../analyzers/typography-analyzer.js';
import { AccessibilityAnalyzer } from '../../analyzers/accessibility-analyzer.js';
import { 
  DesignAnalysisInputSchema, 
  DesignCritique,
  ColorAnalysis,
  LayoutAnalysis,
  DesignToolResponse 
} from '../../models/design-types.js';

export class DesignAnalysisTools {
  private colorAnalyzer: ColorAnalyzer;
  private compositionAnalyzer: CompositionAnalyzer;
  private typographyAnalyzer: TypographyAnalyzer;
  private accessibilityAnalyzer: AccessibilityAnalyzer;

  constructor() {
    this.colorAnalyzer = new ColorAnalyzer();
    this.compositionAnalyzer = new CompositionAnalyzer();
    this.typographyAnalyzer = new TypographyAnalyzer();
    this.accessibilityAnalyzer = new AccessibilityAnalyzer();
  }

  registerTools(server: Server) {
    // Register tool handler
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'critique_design':
          return await this.handleCritiqueDesign(args);
        case 'analyze_color_scheme':
          return await this.handleAnalyzeColorScheme(args);
        case 'analyze_layout':
          return await this.handleAnalyzeLayout(args);
        case 'analyze_typography':
          return await this.handleAnalyzeTypography(args);
        case 'analyze_accessibility':
          return await this.handleAnalyzeAccessibility(args);
        case 'check_color_contrast':
          return await this.handleCheckColorContrast(args);
        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }
    });
  }

  private async handleCritiqueDesign(input: any) {
    const { image_data, design_type, target_audience } = input;
    
    try {
      // Decode and validate image
      const imageBuffer = await ImageHandler.decodeBase64Image(image_data);
      await ImageHandler.validateImage(imageBuffer);

      // Optimize image for analysis
      const optimizedBuffer = await ImageHandler.optimizeImage(imageBuffer);

      // Perform analyses in parallel
      const [colorAnalysis, compositionAnalysis, typographyAnalysis, accessibilityAnalysis] = 
        await Promise.all([
          this.colorAnalyzer.analyzeColors(optimizedBuffer),
          this.compositionAnalyzer.analyzeComposition(optimizedBuffer, design_type),
          this.typographyAnalyzer.analyzeTypography(optimizedBuffer),
          this.accessibilityAnalyzer.analyzeAccessibility(optimizedBuffer)
        ]);

      // Calculate overall score
      const overall_score = this.calculateOverallScore({
        color: colorAnalysis.harmony_score,
        composition: compositionAnalysis.score,
        typography: typographyAnalysis.hierarchy_score,
        accessibility: accessibilityAnalysis.score
      });

      // Generate recommendations
      const recommendations = this.generateRecommendations({
        colorAnalysis,
        compositionAnalysis,
        typographyAnalysis,
        accessibilityAnalysis,
        design_type,
        target_audience
      });

      const result: DesignCritique = {
        overall_score,
        composition: compositionAnalysis,
        color_analysis: colorAnalysis,
        typography: {
          font_count: typographyAnalysis.font_count,
          hierarchy_score: typographyAnalysis.hierarchy_score,
          readability_score: typographyAnalysis.readability_score,
          issues: typographyAnalysis.issues
        },
        accessibility: {
          score: accessibilityAnalysis.score,
          issues: accessibilityAnalysis.issues,
          recommendations: accessibilityAnalysis.recommendations
        },
        recommendations
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };

    } catch (error) {
      const errorResult = {
        error: `Design analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isError: true
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(errorResult, null, 2)
        }]
      };
    }
  }

  private async handleAnalyzeColorScheme(input: any) {
    try {
      const imageBuffer = await ImageHandler.decodeBase64Image(input.image_data);
      await ImageHandler.validateImage(imageBuffer);
      
      const result = await this.colorAnalyzer.analyzeColors(imageBuffer);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      const errorResult = {
        error: `Color analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isError: true
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(errorResult, null, 2)
        }]
      };
    }
  }

  private async handleAnalyzeLayout(input: any) {
    try {
      const imageBuffer = await ImageHandler.decodeBase64Image(input.image_data);
      await ImageHandler.validateImage(imageBuffer);
      
      const result = await this.compositionAnalyzer.analyzeComposition(imageBuffer, input.design_type || 'web');
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      const errorResult = {
        error: `Layout analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isError: true
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(errorResult, null, 2)
        }]
      };
    }
  }

  private async handleAnalyzeTypography(input: any) {
    try {
      const imageBuffer = await ImageHandler.decodeBase64Image(input.image_data);
      await ImageHandler.validateImage(imageBuffer);
      
      const result = await this.typographyAnalyzer.analyzeTypography(imageBuffer);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      const errorResult = {
        error: `Typography analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isError: true
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(errorResult, null, 2)
        }]
      };
    }
  }

  private async handleAnalyzeAccessibility(input: any) {
    try {
      const imageBuffer = await ImageHandler.decodeBase64Image(input.image_data);
      await ImageHandler.validateImage(imageBuffer);
      
      const result = await this.accessibilityAnalyzer.analyzeAccessibility(imageBuffer);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      const errorResult = {
        error: `Accessibility analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isError: true
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(errorResult, null, 2)
        }]
      };
    }
  }

  private async handleCheckColorContrast(input: any) {
    try {
      const result = this.accessibilityAnalyzer.checkColorCombination(
        input.foreground,
        input.background
      );
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      const errorResult = {
        error: `Color contrast check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isError: true
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(errorResult, null, 2)
        }]
      };
    }
  }

  private calculateOverallScore(scores: { color: number; composition: number; typography: number; accessibility: number }): number {
    const weights = {
      color: 0.25,
      composition: 0.30,
      typography: 0.25,
      accessibility: 0.20
    };

    let totalScore = 0;
    for (const [category, score] of Object.entries(scores)) {
      totalScore += score * (weights as any)[category];
    }

    return Math.round(totalScore);
  }

  private generateRecommendations(analysis: {
    colorAnalysis: ColorAnalysis;
    compositionAnalysis: LayoutAnalysis;
    typographyAnalysis: any;
    accessibilityAnalysis: any;
    design_type: string;
    target_audience?: string;
  }): string[] {
    const recommendations: string[] = [];

    // Color recommendations
    if (analysis.colorAnalysis.harmony_score < 70) {
      recommendations.push('Consider using a more harmonious color palette based on color theory principles');
    }

    if (analysis.colorAnalysis.contrast_issues.length > 0) {
      recommendations.push('Improve text contrast to meet WCAG accessibility standards');
    }

    // Typography recommendations
    if (analysis.typographyAnalysis.font_count > 3) {
      recommendations.push('Reduce the number of font families to improve visual consistency');
    }

    if (analysis.typographyAnalysis.hierarchy_score < 60) {
      recommendations.push('Strengthen typographic hierarchy with more distinct size differences');
    }

    // Composition recommendations
    if (analysis.compositionAnalysis.score < 70) {
      recommendations.push('Consider improving layout structure and visual balance');
    }

    if (!analysis.compositionAnalysis.grid_alignment) {
      recommendations.push('Align elements to a consistent grid system for better organization');
    }

    // Accessibility recommendations
    if (analysis.accessibilityAnalysis.score < 80) {
      recommendations.push('Review accessibility guidelines to ensure inclusive design');
    }

    // Design-type specific recommendations
    if (analysis.design_type === 'web') {
      recommendations.push('Ensure responsive design principles are applied');
      recommendations.push('Consider mobile-first design approach');
    } else if (analysis.design_type === 'mobile') {
      recommendations.push('Ensure touch targets are at least 44px in size');
      recommendations.push('Consider thumb-friendly navigation patterns');
    }

    // Target audience specific recommendations
    if (analysis.target_audience) {
      if (analysis.target_audience.toLowerCase().includes('elderly') || 
          analysis.target_audience.toLowerCase().includes('senior')) {
        recommendations.push('Consider larger text sizes and higher contrast for elderly users');
      }
      
      if (analysis.target_audience.toLowerCase().includes('children')) {
        recommendations.push('Use bright, engaging colors and clear, simple layouts for children');
      }
    }

    return recommendations;
  }
}