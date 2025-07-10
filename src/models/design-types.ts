import { z } from 'zod';

// Design analysis input schema
export const DesignAnalysisInputSchema = z.object({
  image_data: z.string().describe('Base64 encoded image data'),
  design_type: z.enum(['web', 'mobile', 'print', 'general']).default('web'),
  target_audience: z.string().optional(),
  brand_guidelines: z.object({
    colors: z.array(z.string()).optional(),
    fonts: z.array(z.string()).optional()
  }).optional()
});

// Design critique response schema
export const DesignCritiqueSchema = z.object({
  overall_score: z.number().min(0).max(100),
  composition: z.object({
    score: z.number(),
    grid_alignment: z.boolean(),
    visual_hierarchy: z.array(z.string()),
    balance: z.enum(['symmetric', 'asymmetric', 'radial'])
  }),
  color_analysis: z.object({
    palette: z.array(z.string()),
    harmony_score: z.number(),
    harmony_type: z.string().optional(),
    contrast_issues: z.array(z.object({
      foreground: z.string(),
      background: z.string(),
      contrast_ratio: z.number(),
      wcag_level: z.enum(['fail', 'AA', 'AAA'])
    }))
  }),
  typography: z.object({
    font_count: z.number(),
    hierarchy_score: z.number(),
    readability_score: z.number(),
    issues: z.array(z.string())
  }),
  accessibility: z.object({
    score: z.number(),
    issues: z.array(z.string()),
    recommendations: z.array(z.string())
  }),
  recommendations: z.array(z.string()),
  annotated_image: z.string().optional()
});

// Color analysis schema
export const ColorAnalysisSchema = z.object({
  palette: z.array(z.string()),
  harmony_score: z.number(),
  harmony_type: z.string(),
  contrast_issues: z.array(z.object({
    foreground: z.string(),
    background: z.string(),
    contrast_ratio: z.number(),
    wcag_level: z.enum(['fail', 'AA', 'AAA'])
  }))
});

// Layout analysis schema
export const LayoutAnalysisSchema = z.object({
  score: z.number(),
  grid_alignment: z.boolean(),
  visual_hierarchy: z.array(z.string()),
  balance: z.enum(['symmetric', 'asymmetric', 'radial']),
  spacing_consistency: z.boolean().optional(),
  alignment_score: z.number().optional()
});

// Image metadata schema
export const ImageMetadataSchema = z.object({
  width: z.number(),
  height: z.number(),
  format: z.string(),
  size: z.number(),
  aspect_ratio: z.number().optional()
});

// Error response schema
export const DesignErrorSchema = z.object({
  error: z.string(),
  isError: z.boolean(),
  details: z.string().optional()
});

// Type exports
export type DesignAnalysisInput = z.infer<typeof DesignAnalysisInputSchema>;
export type DesignCritique = z.infer<typeof DesignCritiqueSchema>;
export type ColorAnalysis = z.infer<typeof ColorAnalysisSchema>;
export type LayoutAnalysis = z.infer<typeof LayoutAnalysisSchema>;
export type ImageMetadata = z.infer<typeof ImageMetadataSchema>;
export type DesignError = z.infer<typeof DesignErrorSchema>;

// Design tool response type
export type DesignToolResponse = DesignCritique | ColorAnalysis | LayoutAnalysis | DesignError;
