import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';

import { MaintenanceService } from './maintenance.service';

@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly service: MaintenanceService) {}

  @Get()
  async findAll() {
    return this.service.findAll();
  }

  @Post()
  async create(@Body() body: any) {
    return this.service.create(body);
  }

  @Put(':id')
async update(
  @Param('id') id: string,
  @Body() body: any,
) {

  return this.service.update(
    Number(id),
    body,
  );

}

  @Patch(':id')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.service.updateStatus(
      Number(id),
      body.status,
    );
  }
}