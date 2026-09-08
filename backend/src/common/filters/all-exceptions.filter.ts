import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'Record not found';
          break;
        case 'P2002':
          status = HttpStatus.CONFLICT;
          message = 'A record with this value already exists';
          break;
        case 'P2003':
          status = HttpStatus.CONFLICT;
          message = 'Cannot complete operation: related records exist';
          break;
        case 'P2024':
          status = HttpStatus.REQUEST_TIMEOUT;
          message = 'Operation timed out, please retry';
          break;
        default:
          this.logger.error(
            `Prisma error ${exception.code} on ${request.method} ${request.url}: ${exception.message}`,
          );
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid request data';
    }

    if (status === HttpStatus.INTERNAL_SERVER_ERROR && !(exception instanceof HttpException)) {
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
