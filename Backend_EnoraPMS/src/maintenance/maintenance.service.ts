import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, StatusManutencao } from '@prisma/client';

@Injectable()
export class MaintenanceService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.manutencao.findMany({
      orderBy: {
        criadoEm: 'desc', 
      },
      include: {
        quarto: true, 
      }
    });
  }

  async create(data: Prisma.ManutencaoUncheckedCreateInput) {
    return this.prisma.manutencao.create({
      data,
    });
  }

  async update(id: number, data: Prisma.ManutencaoUncheckedUpdateInput) {
    return this.prisma.manutencao.update({
      where: { id },
      data,
    });
  }

  async updateStatus(id: number, status: StatusManutencao) {
    return this.prisma.manutencao.update({
      where: { id },
      data: { status },
    });
  }
}