import { Controller, Get, Patch, Post, Body, UploadedFile, UseInterceptors, BadRequestException, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { getUploadsDir } from '../../common/uploads-path';

const logoStorage = diskStorage({
  destination: getUploadsDir(),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    cb(null, `${unique}${extname(file.originalname)}`)
  },
})

@ApiTags('settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get() get() { return this.settingsService.get(); }
  @Patch() update(@Body() dto: UpdateSettingsDto) { return this.settingsService.update(dto); }

  // Company logo stays on local disk (not part of the product-image MySQL requirement)
  @Post('upload-logo')
  @UseInterceptors(FileInterceptor('file', {
    storage: logoStorage,
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.match(/^image\/(jpeg|jpg|png|gif|webp)$/)) {
        return cb(new BadRequestException('Only image files (JPEG, PNG, GIF, WEBP) allowed'), false);
      }
      cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  }))
  uploadLogo(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return { url: `/uploads/${file.filename}` };
  }
}
