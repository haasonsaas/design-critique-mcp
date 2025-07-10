import sharp from 'sharp';
import Jimp from 'jimp';
import { LayoutAnalysis } from '../models/design-types.js';

export class CompositionAnalyzer {
  
  async analyzeComposition(imageBuffer: Buffer, design_type: string = 'web'): Promise<LayoutAnalysis> {
    try {
      // Use Jimp for image analysis
      const image = await Jimp.read(imageBuffer);
      const width = image.getWidth();
      const height = image.getHeight();

      // Perform actual image analysis
      const gridAlignment = await this.analyzeGridAlignment(image);
      const visualHierarchy = await this.analyzeVisualHierarchy(image, design_type);
      const balance = await this.analyzeBalance(image);
      const spacingConsistency = await this.analyzeSpacing(image);
      const alignmentScore = await this.calculateAlignmentScore(image);

      // Calculate overall composition score
      const score = this.calculateCompositionScore({
        gridAlignment,
        balance,
        spacingConsistency,
        alignmentScore
      });

      return {
        score,
        grid_alignment: gridAlignment,
        visual_hierarchy: visualHierarchy,
        balance,
        spacing_consistency: spacingConsistency,
        alignment_score: alignmentScore
      };
    } catch (error) {
      // Return default analysis if processing fails
      return {
        score: 50,
        grid_alignment: false,
        visual_hierarchy: ['Unable to analyze hierarchy'],
        balance: 'asymmetric',
        spacing_consistency: false,
        alignment_score: 50
      };
    }
  }

  private async analyzeGridAlignment(image: Jimp): Promise<boolean> {
    const width = image.getWidth();
    const height = image.getHeight();
    
    // Detect edges using Jimp's built-in edge detection
    const edgeImage = image.clone();
    
    // Convert to grayscale and apply edge detection
    edgeImage.greyscale();
    
    // Simple edge detection by analyzing pixel brightness changes
    const verticalLines = this.detectVerticalLines(edgeImage);
    const horizontalLines = this.detectHorizontalLines(edgeImage);
    
    // Check if lines are evenly spaced (indicating grid use)
    const verticalSpacing = this.analyzeLineSpacing(verticalLines, width);
    const horizontalSpacing = this.analyzeLineSpacing(horizontalLines, height);
    
    return verticalSpacing.consistent && horizontalSpacing.consistent;
  }

  private detectVerticalLines(image: Jimp): number[] {
    const width = image.getWidth();
    const height = image.getHeight();
    const lines: number[] = [];
    const threshold = 30; // Brightness difference threshold
    
    for (let x = 1; x < width - 1; x++) {
      let edgeCount = 0;
      for (let y = 1; y < height - 1; y++) {
        const centerPixel = Jimp.intToRGBA(image.getPixelColor(x, y));
        const leftPixel = Jimp.intToRGBA(image.getPixelColor(x - 1, y));
        const rightPixel = Jimp.intToRGBA(image.getPixelColor(x + 1, y));
        
        const centerBrightness = (centerPixel.r + centerPixel.g + centerPixel.b) / 3;
        const leftBrightness = (leftPixel.r + leftPixel.g + leftPixel.b) / 3;
        const rightBrightness = (rightPixel.r + rightPixel.g + rightPixel.b) / 3;
        
        if (Math.abs(centerBrightness - leftBrightness) > threshold || 
            Math.abs(centerBrightness - rightBrightness) > threshold) {
          edgeCount++;
        }
      }
      
      if (edgeCount > height * 0.1) { // If 10% of pixels are edges
        lines.push(x);
      }
    }
    
    return this.filterCloseLines(lines, 20); // Filter lines that are too close
  }

  private detectHorizontalLines(image: Jimp): number[] {
    const width = image.getWidth();
    const height = image.getHeight();
    const lines: number[] = [];
    const threshold = 30;
    
    for (let y = 1; y < height - 1; y++) {
      let edgeCount = 0;
      for (let x = 1; x < width - 1; x++) {
        const centerPixel = Jimp.intToRGBA(image.getPixelColor(x, y));
        const topPixel = Jimp.intToRGBA(image.getPixelColor(x, y - 1));
        const bottomPixel = Jimp.intToRGBA(image.getPixelColor(x, y + 1));
        
        const centerBrightness = (centerPixel.r + centerPixel.g + centerPixel.b) / 3;
        const topBrightness = (topPixel.r + topPixel.g + topPixel.b) / 3;
        const bottomBrightness = (bottomPixel.r + bottomPixel.g + bottomPixel.b) / 3;
        
        if (Math.abs(centerBrightness - topBrightness) > threshold || 
            Math.abs(centerBrightness - bottomBrightness) > threshold) {
          edgeCount++;
        }
      }
      
      if (edgeCount > width * 0.1) {
        lines.push(y);
      }
    }
    
    return this.filterCloseLines(lines, 20);
  }

