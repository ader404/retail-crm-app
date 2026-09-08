import { SetMetadata } from '@nestjs/common';
import { PAGE_ACCESS_KEY } from '../guards/page-access.guard';

export const PageAccess = (...modules: string[]) => SetMetadata(PAGE_ACCESS_KEY, modules);
