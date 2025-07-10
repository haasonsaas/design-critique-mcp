import { createCanvas, loadImage } from 'canvas';
import Tesseract from 'tesseract.js';

export interface TypographyAnalysis {
  font_count: number;
  hierarchy_score: number;
  readability_score: number;
  issues: string[];
  text_regions: Array<{
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  }>;
}

export class TypographyAnalyzer {
  
  async analyzeTypography(imageBuffer: Buffer): Promise<TypographyAnalysis> {
    try {
      // Use Tesseract to extract text and analyze typography
      const { data } = await Tesseract.recognize(imageBuffer, 'eng', {
        logger: () => {} // Disable logging
      });

      const textRegions = this.extractTextRegions(data);
      const fontCount = this.estimateFontCount(textRegions);
      const hierarchyScore = this.analyzeHierarchy(textRegions);
      const readabilityScore = this.analyzeReadability(textRegions, imageBuffer);
      const issues = this.identifyIssues(textRegions, fontCount, hierarchyScore, readabilityScore);

      return {
        font_count: fontCount,
        hierarchy_score: hierarchyScore,
        readability_score: readabilityScore,
        issues,
        text_regions: textRegions
      };
    } catch (error) {
      // Return default analysis if OCR fails
      return {
        font_count: 2,
        hierarchy_score: 70,
        readability_score: 75,
        issues: ['Unable to perform detailed typography analysis'],
        text_regions: []
      };
    }
  }

  private extractTextRegions(ocrData: any): Array<{
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  }> {
    const regions: Array<{
      text: string;
      x: number;
      y: number;
      width: number;
      height: number;
      confidence: number;
    }> = [];

    if (ocrData.words) {
      for (const word of ocrData.words) {
        if (word.confidence > 30) { // Only include words with decent confidence
          regions.push({
            text: word.text,
            x: word.bbox.x0,
            y: word.bbox.y0,
            width: word.bbox.x1 - word.bbox.x0,
            height: word.bbox.y1 - word.bbox.y0,
            confidence: word.confidence
          });
        }
      }
    }

    return regions;
  }

  private estimateFontCount(textRegions: Array<{
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  }>): number {
    if (textRegions.length === 0) return 0;

    // Group text regions by similar height (indicating same font size)
    const heightGroups = new Map<number, number>();
    
    textRegions.forEach(region => {
      const height = region.height;
      const roundedHeight = Math.round(height / 5) * 5; // Group by 5-pixel increments
      heightGroups.set(roundedHeight, (heightGroups.get(roundedHeight) || 0) + 1);
    });

    // Estimate font count based on distinct height groups
    const distinctHeights = Array.from(heightGroups.keys()).filter(height => height > 8);
    
    // Simple heuristic: assume 1-2 fonts per distinct size group
    return Math.max(1, Math.min(distinctHeights.length, 4));
  }

  private analyzeHierarchy(textRegions: Array<{
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  }>): number {
    if (textRegions.length === 0) return 0;

    // Sort regions by size (height) to analyze hierarchy
    const sortedRegions = [...textRegions].sort((a, b) => b.height - a.height);
    
    // Check for clear size distinctions
    const sizes = sortedRegions.map(region => region.height);
    const uniqueSizes = [...new Set(sizes.map(size => Math.round(size / 2) * 2))];
    
    let hierarchyScore = 0;
    
    // Award points for having multiple distinct sizes
    if (uniqueSizes.length >= 2) hierarchyScore += 30;
    if (uniqueSizes.length >= 3) hierarchyScore += 20;
    if (uniqueSizes.length >= 4) hierarchyScore += 10;
    
    // Check for logical size progression (each level should be meaningfully different)
    const sizeDifferences = [];
    for (let i = 0; i < uniqueSizes.length - 1; i++) {
      sizeDifferences.push(uniqueSizes[i] - uniqueSizes[i + 1]);
    }
    
    const consistentProgression = sizeDifferences.every(diff => diff >= 2);
    if (consistentProgression) hierarchyScore += 20;
    
    // Check for proper heading structure (largest text should be sparse)
    const largestSize = Math.max(...sizes);
    const largestTextCount = sizes.filter(size => size === largestSize).length;
    const totalTextCount = sizes.length;
    
    if (largestTextCount / totalTextCount < 0.3) hierarchyScore += 20;
    
    return Math.min(hierarchyScore, 100);
  }