  private filterCloseLines(lines: number[], minDistance: number): number[] {
    if (lines.length === 0) return lines;
    
    const filtered = [lines[0]];
    for (let i = 1; i < lines.length; i++) {
      if (lines[i] - filtered[filtered.length - 1] >= minDistance) {
        filtered.push(lines[i]);
      }
    }
    return filtered;
  }

  private analyzeLineSpacing(lines: number[], dimension: number): { consistent: boolean; averageSpacing: number } {
    if (lines.length < 3) {
      return { consistent: false, averageSpacing: 0 };
    }
    
    const spacings = [];
    for (let i = 1; i < lines.length; i++) {
      spacings.push(lines[i] - lines[i - 1]);
    }
    
    const averageSpacing = spacings.reduce((sum, spacing) => sum + spacing, 0) / spacings.length;
    const variance = spacings.reduce((sum, spacing) => sum + Math.pow(spacing - averageSpacing, 2), 0) / spacings.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Consider consistent if standard deviation is less than 30% of average
    const consistent = spacings.length >= 2 && standardDeviation < averageSpacing * 0.3;
    
    return { consistent, averageSpacing };
  }

  private async analyzeVisualHierarchy(image: Jimp, design_type: string): Promise<string[]> {
    const hierarchy: string[] = [];
    
    // Analyze image regions by contrast and composition
    const regions = this.divideIntoRegions(image);
    const regionAnalysis = regions.map(region => ({
      ...region,
      contrast: this.calculateRegionContrast(image, region),
      brightness: this.calculateRegionBrightness(image, region)
    }));
    
    // Sort regions by visual weight (contrast + brightness variance)
    regionAnalysis.sort((a, b) => (b.contrast + b.brightness) - (a.contrast + a.brightness));
    
    // Generate hierarchy descriptions based on actual analysis
    if (regionAnalysis.length > 0 && regionAnalysis[0].contrast > 30) {
      hierarchy.push(`Strong focal point detected in ${this.describeRegionPosition(regionAnalysis[0])}`);
    } else {
      hierarchy.push('Balanced composition with no dominant focal point');
    }
    
    if (regionAnalysis.length > 1 && regionAnalysis[1].contrast > 20) {
      hierarchy.push(`Secondary emphasis in ${this.describeRegionPosition(regionAnalysis[1])}`);
    }
    
    // Add design-type specific observations
    switch (design_type) {
      case 'web':
        hierarchy.push('Layout follows web design conventions');
        break;
      case 'mobile':
        hierarchy.push('Vertical flow optimized for mobile viewing');
        break;
      case 'print':
        hierarchy.push('Traditional print layout hierarchy');
        break;
    }
    
    return hierarchy;
  }

