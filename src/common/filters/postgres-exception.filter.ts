import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';

interface PostgreSQLError {
  code?: string;
}

function isPostgreSQLError(value: unknown): value is PostgreSQLError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value
  );
}

@Catch(Error)
export class PostgresExceptionFilter implements ExceptionFilter {
  catch(exception: Error & { code?: string }, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<FastifyReply>();

    const cause = exception.cause;
    
    const code = isPostgreSQLError(cause) ? cause.code : undefined;
    
    switch (code) {
      case '23503':
        return response.status(HttpStatus.NOT_FOUND).send({
          message: 'Referenced resource does not exist.',
        });

      case '23505':
        return response.status(HttpStatus.CONFLICT).send({
          message: 'Resource already exists.',
        });

      case '23514':
        return response.status(HttpStatus.BAD_REQUEST).send({
          message: 'Constraint validation failed.',
        });

      case '22003':
        return response.status(HttpStatus.BAD_REQUEST).send({
          message: 'Numeric value is out of range.',
        });

      default:
        
        return response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
          message: 'Internal server error.',
        });
    }
  }
}