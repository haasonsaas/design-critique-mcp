import sharp from 'sharp';
import Jimp from 'jimp';
import { ImageMetadata } from '../models/design-types.js';

export class ImageHandler {
  private static readonly MAX_SIZE_MB = 1;
  private static readonly MAX_DIMENSION = 1920;

  static async decodeBase64Image(imageData: string): Promise<Buffer> {
    try {
      // Remove data URL prefix if present
      const base64Data = imageData.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
      return Buffer.from(base64Data, 'base64');
    } catch (error) {
      throw new Error(`Failed to decode base64 image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async encodeImageToBase64(buffer: Buffer, format: string = 'png'): Promise<string> {
    try {
      const base64 = buffer.toString('base64');
      return `data:image/${format};base64,${base64}`;
    } catch (error) {
      throw new Error(`Failed to encode image to base64: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async optimizeImage(buffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(buffer)
        .resize(this.MAX_DIMENSION, this.MAX_DIMENSION, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 90 })
        .toBuffer();
    } catch (error) {
      throw new Error(`Failed to optimize image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async validateImageSize(buffer: Buffer): Promise<boolean> {
    const sizeInMB = buffer.length / (1024 * 1024);
    return sizeInMB <= this.MAX_SIZE_MB;
  }

  static async getImageMetadata(buffer: Buffer): Promise<ImageMetadata> {
    try {
      const metadata = await sharp(buffer).metadata();
      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: buffer.length,
        aspect_ratio: metadata.width && metadata.height ? metadata.width / metadata.height : undefined
      };
    } catch (error) {
      throw new Error(`Failed to get image metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async validateImage(buffer: Buffer): Promise<void> {
    // Check if it's a valid image
    try {
      await sharp(buffer).metadata();
    } catch (error) {
      throw new Error('Invalid image data provided');
    }

    // Check file size
    if (!(await this.validateImageSize(buffer))) {
      throw new Error(`Image size exceeds ${this.MAX_SIZE_MB}MB limit`);
    }
  }

  static async loadImageFromBuffer(buffer: Buffer): Promise<Jimp> {
    try {
      return await Jimp.read(buffer);
    } catch (error) {
      throw new Error(`Failed to load image from buffer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async annotateImage(buffer: Buffer, annotations: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    color?: string;
  }>): Promise<Buffer> {
    try {
      const image = await Jimp.read(buffer);
      
      // Create a copy for annotation
      const annotatedImage = image.clone();

      // Draw annotations (simplified - Jimp doesn't have built-in text/rectangle drawing)
      annotations.forEach(annotation => {
        const { x, y, width, height, color = '#ff0000' } = annotation;
        
        // Draw simple colored pixels for rectangle outline
        const colorInt = Jimp.cssColorToHex(color);
        
        // Draw rectangle outline
        for (let i = 0; i < width; i++) {
          if (x + i < annotatedImage.getWidth()) {
            if (y < annotatedImage.getHeight()) annotatedImage.setPixelColor(colorInt, x + i, y);
            if (y + height < annotatedImage.getHeight()) annotatedImage.setPixelColor(colorInt, x + i, y + height);
          }
        }
        for (let i = 0; i < height; i++) {
          if (y + i < annotatedImage.getHeight()) {
            if (x < annotatedImage.getWidth()) annotatedImage.setPixelColor(colorInt, x, y + i);
            if (x + width < annotatedImage.getWidth()) annotatedImage.setPixelColor(colorInt, x + width, y + i);
          }
        }
      });

      return await annotatedImage.getBufferAsync(Jimp.MIME_PNG);
    } catch (error) {
      throw new Error(`Failed to annotate image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