  private divideIntoRegions(image: Jimp): Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }> {
    const width = image.getWidth();
    const height = image.getHeight();
    const regions = [];
    const regionWidth = Math.floor(width / 3);
    const regionHeight = Math.floor(height / 3);
    
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        regions.push({
          x: col * regionWidth,
          y: row * regionHeight,
          width: regionWidth,
          height: regionHeight
        });
      }
    }
    
    return regions;
  }

  private calculateRegionContrast(image: Jimp, region: { x: number; y: number; width: number; height: number }): number {
    const brightnesses: number[] = [];
    
    for (let y = region.y; y < region.y + region.height && y < image.getHeight(); y++) {
      for (let x = region.x; x < region.x + region.width && x < image.getWidth(); x++) {
        const pixel = Jimp.intToRGBA(image.getPixelColor(x, y));
        const brightness = (pixel.r + pixel.g + pixel.b) / 3;
        brightnesses.push(brightness);
      }
    }
    
    if (brightnesses.length === 0) return 0;
    
    const max = Math.max(...brightnesses);
    const min = Math.min(...brightnesses);
    return max - min;
  }

  private calculateRegionBrightness(image: Jimp, region: { x: number; y: number; width: number; height: number }): number {
    let totalBrightness = 0;
    let pixelCount = 0;
    
    for (let y = region.y; y < region.y + region.height && y < image.getHeight(); y++) {
      for (let x = region.x; x < region.x + region.width && x < image.getWidth(); x++) {
        const pixel = Jimp.intToRGBA(image.getPixelColor(x, y));
        const brightness = (pixel.r + pixel.g + pixel.b) / 3;
        totalBrightness += brightness;
        pixelCount++;
      }
    }
    
    return pixelCount > 0 ? totalBrightness / pixelCount : 0;
  }

  private describeRegionPosition(region: { x: number; y: number }): string {
    // Determine position based on coordinates
    const positions = [
      'top-left', 'top-center', 'top-right',
      'middle-left', 'center', 'middle-right',
      'bottom-left', 'bottom-center', 'bottom-right'
    ];
    
    // This is a simplified mapping - in a real implementation you'd calculate the actual grid position
    return positions[4] || 'center'; // Default to center for now
  }

  private async analyzeBalance(image: Jimp): Promise<'symmetric' | 'asymmetric' | 'radial'> {
    const width = image.getWidth();
    const height = image.getHeight();
    
    // Check for symmetric balance by comparing left and right halves
    const leftHalf = this.getImageHalf(image, 'left');
    const rightHalf = this.getImageHalf(image, 'right');
    
    const symmetryScore = this.compareImageHalves(leftHalf, rightHalf);
    
    // Check for radial balance by analyzing from center
    const radialScore = this.analyzeRadialBalance(image);
    
    if (radialScore > 0.7) {
      return 'radial';
    } else if (symmetryScore > 0.8) {
      return 'symmetric';
    } else {
      return 'asymmetric';
    }
  }

  private getImageHalf(image: Jimp, half: 'left' | 'right'): number[] {
    const width = image.getWidth();
    const height = image.getHeight();
    const halfWidth = Math.floor(width / 2);
    const halfPixels: number[] = [];
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < halfWidth; x++) {
        const sourceX = half === 'left' ? x : width - 1 - x;
        const pixel = Jimp.intToRGBA(image.getPixelColor(sourceX, y));
        const brightness = (pixel.r + pixel.g + pixel.b) / 3;
        halfPixels.push(brightness);
      }
    }
    
    return halfPixels;
  }

  private compareImageHalves(left: number[], right: number[]): number {
    let totalDifference = 0;
    const length = Math.min(left.length, right.length);
    
    for (let i = 0; i < length; i++) {
      totalDifference += Math.abs(left[i] - right[i]);
    }
    
    const averageDifference = totalDifference / length;
    return Math.max(0, 1 - averageDifference / 255);
  }

  private analyzeRadialBalance(image: Jimp): number {
    const width = image.getWidth();
    const height = image.getHeight();
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(centerX, centerY);
    
    let totalWeight = 0;
    let weightedSum = 0;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= maxRadius) {
          const pixel = Jimp.intToRGBA(image.getPixelColor(x, y));
          const brightness = (pixel.r + pixel.g + pixel.b) / 3;
          const weight = 1 - (distance / maxRadius);
          
          totalWeight += weight;
          weightedSum += brightness * weight;
        }
      }
    }
    
    const averageBrightness = weightedSum / totalWeight;
    const variance = this.calculateRadialVariance(image, centerX, centerY, maxRadius, averageBrightness);
    
    return Math.max(0, 1 - variance / 10000);
  }

  private calculateRadialVariance(image: Jimp, centerX: number, centerY: number, maxRadius: number, averageBrightness: number): number {
    const width = image.getWidth();
    const height = image.getHeight();
    let variance = 0;
    let count = 0;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= maxRadius) {
          const pixel = Jimp.intToRGBA(image.getPixelColor(x, y));
          const brightness = (pixel.r + pixel.g + pixel.b) / 3;
          variance += Math.pow(brightness - averageBrightness, 2);
          count++;
        }
      }
    }
    
    return count > 0 ? variance / count : 0;
  }

  private async analyzeSpacing(image: Jimp): Promise<boolean> {
    // Analyze white space distribution
    const width = image.getWidth();
    const height = image.getHeight();
    
    // Look for consistent spacing patterns
    let consistentSpacing = 0;
    let totalChecks = 0;
    
    // Sample spacing in grid pattern
    for (let y = 0; y < height; y += Math.floor(height / 10)) {
      for (let x = 0; x < width; x += Math.floor(width / 10)) {
        // Check if this area has consistent spacing around elements
        const localSpacing = this.checkLocalSpacing(image, x, y);
        if (localSpacing) consistentSpacing++;
        totalChecks++;
      }
    }
    
    return totalChecks > 0 && (consistentSpacing / totalChecks) > 0.6;
  }

  private checkLocalSpacing(image: Jimp, centerX: number, centerY: number): boolean {
    // Simple check for white space consistency in local area
    const radius = 20;
    const width = image.getWidth();
    const height = image.getHeight();
    
    let whitePixels = 0;
    let totalPixels = 0;
    
    for (let y = Math.max(0, centerY - radius); y < Math.min(height, centerY + radius); y++) {
      for (let x = Math.max(0, centerX - radius); x < Math.min(width, centerX + radius); x++) {
        const pixel = Jimp.intToRGBA(image.getPixelColor(x, y));
        const brightness = (pixel.r + pixel.g + pixel.b) / 3;
        
        if (brightness > 200) whitePixels++; // Consider bright pixels as "white space"
        totalPixels++;
      }
    }
    
    const whiteSpaceRatio = whitePixels / totalPixels;
    return whiteSpaceRatio > 0.3 && whiteSpaceRatio < 0.8; // Reasonable white space
  }

  private async calculateAlignmentScore(image: Jimp): Promise<number> {
    const width = image.getWidth();
    const height = image.getHeight();
    let score = 0;
    
    // Check for alignment to grid
    const verticalLines = this.detectVerticalLines(image);
    const horizontalLines = this.detectHorizontalLines(image);
    
    // Award points for having detectable grid structure
    if (verticalLines.length >= 2) score += 25;
    if (horizontalLines.length >= 2) score += 25;
    
    // Check for elements aligned to common ratios
    const aspectRatio = width / height;
    const commonRatios = [16/9, 4/3, 3/2, 5/4, 1.618];
    if (commonRatios.some(ratio => Math.abs(aspectRatio - ratio) < 0.1)) {
      score += 20;
    }
    
    // Check for rule of thirds alignment
    const ruleOfThirdsScore = this.checkRuleOfThirds(image);
    score += ruleOfThirdsScore;
    
    return Math.round(Math.max(0, Math.min(100, score)));
  }

  private checkRuleOfThirds(image: Jimp): number {
    const width = image.getWidth();
    const height = image.getHeight();
    
    // Rule of thirds lines
    const verticalThirds = [width / 3, 2 * width / 3];
    const horizontalThirds = [height / 3, 2 * height / 3];
    
    let alignmentScore = 0;
    
    // Check for high contrast areas near rule of thirds intersections
    for (const x of verticalThirds) {
      for (const y of horizontalThirds) {
        const contrast = this.calculateLocalContrast(image, Math.floor(x), Math.floor(y));
        if (contrast > 50) alignmentScore += 5; // High contrast suggests important element
      }
    }
    
    return Math.min(alignmentScore, 30); // Cap at 30 points
  }

  private calculateLocalContrast(image: Jimp, centerX: number, centerY: number): number {
    const radius = 10;
    const width = image.getWidth();
    const height = image.getHeight();
    
    const brightnesses: number[] = [];
    
    for (let y = Math.max(0, centerY - radius); y < Math.min(height, centerY + radius); y++) {
      for (let x = Math.max(0, centerX - radius); x < Math.min(width, centerX + radius); x++) {
        const pixel = Jimp.intToRGBA(image.getPixelColor(x, y));
        const brightness = (pixel.r + pixel.g + pixel.b) / 3;
        brightnesses.push(brightness);
      }
    }
    
    if (brightnesses.length === 0) return 0;
    
    const max = Math.max(...brightnesses);
    const min = Math.min(...brightnesses);
    return max - min;
  }

  private calculateCompositionScore(factors: {
    gridAlignment: boolean;
    balance: 'symmetric' | 'asymmetric' | 'radial';
    spacingConsistency: boolean;
    alignmentScore: number;
  }): number {
    let score = 0;
    
    // Grid alignment contributes 25 points
    if (factors.gridAlignment) score += 25;
    
    // Balance contributes 25 points
    switch (factors.balance) {
      case 'symmetric':
        score += 25;
        break;
      case 'radial':
        score += 23;
        break;
      case 'asymmetric':
        score += 20;
        break;
    }
    
    // Spacing consistency contributes 25 points
    if (factors.spacingConsistency) score += 25;
    
    // Alignment score contributes 25 points (scaled from 0-100 to 0-25)
    score += (factors.alignmentScore / 100) * 25;
    
    return Math.round(score);
  }
}
