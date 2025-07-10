import Jimp from 'jimp';
import chroma from 'chroma-js';

export interface AccessibilityAnalysis {
  score: number;
  issues: string[];
  recommendations: string[];
  contrast_checks: Array<{
    foreground: string;
    background: string;
    ratio: number;
    passes_aa: boolean;
    passes_aaa: boolean;
    location: string;
  }>;
  color_blindness_simulation: {
    protanopia_safe: boolean;
    deuteranopia_safe: boolean;
    tritanopia_safe: boolean;
  };
}

export class AccessibilityAnalyzer {
  
  async analyzeAccessibility(imageBuffer: Buffer): Promise<AccessibilityAnalysis> {
    try {
      const image = await Jimp.read(imageBuffer);

      // Extract colors and analyze accessibility
      const colors = await this.extractDominantColors(image);
      const contrastChecks = this.performContrastChecks(colors);
      const colorBlindnessAnalysis = this.analyzeColorBlindnessCompliance(colors);
      
      // Calculate overall accessibility score
      const score = this.calculateAccessibilityScore(contrastChecks, colorBlindnessAnalysis);
      
      // Generate issues and recommendations
      const issues = this.identifyAccessibilityIssues(contrastChecks, colorBlindnessAnalysis);
      const recommendations = this.generateAccessibilityRecommendations(contrastChecks, colorBlindnessAnalysis);

      return {
        score,
        issues,
        recommendations,
        contrast_checks: contrastChecks,
        color_blindness_simulation: colorBlindnessAnalysis
      };
    } catch (error) {
      // Return default analysis if processing fails
      return {
        score: 50,
        issues: ['Unable to perform detailed accessibility analysis'],
        recommendations: ['Ensure sufficient color contrast and consider accessibility guidelines'],
        contrast_checks: [],
        color_blindness_simulation: {
          protanopia_safe: false,
          deuteranopia_safe: false,
          tritanopia_safe: false
        }
      };
    }
  }

  private async extractDominantColors(image: any): Promise<string[]> {
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    const colorMap = new Map<string, number>();
    
    // Sample every 20th pixel for performance
    for (let y = 0; y < height; y += 20) {
      for (let x = 0; x < width; x += 20) {
        const pixelColor = Jimp.intToRGBA(image.getPixelColor(x, y));
        
        if (pixelColor.a > 128) { // Skip transparent pixels
          try {
            const color = chroma([pixelColor.r, pixelColor.g, pixelColor.b]).hex();
            colorMap.set(color, (colorMap.get(color) || 0) + 1);
          } catch {
            // Skip invalid colors
          }
        }
      }
    }
    
    // Return top 10 most frequent colors
    return Array.from(colorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([color]) => color);
  }

  private performContrastChecks(colors: string[]): Array<{
    foreground: string;
    background: string;
    ratio: number;
    passes_aa: boolean;
    passes_aaa: boolean;
    location: string;
  }> {
    const contrastChecks: Array<{
      foreground: string;
      background: string;
      ratio: number;
      passes_aa: boolean;
      passes_aaa: boolean;
      location: string;
    }> = [];
    
    // Check contrast between all color pairs
    for (let i = 0; i < colors.length - 1; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        const color1 = colors[i];
        const color2 = colors[j];
        
        try {
          const ratio = chroma.contrast(color1, color2);
          const passes_aa = ratio >= 4.5; // WCAG AA standard
          const passes_aaa = ratio >= 7; // WCAG AAA standard
          
          contrastChecks.push({
            foreground: color1,
            background: color2,
            ratio,
            passes_aa,
            passes_aaa,
            location: `Color combination ${i + 1}-${j + 1}`
          });
        } catch {
          // Skip invalid color combinations
        }
      }
    }
    
