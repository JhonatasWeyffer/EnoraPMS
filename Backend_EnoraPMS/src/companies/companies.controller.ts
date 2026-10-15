import { Controller, Get, Post, Body, Param, ParseIntPipe, Delete, Put } from '@nestjs/common';
import { CompaniesService } from './companies.service';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  async getAllCompanies() {
    return await this.companiesService.findAll();
  }

  @Post()
  async createNewNewCompany(
    @Body() body: { razaoSocial: string; cnpj: string; desconto: number; contatoFinanceiroNome?: string; contatoFinanceiroTipoDoc?: string; contatoFinanceiroNumDoc?: string },
  ) {
    return await this.companiesService.createCompany(body);
  }

  @Post(':id/employees')
  async addEmployeeToCompany(
    @Param('id', ParseIntPipe) companyId: number,
    @Body() body: { hospedeId: string },
  ) {
    return await this.companiesService.createEmployee(companyId, body);
  }

  @Post(':id/close-invoice')
  async closeCompanyInvoice(
    @Param('id', ParseIntPipe) companyId: number,
    @Body('employeeIds') employeeIds: number[],
  ) {
    return await this.companiesService.closeInvoice(companyId, employeeIds);
  }

  @Delete(':id')
  async deleteCompany(@Param('id', ParseIntPipe) id: number) {
    return await this.companiesService.removeCompany(id);
  }

  @Delete('employees/:employeeId')
  async deleteEmployee(@Param('employeeId', ParseIntPipe) employeeId: number) {
    return await this.companiesService.removeEmployee(employeeId);
  }

  @Put(':id/finance-resp')
  async updateFinanceResp(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { contatoFinanceiroNome: string; contatoFinanceiroTipoDoc: string; contatoFinanceiroNumDoc: string },
  ) {
    return await this.companiesService.updateFinanceResp(id, body);
  }
}