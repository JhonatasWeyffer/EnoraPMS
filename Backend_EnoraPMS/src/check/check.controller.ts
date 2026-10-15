import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  Req,
  Body,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CheckService } from './check.service';
import { CheckOperationDto } from './check.dto';
import type { Request } from 'express';

@Controller('check')
@UseGuards(AuthGuard('jwt'))
export class CheckController {
  constructor(private readonly checkService: CheckService) {}

  @Post('pre/:hospedeId')
  preCheckin(@Param('hospedeId') hospedeId: string, @Req() req: Request) {
    const operadorId = (req as any).user.sub;
    return this.checkService.preCheckin(hospedeId, operadorId);
  }

  @Post('in/:hospedeId')
  checkin(
    @Param('hospedeId') hospedeId: string, 
    @Req() req: Request,
    @Body() body: CheckOperationDto
  ) {
    const operadorId = (req as any).user.sub;
    return this.checkService.checkin(hospedeId, operadorId, body);
  }

  @Post('out/:hospedeId')
  checkout(
    @Param('hospedeId') hospedeId: string, 
    @Req() req: Request,
    @Body() body: CheckOperationDto
  ) {
    const operadorId = (req as any).user.sub;
    return this.checkService.checkout(hospedeId, operadorId, body);
  }

  @Post('noshow/:hospedeId')
  noShow(@Param('hospedeId') hospedeId: string, @Req() req: Request) {
    const operadorId = (req as any).user.sub;
    return this.checkService.noShow(hospedeId, operadorId);
  }

  @Get('hospede/:hospedeId')
  getHospedeStatus(@Param('hospedeId') hospedeId: string) {
    return this.checkService.getHospedeStatus(hospedeId);
  }

  @Get('search-guests')
  searchGuests(@Query('q') query: string) {
    return this.checkService.searchGuests(query);
  }

  @Get('atrasos')
  getAtrasos() {
    return this.checkService.getAtrasos();
  }
}