    return contrastChecks;
  }

  private analyzeColorBlindnessCompliance(colors: string[]): {
    protanopia_safe: boolean;
    deuteranopia_safe: boolean;
    tritanopia_safe: boolean;
  } {
    // Simulate color blindness and check if colors remain distinguishable
    const protanopiaColors = colors.map(color => this.simulateProtanopia(color));
    const deuteranopiaColors = colors.map(color => this.simulateDeuteranopia(color));
    const tritanopiaColors = colors.map(color => this.simulateTritanopia(color));
    
    return {
      protanopia_safe: this.areColorsDistinguishable(protanopiaColors),
      deuteranopia_safe: this.areColorsDistinguishable(deuteranopiaColors),
      tritanopia_safe: this.areColorsDistinguishable(tritanopiaColors)
    };
  }

  private simulateProtanopia(color: string): string {
    // Simulate red-blind color vision
    try {
      const lab = chroma(color).lab();
      // Simplified protanopia simulation - reduce red component
      const [l, a, b] = lab;
      return chroma.lab(l, a * 0.3, b).hex();
    } catch {
      return color;
    }
  }

  private simulateDeuteranopia(color: string): string {
    // Simulate green-blind color vision
    try {
      const lab = chroma(color).lab();
      // Simplified deuteranopia simulation - reduce green component
      const [l, a, b] = lab;
      return chroma.lab(l, a * 0.7, b * 0.3).hex();
    } catch {
      return color;
    }
  }

  private simulateTritanopia(color: string): string {
    // Simulate blue-blind color vision
    try {
      const lab = chroma(color).lab();
      // Simplified tritanopia simulation - reduce blue component
      const [l, a, b] = lab;
      return chroma.lab(l, a, b * 0.3).hex();
    } catch {
      return color;
    }
  }

  private areColorsDistinguishable(colors: string[]): boolean {
    // Check if colors are sufficiently different from each other
    for (let i = 0; i < colors.length - 1; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        try {
          const distance = chroma.deltaE(colors[i], colors[j]);
          if (distance < 10) { // Threshold for distinguishability
            return false;
          }
        } catch {
          // If comparison fails, assume not distinguishable
          return false;
        }
      }
    }
    return true;
  }

  private calculateAccessibilityScore(
    contrastChecks: Array<{
      foreground: string;
      background: string;
      ratio: number;
      passes_aa: boolean;
      passes_aaa: boolean;
      location: string;
    }>,
    colorBlindnessAnalysis: {
      protanopia_safe: boolean;
      deuteranopia_safe: boolean;
      tritanopia_safe: boolean;
    }
  ): number {
    let score = 0;
    
    // Contrast score (40 points maximum)
    if (contrastChecks.length > 0) {
      const aaPassingRate = contrastChecks.filter(check => check.passes_aa).length / contrastChecks.length;
      const aaaPassingRate = contrastChecks.filter(check => check.passes_aaa).length / contrastChecks.length;
      
      score += aaPassingRate * 25; // 25 points for AA compliance
      score += aaaPassingRate * 15; // 15 points for AAA compliance
    }
    
    // Color blindness score (30 points maximum)
    const colorBlindnessScore = [
      colorBlindnessAnalysis.protanopia_safe,
      colorBlindnessAnalysis.deuteranopia_safe,
      colorBlindnessAnalysis.tritanopia_safe
    ].filter(Boolean).length;
    
    score += (colorBlindnessScore / 3) * 30;
    
    // Bonus points for having high contrast ratios
    if (contrastChecks.length > 0) {
      const averageRatio = contrastChecks.reduce((sum, check) => sum + check.ratio, 0) / contrastChecks.length;
      if (averageRatio > 10) score += 10;
      else if (averageRatio > 7) score += 5;
    }
    
    return Math.round(Math.min(score, 100));
  }

  private identifyAccessibilityIssues(
    contrastChecks: Array<{
      foreground: string;
      background: string;
      ratio: number;
      passes_aa: boolean;
      passes_aaa: boolean;
      location: string;
    }>,
    colorBlindnessAnalysis: {
      protanopia_safe: boolean;
      deuteranopia_safe: boolean;
      tritanopia_safe: boolean;
    }
  ): string[] {
    const issues: string[] = [];
    
    // Check contrast issues
    const failedAAChecks = contrastChecks.filter(check => !check.passes_aa);
    if (failedAAChecks.length > 0) {
      issues.push(`${failedAAChecks.length} color combinations fail WCAG AA contrast requirements`);
    }
    
    const failedAAAChecks = contrastChecks.filter(check => !check.passes_aaa);
    if (failedAAAChecks.length > contrastChecks.length * 0.5) {
      issues.push('Many color combinations fail WCAG AAA contrast requirements');
    }
    
    // Check color blindness issues
    if (!colorBlindnessAnalysis.protanopia_safe) {
      issues.push('Design may not be accessible to users with red-green color blindness (protanopia)');
    }
    
    if (!colorBlindnessAnalysis.deuteranopia_safe) {
      issues.push('Design may not be accessible to users with green-red color blindness (deuteranopia)');
    }
    
    if (!colorBlindnessAnalysis.tritanopia_safe) {
      issues.push('Design may not be accessible to users with blue-yellow color blindness (tritanopia)');
    }
    
    // Check for reliance on color alone
    if (contrastChecks.length > 0) {
      const lowContrastPairs = contrastChecks.filter(check => check.ratio < 2);
      if (lowContrastPairs.length > 0) {
        issues.push('Some elements may rely too heavily on color alone to convey information');
      }
    }
    
    return issues;
  }

  private generateAccessibilityRecommendations(
    contrastChecks: Array<{
      foreground: string;
      background: string;
      ratio: number;
      passes_aa: boolean;
      passes_aaa: boolean;
      location: string;
    }>,
    colorBlindnessAnalysis: {
      protanopia_safe: boolean;
      deuteranopia_safe: boolean;
      tritanopia_safe: boolean;
    }
  ): string[] {
    const recommendations: string[] = [];
    
    // Contrast recommendations
    const failedAAChecks = contrastChecks.filter(check => !check.passes_aa);
    if (failedAAChecks.length > 0) {
      recommendations.push('Increase contrast between text and background colors to meet WCAG AA standards (minimum 4.5:1 ratio)');
    }
    
    const borderlineChecks = contrastChecks.filter(check => check.ratio >= 4.5 && check.ratio < 7);
    if (borderlineChecks.length > 0) {
      recommendations.push('Consider increasing contrast further to meet WCAG AAA standards (7:1 ratio) for better accessibility');
    }
    
    // Color blindness recommendations
    const colorBlindnessIssues = [
      colorBlindnessAnalysis.protanopia_safe,
      colorBlindnessAnalysis.deuteranopia_safe,
      colorBlindnessAnalysis.tritanopia_safe
    ].filter(Boolean).length;
    
    if (colorBlindnessIssues < 3) {
      recommendations.push('Add visual indicators beyond color (icons, patterns, text labels) to ensure information is accessible to color-blind users');
    }
    
    // General recommendations
    recommendations.push('Test your design with accessibility tools and screen readers');
    recommendations.push('Ensure all interactive elements have sufficient size (minimum 44px touch target)');
    recommendations.push('Use semantic HTML and proper heading hierarchy in implementation');
    
    // Specific color recommendations
    if (contrastChecks.length > 0) {
      const averageRatio = contrastChecks.reduce((sum, check) => sum + check.ratio, 0) / contrastChecks.length;
      if (averageRatio < 7) {
        recommendations.push('Consider using darker text on light backgrounds or lighter text on dark backgrounds');
      }
    }
    
    return recommendations;
  }

  // Utility method for checking specific color combinations
  checkColorCombination(foreground: string, background: string): {
    ratio: number;
    passes_aa: boolean;
    passes_aaa: boolean;
    recommendation: string;
  } {
    try {
      const ratio = chroma.contrast(foreground, background);
      const passes_aa = ratio >= 4.5;
      const passes_aaa = ratio >= 7;
      
      let recommendation = '';
      if (!passes_aa) {
        recommendation = 'Increase contrast significantly - fails WCAG AA standards';
      } else if (!passes_aaa) {
        recommendation = 'Good contrast for AA, consider increasing for AAA standards';
      } else {
        recommendation = 'Excellent contrast - meets all WCAG standards';
      }
      
      return {
        ratio,
        passes_aa,
        passes_aaa,
        recommendation
      };
    } catch {
      return {
        ratio: 0,
        passes_aa: false,
        passes_aaa: false,
        recommendation: 'Invalid color combination'
      };
    }
  }
}
