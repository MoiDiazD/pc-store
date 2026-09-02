import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';


@Controller('products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) {}
    
    @Get(':id')
    findById(@Param('id') id: string) {
        return this.productsService.findById(Number(id));
    }

    @Get()
    findAll() {
        return this.productsService.findAll();
    }

    @Post()
    create(@Body() product: CreateProductDto) {
        return this.productsService.create(product);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() product: UpdateProductDto
    ) {
        return this.productsService.update(Number(id), product);
    }

    @Delete(':id')
    async delete(@Param('id') id: string) {
        const result = await this.productsService.delete(Number(id));

        console.log('CONTROLLER RESULT:', result);

        return result;
    }
}
