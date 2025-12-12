import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async createProduct(
    userId: number,
    createProductDto: CreateProductDto,
    imageUrls: string[],
    videoUrls: string[],
  ) {
    const quantity =
      createProductDto.type === 'Online Store'
        ? createProductDto.quantity || 1
        : 1;

    return this.prisma.product.create({
      data: {
        sellerId: userId,
        name: createProductDto.name,
        description: createProductDto.description || '',
        price: createProductDto.price,
        condition: createProductDto.condition || '',
        locationState: createProductDto.locationState || '',
        deliveryFee: createProductDto.deliveryFee || 0,
        type: createProductDto.type,
        quantity,
        images: imageUrls,
        videos: videoUrls,
        active: true,
      },
      include: {
        seller: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  }

  async listProducts(
    skip: number = 0,
    limit: number = 50,
    search?: string,
    condition?: string,
    location?: string,
  ) {
    const where: any = {
      isDisabled: false,
      active: true,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (condition) {
      where.condition = { equals: condition, mode: 'insensitive' };
    }

    if (location) {
      where.locationState = { contains: location, mode: 'insensitive' };
    }

    return this.prisma.product.findMany({
      where,
      skip,
      take: limit,
      include: {
        seller: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getProduct(productId: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        seller: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }
}
