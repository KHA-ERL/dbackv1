import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadImage(
    filePath: string,
    folder: string = 'declutter/images',
  ): Promise<string> {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder,
        resource_type: 'image',
      });
      return result.secure_url;
    } catch (error) {
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  }

  async uploadVideo(
    filePath: string,
    folder: string = 'declutter/videos',
  ): Promise<string> {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder,
        resource_type: 'video',
      });
      return result.secure_url;
    } catch (error) {
      throw new Error(`Failed to upload video: ${error.message}`);
    }
  }

  async deleteMedia(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }
}
