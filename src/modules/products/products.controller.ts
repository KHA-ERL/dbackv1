import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { CloudinaryService } from '../../services/cloudinary.service';
import { CreateProductDto } from './dto/create-product.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import * as fs from 'fs';
import * as path from 'path';

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_VIDEO_SIZE = 5 * 1024 * 1024; // 5MB

@Controller('products')
export class ProductsController {
  constructor(
    private productsService: ProductsService,
    private cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'images', maxCount: 4 },
      { name: 'videos', maxCount: 2 },
    ]),
  )
  async createProduct(
    @CurrentUser('id') userId: number,
    @Body() createProductDto: CreateProductDto,
    @UploadedFiles()
    files: { images?: Express.Multer.File[]; videos?: Express.Multer.File[] },
  ) {
    const images = files?.images || [];
    const videos = files?.videos || [];

    // Validate file sizes
    for (const img of images) {
      if (img.size > MAX_IMAGE_SIZE) {
        throw new BadRequestException(
          `Image ${img.originalname} too large (max 2MB)`,
        );
      }
    }

    for (const vid of videos) {
      if (vid.size > MAX_VIDEO_SIZE) {
        throw new BadRequestException(
          `Video ${vid.originalname} too large (max 5MB)`,
        );
      }
    }

    // Upload to Cloudinary
    const imageUrls: string[] = [];
    const videoUrls: string[] = [];

    try {
      for (const img of images) {
        const url = await this.cloudinaryService.uploadImage(img.path);
        imageUrls.push(url);
        // Clean up temp file
        fs.unlinkSync(img.path);
      }

      for (const vid of videos) {
        const url = await this.cloudinaryService.uploadVideo(vid.path);
        videoUrls.push(url);
        // Clean up temp file
        fs.unlinkSync(vid.path);
      }

      return this.productsService.createProduct(
        userId,
        createProductDto,
        imageUrls,
        videoUrls,
      );
    } catch (error) {
      // Clean up uploaded files on error
      images.forEach((img) => {
        if (fs.existsSync(img.path)) fs.unlinkSync(img.path);
      });
      videos.forEach((vid) => {
        if (fs.existsSync(vid.path)) fs.unlinkSync(vid.path);
      });
      throw error;
    }
  }

  @Get()
  async listProducts(
    @Query('skip') skip: string = '0',
    @Query('limit') limit: string = '50',
    @Query('search') search?: string,
    @Query('condition') condition?: string,
    @Query('location') location?: string,
  ) {
    return this.productsService.listProducts(
      parseInt(skip),
      parseInt(limit),
      search,
      condition,
      location,
    );
  }

  @Get(':id')
  async getProduct(@Param('id') id: string) {
    return this.productsService.getProduct(parseInt(id));
  }
}
