import { Injectable, NotFoundException } from '@nestjs/common';

import { UsersRepository } from './users.repository';
import { users } from '../database/schema';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from './user-role.type';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto';

type User = typeof users.$inferSelect;

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  findAll() {
    return this.usersRepository.findAll();
  }

  async findById(id: number) {
    const user = await this.usersRepository.findById(id);
    if (!user) throw new NotFoundException(`User with id ${id} not found`);
    return this.toPublicUser(user);
  }

  async delete(id: number) {
    const deletedUser = await this.usersRepository.softDelete(id);
    if (!deletedUser) throw new NotFoundException(`User with id ${id} not found`);
    return deletedUser;
  }

  async restore(id: number) {
    const restoredUser = await this.usersRepository.restore(id);
    if (!restoredUser) throw new NotFoundException(`User with id ${id} not found`);
    return restoredUser;
  }

  async update(id: number, dto: UpdateUserDto) {
    const data = { ...dto, email: dto.email?.trim().toLowerCase(), name: dto.name?.trim() };
    const updatedUser = await this.usersRepository.update(id, data);
    if (!updatedUser) throw new NotFoundException(`User with id ${id} not found`);
    return this.toPublicUser(updatedUser);
  }

  async updateAdmin(id: number, dto: UpdateUserAdminDto) {
    const data = { ...dto, email: dto.email?.trim().toLowerCase(), name: dto.name?.trim() };
    const updatedUser = await this.usersRepository.update(id, data);
    if (!updatedUser) throw new NotFoundException(`User with id ${id} not found`);
    return this.toPublicUser(updatedUser);
  }

  async updateRole(id: number, role: UserRole) {
    const updatedUser = await this.usersRepository.updateRole(id, role);
    if (!updatedUser) throw new NotFoundException(`User with id ${id} not found`);
    return this.toPublicUser(updatedUser);
  }

  private toPublicUser(user: User) {
    const publicUser = { ...user };
    delete publicUser.passwordHash;
    delete publicUser.deletedAt;
    return publicUser;
  }
}
