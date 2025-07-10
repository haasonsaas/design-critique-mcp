import chroma from 'chroma-js';
import sharp from 'sharp';
import Vibrant from 'node-vibrant';
import { ColorAnalysis } from '../models/design-types.js';

export class ColorAnalyzer {

  constructor() {
  }

  async extractPalette(imageBuffer: Buffer, colorCount: number = 8): Promise<string[]> {
    try {
      // Use node-vibrant for better color extraction
      const palette = await Vibrant.from(imageBuffer).getPalette();
      const colors: string[] = [];
      
      // Extract colors from Vibrant palette
      if (palette.Vibrant) colors.push(palette.Vibrant.hex);
      if (palette.Muted) colors.push(palette.Muted.hex);
      if (palette.DarkVibrant) colors.push(palette.DarkVibrant.hex);
      if (palette.DarkMuted) colors.push(palette.DarkMuted.hex);
      if (palette.LightVibrant) colors.push(palette.LightVibrant.hex);
      if (palette.LightMuted) colors.push(palette.LightMuted.hex);
      
      // If we need more colors, extract additional ones using sharp
      if (colors.length < colorCount) {
        const additionalColors = await this.extractAdditionalColors(imageBuffer, colorCount - colors.length);
        colors.push(...additionalColors);
      }
      
      return colors.slice(0, colorCount);
    } catch (error) {
      // Fallback: use sharp-based extraction
      return this.extractColorsFromSharp(imageBuffer, colorCount);
    }
  }

  private async extractAdditionalColors(imageBuffer: Buffer, count: number): Promise<string[]> {
    try {
      const { data, info } = await sharp(imageBuffer)
        .raw()
        .toBuffer({ resolveWithObject: true });
      
      return this.extractColorsFromRawData(data, info.width, info.height, count);
    } catch {
      return [];
    }
  }

  private async extractColorsFromSharp(imageBuffer: Buffer, colorCount: number): Promise<string[]> {
    try {
      const { data, info } = await sharp(imageBuffer)
        .raw()
        .toBuffer({ resolveWithObject: true });
      
      return this.extractColorsFromRawData(data, info.width, info.height, colorCount);
    } catch {
      return ['#000000', '#333333', '#666666', '#999999', '#cccccc', '#ffffff'].slice(0, colorCount);
    }
  }

  private extractColorsFromRawData(data: Buffer, width: number, height: number, colorCount: number): string[] {
    const colorMap = new Map<string, number>();

    // Sample every 10th pixel for performance (RGB data)
    for (let i = 0; i < data.length; i += 30) { // 3 channels * 10 pixels
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      try {
        const color = chroma([r, g, b]).hex();
        colorMap.set(color, (colorMap.get(color) || 0) + 1);
      } catch {
        // Skip invalid colors
      }
    }

    // Sort by frequency and return top colors
    const sortedColors = Array.from(colorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, colorCount)
      .map(([color]) => color);

    return sortedColors.length > 0 ? sortedColors : ['#000000', '#ffffff'];
  }

  analyzeColorHarmony(colors: string[]): {
    harmony_type: string;
    score: number;
  } {
    if (colors.length < 2) {
      return { harmony_type: 'insufficient_colors', score: 0 };
    }

    const colorObjects = colors.map(c => {
      try {
        return chroma(c);
      } catch {
        return chroma('#000000'); // Fallback for invalid colors
      }
    });
    
    // Check for complementary colors
    let complementaryScore = 0;
    for (let i = 0; i < colorObjects.length - 1; i++) {
      for (let j = i + 1; j < colorObjects.length; j++) {
        const hue1 = colorObjects[i].get('hsl.h') || 0;
        const hue2 = colorObjects[j].get('hsl.h') || 0;
        const hueDiff = Math.abs(hue1 - hue2);
        
        if (hueDiff > 170 && hueDiff < 190) {
          complementaryScore += 1;
        }
      }
    }

    // Check for analogous colors
    const hues = colorObjects.map(c => c.get('hsl.h') || 0);
    const hueRange = Math.max(...hues) - Math.min(...hues);
    
    // Check for triadic colors
    const triadicScore = this.checkTriadicHarmony(hues);

    // Determine harmony type and score
    if (complementaryScore > 0) {
      return { harmony_type: 'complementary', score: Math.min(85 + complementaryScore * 5, 100) };
    }

    if (triadicScore > 0) {
      return { harmony_type: 'triadic', score: Math.min(80 + triadicScore * 5, 100) };
    }

    if (hueRange < 60) {
      return { harmony_type: 'analogous', score: 80 };
    }

    if (hueRange < 120) {
      return { harmony_type: 'split_complementary', score: 70 };
    }

    return { harmony_type: 'mixed', score: 60 };
  }

