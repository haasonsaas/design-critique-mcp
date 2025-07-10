#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import { DesignAnalysisTools } from './tools/design-analysis/index.js';

const server = new Server(
  {
    name: 'design-critique-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Initialize design analysis tools
const designAnalysisTools = new DesignAnalysisTools();

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'critique_design',
        description: 'Provide comprehensive design critique with visual analysis including composition, color harmony, typography, and accessibility',
        inputSchema: {
          type: 'object',
          properties: {
            image_data: {
              type: 'string',
              description: 'Base64 encoded image data'
            },
            design_type: {
              type: 'string',
              enum: ['web', 'mobile', 'print', 'general'],
              default: 'web',
              description: 'Type of design being analyzed'
            },
            target_audience: {
              type: 'string',
              description: 'Target audience for the design (optional)'
            },
            brand_guidelines: {
              type: 'object',
              properties: {
                colors: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Brand colors in hex format'
                },
                fonts: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Brand fonts'
                }
              },
              description: 'Brand guidelines to check against (optional)'
            }
          },
          required: ['image_data']
        }
      },
      {
        name: 'analyze_color_scheme',
        description: 'Analyze color palette and harmony in a design',
        inputSchema: {
          type: 'object',
          properties: {
            image_data: {
              type: 'string',
              description: 'Base64 encoded image data'
            }
          },
          required: ['image_data']
        }
      },
      {
        name: 'analyze_layout',
        description: 'Analyze visual composition and layout structure',
        inputSchema: {
          type: 'object',
          properties: {
            image_data: {
              type: 'string',
              description: 'Base64 encoded image data'
            },
            design_type: {
              type: 'string',
              enum: ['web', 'mobile', 'print', 'general'],
              default: 'web',
              description: 'Type of design being analyzed'
            }
          },
          required: ['image_data']
        }
      },
      {
        name: 'analyze_typography',
        description: 'Analyze typography hierarchy, readability, and font usage',
        inputSchema: {
          type: 'object',
          properties: {
            image_data: {
              type: 'string',
              description: 'Base64 encoded image data'
            }
          },
          required: ['image_data']
        }
      },
      {
        name: 'analyze_accessibility',
        description: 'Analyze design accessibility including contrast, color blindness, and WCAG compliance',
        inputSchema: {
          type: 'object',
          properties: {
            image_data: {
              type: 'string',
              description: 'Base64 encoded image data'
            }
          },
          required: ['image_data']
        }
      },
      {
        name: 'check_color_contrast',
        description: 'Check contrast ratio between two specific colors',
        inputSchema: {
          type: 'object',
          properties: {
            foreground: {
              type: 'string',
              description: 'Foreground color in hex format (e.g., #000000)'
            },
            background: {
              type: 'string',
              description: 'Background color in hex format (e.g., #ffffff)'
            }
          },
          required: ['foreground', 'background']
        }
      }
    ]
  };
});

// Register all tools
designAnalysisTools.registerTools(server);

async function main() {
  console.log('Starting Design Critique MCP server...');
  
  const transport = new StdioServerTransport();
  console.log('Connecting to transport...');
  
  await server.connect(transport);
  
  console.log('Design Critique MCP server connected successfully');
  console.log('Available tools: critique_design, analyze_color_scheme, analyze_layout, analyze_typography, analyze_accessibility, check_color_contrast');
  console.log('Ready to analyze designs!');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
