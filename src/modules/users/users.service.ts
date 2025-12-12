import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getMe(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        whatsapp: true,
        houseAddress: true,
        substituteAddress: true,
        bankAccountNumber: true,
        bankName: true,
        role: true,
        acceptedTermsAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateMe(userId: number, updateData: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
  }

  async listUsers(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count(),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}