  private checkTriadicHarmony(hues: number[]): number {
    let triadicCount = 0;
    for (let i = 0; i < hues.length - 2; i++) {
      for (let j = i + 1; j < hues.length - 1; j++) {
        for (let k = j + 1; k < hues.length; k++) {
          const sortedHues = [hues[i], hues[j], hues[k]].sort((a, b) => a - b);
          const diff1 = sortedHues[1] - sortedHues[0];
          const diff2 = sortedHues[2] - sortedHues[1];
          const diff3 = (360 - sortedHues[2]) + sortedHues[0];
          
          if (Math.abs(diff1 - 120) < 30 && Math.abs(diff2 - 120) < 30 && Math.abs(diff3 - 120) < 30) {
            triadicCount++;
          }
        }
      }
    }
    return triadicCount;
  }

  calculateContrast(foreground: string, background: string): number {
    try {
      const fg = chroma(foreground);
      const bg = chroma(background);
      return chroma.contrast(fg, bg);
    } catch {
      return 1; // Fallback for invalid colors
    }
  }

  checkAccessibility(foreground: string, background: string): {
    contrast_ratio: number;
    wcag_aa: boolean;
    wcag_aaa: boolean;
    wcag_level: 'fail' | 'AA' | 'AAA';
  } {
    const ratio = this.calculateContrast(foreground, background);
    const wcag_aa = ratio >= 4.5;
    const wcag_aaa = ratio >= 7;
    
    let wcag_level: 'fail' | 'AA' | 'AAA' = 'fail';
    if (wcag_aaa) wcag_level = 'AAA';
    else if (wcag_aa) wcag_level = 'AA';
    
    return {
      contrast_ratio: ratio,
      wcag_aa,
      wcag_aaa,
      wcag_level
    };
  }

  async analyzeColors(imageBuffer: Buffer): Promise<ColorAnalysis> {
    const palette = await this.extractPalette(imageBuffer);
    const harmony = this.analyzeColorHarmony(palette);
    
    // Check contrast between primary colors
    const contrast_issues = [];
    for (let i = 0; i < Math.min(palette.length - 1, 3); i++) {
      for (let j = i + 1; j < Math.min(palette.length, 4); j++) {
        const accessibility = this.checkAccessibility(palette[i], palette[j]);
        
        if (!accessibility.wcag_aa) {
          contrast_issues.push({
            foreground: palette[i],
            background: palette[j],
            contrast_ratio: accessibility.contrast_ratio,
            wcag_level: accessibility.wcag_level
          });
        }
      }
    }

    return {
      palette,
      harmony_score: harmony.score,
      harmony_type: harmony.harmony_type,
      contrast_issues
    };
  }

  // Utility method to get color statistics
  getColorStatistics(colors: string[]): {
    brightness_avg: number;
    saturation_avg: number;
    hue_diversity: number;
  } {
    const colorObjects = colors.map(c => {
      try {
        return chroma(c);
      } catch {
        return chroma('#000000');
      }
    });

    const brightness_avg = colorObjects.reduce((sum, c) => sum + c.get('hsl.l'), 0) / colorObjects.length;
    const saturation_avg = colorObjects.reduce((sum, c) => sum + c.get('hsl.s'), 0) / colorObjects.length;
    
    const hues = colorObjects.map(c => c.get('hsl.h') || 0);
    const hueRange = Math.max(...hues) - Math.min(...hues);
    const hue_diversity = hueRange / 360;

    return {
      brightness_avg,
      saturation_avg,
      hue_diversity
    };
  }
}
