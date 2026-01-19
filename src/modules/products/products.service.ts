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

    // Accept both camelCase and snake_case from frontend
    const locationState = createProductDto.locationState || createProductDto.location_state || '';
    const deliveryFee = createProductDto.deliveryFee || createProductDto.delivery_fee || 0;

    return this.prisma.product.create({
      data: {
        sellerId: userId,
        name: createProductDto.name,
        description: createProductDto.description || '',
        price: createProductDto.price,
        condition: createProductDto.condition || '',
        conditionRating: createProductDto.conditionRating ?? null,
        locationState,
        deliveryFee,
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

  async updateProduct(
    productId: number,
    userId: number,
    updateData: {
      price?: number;
      quantity?: number;
      outOfStock?: boolean;
      active?: boolean;
    },
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.sellerId !== userId) {
      throw new NotFoundException('You can only update your own products');
    }

    const dataToUpdate: any = {};

    if (updateData.price !== undefined) {
      dataToUpdate.price = updateData.price;
    }

    if (updateData.quantity !== undefined && product.type === 'Online Store') {
      dataToUpdate.quantity = updateData.quantity;
    }

    if (updateData.outOfStock !== undefined && product.type === 'Online Store') {
      dataToUpdate.outOfStock = updateData.outOfStock;
    }

    if (updateData.active !== undefined) {
      dataToUpdate.active = updateData.active;
    }

    return this.prisma.product.update({
      where: { id: productId },
      data: dataToUpdate,
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
}
