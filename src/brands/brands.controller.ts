import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { Roles } from '../auth/roles.decorator';
import { Public } from '../common/decorators/public.decorator';

import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Controller('brands')
export class BrandsController {
  constructor(
    private readonly brandsService: BrandsService,
  ) {}

  @Public()
  @Get()
  findAll() {
    return this.brandsService.findAll();
  }

  @Public()
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.brandsService.findById(
      Number(id),
    );
  }

  @Roles('manager')
  @Post()
  create(@Body() dto: CreateBrandDto) {
    return this.brandsService.create(dto);
  }

  @Roles('manager')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBrandDto,
  ) {
    return this.brandsService.update(
      Number(id),
      dto,
    );
  }

  @Roles('manager')
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.brandsService.delete(
      Number(id),
    );
  }

    @Roles('manager')
    @Patch(':id/restore')
    restore(@Param('id') id: string) {
        return this.brandsService.restore(
            Number(id),
        );
    }
}