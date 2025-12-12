import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RoleEnum } from '@prisma/client';
import { safeParseInt } from '../../common/utils/parse-int.util';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  async getMe(@CurrentUser('id') userId: number) {
    return this.usersService.getMe(userId);
  }

  @Put('me')
  async updateMe(@CurrentUser('id') userId: number, @Body() updateData: UpdateUserDto) {
    return this.usersService.updateMe(userId, updateData);
  }

  @Get()
  @Roles(RoleEnum.admin)
  async listUsers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.usersService.listUsers(safeParseInt(page, 1), safeParseInt(limit, 10));
  }
}