  private analyzeReadability(textRegions: Array<{
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  }>, imageBuffer: Buffer): number {
    if (textRegions.length === 0) return 0;

    let readabilityScore = 0;
    
    // Check text size adequacy
    const averageHeight = textRegions.reduce((sum, region) => sum + region.height, 0) / textRegions.length;
    if (averageHeight >= 12) readabilityScore += 25;
    else if (averageHeight >= 10) readabilityScore += 15;
    else if (averageHeight >= 8) readabilityScore += 10;
    
    // Check text density/spacing
    const textDensity = this.calculateTextDensity(textRegions);
    if (textDensity < 0.7) readabilityScore += 25; // Good spacing
    else if (textDensity < 0.85) readabilityScore += 15; // Adequate spacing
    
    // Check OCR confidence as a proxy for text clarity
    const averageConfidence = textRegions.reduce((sum, region) => sum + region.confidence, 0) / textRegions.length;
    if (averageConfidence >= 80) readabilityScore += 25;
    else if (averageConfidence >= 60) readabilityScore += 15;
    else if (averageConfidence >= 40) readabilityScore += 10;
    
    // Check for reasonable line length
    const lineLengths = this.calculateLineLengths(textRegions);
    const averageLineLength = lineLengths.reduce((sum, length) => sum + length, 0) / lineLengths.length;
    if (averageLineLength >= 30 && averageLineLength <= 75) readabilityScore += 25;
    else if (averageLineLength >= 20 && averageLineLength <= 90) readabilityScore += 15;
    
    return Math.min(readabilityScore, 100);
  }

  private calculateTextDensity(textRegions: Array<{
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  }>): number {
    if (textRegions.length === 0) return 0;

    const totalTextArea = textRegions.reduce((sum, region) => sum + (region.width * region.height), 0);
    
    // Calculate bounding box of all text
    const minX = Math.min(...textRegions.map(r => r.x));
    const maxX = Math.max(...textRegions.map(r => r.x + r.width));
    const minY = Math.min(...textRegions.map(r => r.y));
    const maxY = Math.max(...textRegions.map(r => r.y + r.height));
    
    const boundingBoxArea = (maxX - minX) * (maxY - minY);
    
    return totalTextArea / boundingBoxArea;
  }

  private calculateLineLengths(textRegions: Array<{
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  }>): number[] {
    // Group text regions by similar Y coordinates (same line)
    const lines = new Map<number, Array<{
      text: string;
      x: number;
      y: number;
      width: number;
      height: number;
      confidence: number;
    }>>();
    
    textRegions.forEach(region => {
      const lineY = Math.round(region.y / 5) * 5; // Group by 5-pixel increments
      if (!lines.has(lineY)) {
        lines.set(lineY, []);
      }
      lines.get(lineY)!.push(region);
    });
    
    // Calculate character length for each line
    const lineLengths: number[] = [];
    for (const [, lineRegions] of lines) {
      const totalChars = lineRegions.reduce((sum, region) => sum + region.text.length, 0);
      lineLengths.push(totalChars);
    }
    
    return lineLengths;
  }

  private identifyIssues(
    textRegions: Array<{
      text: string;
      x: number;
      y: number;
      width: number;
      height: number;
      confidence: number;
    }>, 
    fontCount: number, 
    hierarchyScore: number, 
    readabilityScore: number
  ): string[] {
    const issues: string[] = [];
    
    if (fontCount > 3) {
      issues.push('Too many different font sizes detected - consider reducing for better consistency');
    }
    
    if (hierarchyScore < 50) {
      issues.push('Weak typographic hierarchy - consider creating clearer size distinctions');
    }
    
    if (readabilityScore < 60) {
      issues.push('Text readability could be improved - check font size and contrast');
    }
    
    // Check for very small text
    const smallText = textRegions.filter(region => region.height < 8);
    if (smallText.length > 0) {
      issues.push('Some text appears too small for comfortable reading');
    }
    
    // Check for low confidence text (likely hard to read)
    const lowConfidenceText = textRegions.filter(region => region.confidence < 40);
    if (lowConfidenceText.length > textRegions.length * 0.2) {
      issues.push('Some text appears unclear or hard to read');
    }
    
    return issues;
  }

  // Utility method to get typography statistics
  getTypographyStatistics(textRegions: Array<{
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  }>): {
    total_words: number;
    average_word_length: number;
    average_text_size: number;
    text_coverage: number;
  } {
    const total_words = textRegions.length;
    const average_word_length = textRegions.reduce((sum, region) => sum + region.text.length, 0) / total_words;
    const average_text_size = textRegions.reduce((sum, region) => sum + region.height, 0) / total_words;
    
    // Calculate text coverage (percentage of image area covered by text)
    const totalTextArea = textRegions.reduce((sum, region) => sum + (region.width * region.height), 0);
    const imageArea = this.calculateImageArea(textRegions);
    const text_coverage = imageArea > 0 ? (totalTextArea / imageArea) * 100 : 0;
    
    return {
      total_words,
      average_word_length,
      average_text_size,
      text_coverage
    };
  }

  private calculateImageArea(textRegions: Array<{
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  }>): number {
    if (textRegions.length === 0) return 0;
    
    const minX = Math.min(...textRegions.map(r => r.x));
    const maxX = Math.max(...textRegions.map(r => r.x + r.width));
    const minY = Math.min(...textRegions.map(r => r.y));
    const maxY = Math.max(...textRegions.map(r => r.y + r.height));
    
    return (maxX - minX) * (maxY - minY);
  }
}
