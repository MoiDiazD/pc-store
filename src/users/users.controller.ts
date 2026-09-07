import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Req,
} from '@nestjs/common';

import type { FastifyRequest } from 'fastify';

import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
import { Roles } from '../auth/roles.decorator';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @Get('me')
  me(@Req() request: FastifyRequest) {
    return this.usersService.findById(
      request.user!.id,
    );
  }

  @Patch('me')
  updateMe(
    @Req() request: FastifyRequest,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(
      request.user!.id,
      dto,
    );
  }

  @Roles('manager')
  @Get(':id')
  findById(
    @Param('id') id: string,
  ) {
    return this.usersService.findById(
      Number(id),
    );
  }

  @Roles('manager')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserAdminDto,
  ) {
    return this.usersService.updateAdmin(
      Number(id),
      dto,
    );
  }

  @Roles('manager')
  @Delete(':id')
  delete(
    @Param('id') id: string,
  ) {
    return this.usersService.delete(
      Number(id),
    );
  }

  @Roles('manager')
  @Patch(':id/role')
  updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.usersService.updateRole(
      Number(id),
      dto.role,
    );
  }
}