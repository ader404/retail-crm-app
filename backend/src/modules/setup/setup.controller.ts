import { Controller, Get, Post, Body, ForbiddenException } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { SetupService } from './setup.service'
import { BootstrapAdminDto } from './dto/bootstrap-admin.dto'
import { TestConnectionDto } from './dto/test-connection.dto'

// Intentionally unauthenticated: this endpoint exists only to create the very
// first administrator account during the desktop setup wizard, when no JWT
// could possibly exist yet. It self-locks — bootstrapAdmin() refuses once any
// user already exists, so it cannot be used to create a second admin or
// escalate an existing install.
@ApiTags('setup')
@Controller('setup')
export class SetupController {
  constructor(private readonly setupService: SetupService) {}

  @Get('status')
  status() {
    return this.setupService.status()
  }

  @Post('bootstrap-admin')
  async bootstrapAdmin(@Body() dto: BootstrapAdminDto) {
    const { isComplete } = await this.setupService.status()
    if (isComplete) throw new ForbiddenException('Setup already completed — an administrator account already exists')
    return this.setupService.bootstrapAdmin(dto)
  }

  @Post('test-connection')
  testConnection(@Body() dto: TestConnectionDto) {
    return this.setupService.testConnection(dto)
  }
}
