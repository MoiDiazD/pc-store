import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { BrandsRepository } from './brands.repository';

@Injectable()
export class BrandsService {
  constructor(
    private readonly brandsRepository: BrandsRepository,
  ) {}

  findAll() {
    return this.brandsRepository.findAll();
  }

  async findById(id: number) {
    const brand = await this.brandsRepository.findById(id);

    if (!brand) {
      throw new NotFoundException(
        `Brand with id ${id} not found`,
      );
    }

    return brand;
  }

  create(dto: CreateBrandDto) {
    return this.brandsRepository.create({
      name: dto.name.trim(),
    });
  }

  async update(
    id: number,
    dto: UpdateBrandDto,
  ) {
    const updatedBrand =
      await this.brandsRepository.update(id, {
        name: dto.name?.trim(),
      });

    if (!updatedBrand) {
      throw new NotFoundException(
        `Brand with id ${id} not found`,
      );
    }

    return updatedBrand;
  }

  async delete(id: number) {
    const deletedBrand =
      await this.brandsRepository.softDelete(id);

    if (!deletedBrand) {
      throw new NotFoundException(
        `Brand with id ${id} not found`,
      );
    }

    return deletedBrand;
  }

  async restore(id: number) {
    const restoredBrand =
        await this.brandsRepository.restore(id);

    if (!restoredBrand) {
        throw new NotFoundException(
        `Brand with id ${id} not found`,
        );
    }

    return restoredBrand;
    }
}