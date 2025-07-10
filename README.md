# Design Critique MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-green.svg)](https://modelcontextprotocol.com)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)

A Model Context Protocol (MCP) server that provides comprehensive visual design analysis and critique capabilities. This server enables AI assistants to analyze design images for composition, color harmony, typography, and accessibility compliance.

## Features

- **Comprehensive Design Critique**: Analyzes overall design quality with actionable recommendations
- **Color Analysis**: Extracts color palettes, analyzes harmony, and checks contrast ratios
- **Composition Analysis**: Evaluates visual balance, grid alignment, and layout structure
- **Typography Analysis**: Assesses font hierarchy, readability, and consistency
- **Accessibility Compliance**: WCAG 2.1 compliance checking with color blindness simulation
- **Multi-Format Support**: Works with web, mobile, print, and general design formats
- **Real-time Analysis**: Fast image processing with optimized algorithms

## Prerequisites

- Node.js 18 or later
- npm or yarn package manager
- Canvas dependencies (automatically installed)

## Installation

### Quick Install for Cursor

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/install-mcp?name=design-critique&config=eyJjb21tYW5kIjoibm9kZSIsImFyZ3MiOlsiL3BhdGgvdG8vZGVzaWduLWNyaXRpcXVlLW1jcC9kaXN0L2luZGV4LmpzIl19)

*Note: After installation, update the file path to your actual installation directory.*

### Manual Installation

1. Clone the repository:
```bash
git clone https://github.com/haasonsaas/design-critique-mcp.git
cd design-critique-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Configuration

### Claude Desktop Configuration

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "design-critique": {
      "command": "node",
      "args": ["/path/to/design-critique-mcp/dist/index.js"]
    }
  }
}
```

## Available Tools

### critique_design
Provides comprehensive design critique with visual analysis including composition, color harmony, typography, and accessibility.

**Parameters:**
- `image_data` (required): Base64 encoded image data
- `design_type`: Type of design - `"web"`, `"mobile"`, `"print"`, or `"general"` (default: `"web"`)
- `target_audience`: Target audience description (optional)
- `brand_guidelines`: Brand guidelines object (optional)
  - `colors`: Array of brand colors in hex format
  - `fonts`: Array of brand font names

**Returns:** Comprehensive analysis including:
- Overall score (0-100)
- Composition analysis with balance and grid alignment
- Color analysis with harmony score and palette
- Typography assessment with hierarchy and readability scores
- Accessibility report with WCAG compliance
- Actionable recommendations

### analyze_color_scheme
Analyzes color palette and harmony in a design.

**Parameters:**
- `image_data` (required): Base64 encoded image data

**Returns:**
- Dominant colors with hex codes
- Color harmony analysis
- Contrast issues
- Color relationships (complementary, analogous, etc.)

### analyze_layout
Analyzes visual composition and layout structure.

**Parameters:**
- `image_data` (required): Base64 encoded image data
- `design_type`: Type of design - `"web"`, `"mobile"`, `"print"`, or `"general"` (default: `"web"`)

**Returns:**
- Layout score (0-100)
- Balance assessment (symmetrical/asymmetrical)
- Grid alignment detection
- Visual hierarchy analysis
- White space evaluation

### analyze_typography
Analyzes typography hierarchy, readability, and font usage.

**Parameters:**
- `image_data` (required): Base64 encoded image data

**Returns:**
- Font count and families detected
- Hierarchy score (0-100)
- Readability score (0-100)
- Typography issues and recommendations

### analyze_accessibility
Analyzes design accessibility including contrast, color blindness, and WCAG compliance.

**Parameters:**
- `image_data` (required): Base64 encoded image data

**Returns:**
- Accessibility score (0-100)
- Contrast ratio checks
- Color blindness simulation results
- WCAG compliance issues
- Accessibility recommendations

### check_color_contrast
Checks contrast ratio between two specific colors.

**Parameters:**
- `foreground` (required): Foreground color in hex format (e.g., "#000000")
- `background` (required): Background color in hex format (e.g., "#ffffff")

**Returns:**
- Contrast ratio
- WCAG AA compliance (pass/fail)
- WCAG AAA compliance (pass/fail)
- Recommended use cases

## Example Usage

### Basic Design Critique
```javascript
// In Claude Desktop
const result = await critique_design({
  image_data: "base64_encoded_image_data_here",
  design_type: "web",
  target_audience: "Young professionals aged 25-35"
});
```

### Check Specific Color Contrast
```javascript
const contrast = await check_color_contrast({
  foreground: "#333333",
  background: "#f0f0f0"
});
// Returns: { ratio: 11.2, passes_aa: true, passes_aaa: true }
```

### Analyze Mobile App Design
```javascript
const analysis = await critique_design({
  image_data: "base64_encoded_image_data",
  design_type: "mobile",
  brand_guidelines: {
    colors: ["#FF5722", "#00BCD4", "#FFC107"],
    fonts: ["Roboto", "Open Sans"]
  }
});
```

## Use Cases

### Design Reviews
- Automated design quality assessment
- Consistency checking across design systems
- Pre-launch design validation

### Accessibility Auditing
- WCAG compliance verification
- Color contrast validation
- Color blindness impact assessment

### Design Education
- Learning design principles through AI feedback
- Understanding composition and color theory
- Improving typography choices

### Brand Compliance
- Checking designs against brand guidelines
- Ensuring consistent visual language
- Validating color palette usage

## Development

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Type check
npm run typecheck
```

## Architecture

The server uses a modular architecture with specialized analyzers:

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  MCP Client     │────▶│  Design Analysis │────▶│   Analyzers     │
│  (Claude)       │     │     Server       │     │  - Color        │
│                 │◀────│                  │     │  - Composition  │
└─────────────────┘     └──────────────────┘     │  - Typography   │
                                                  │  - Accessibility│
                                                  └─────────────────┘
```

## Image Processing

- Supports common image formats (PNG, JPEG, WebP)
- Automatic image optimization for faster processing
- Maximum image size: 10MB
- Recommended resolution: 1920x1080 for web designs

## Performance

- Average analysis time: 2-5 seconds per image
- Concurrent request handling
- Memory-efficient image processing
- Caching for repeated analyses

## Troubleshooting

### "Invalid image data"
- Ensure the image is properly base64 encoded
- Check that the image format is supported
- Verify the image size is under 10MB

### "Canvas not found" error
- Run `npm install canvas` to install native dependencies
- On macOS: May need to install Cairo graphics library
- On Linux: Install required system dependencies

### Analysis taking too long
- Large images may take longer to process
- Consider resizing images before analysis
- Check system resources (CPU/memory)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**Jonathan Haas** - [GitHub Profile](https://github.com/haasonsaas)

## Acknowledgments

- Built for integration with Anthropic's Claude via MCP
- Uses sharp for image processing
- Powered by chroma-js for color analysis
- Typography detection with Tesseract.js
- Accessibility standards from WCAG 2.1

## Support

If you encounter any issues or have questions:
- Open an issue on [GitHub Issues](https://github.com/haasonsaas/design-critique-mcp/issues)
- Review the [troubleshooting section](#troubleshooting) above
- Check the [MCP documentation](https://modelcontextprotocol.com)