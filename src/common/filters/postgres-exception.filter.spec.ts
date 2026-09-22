import { BadRequestException, ConflictException, HttpException, HttpStatus } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { PostgresExceptionFilter } from './postgres-exception.filter';

describe('PostgresExceptionFilter', () => {
  const filter = new PostgresExceptionFilter();

  const host = (response: any) => ({
    switchToHttp: () => ({ getResponse: () => response }),
  }) as any;

  const response = () => ({
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  });

  it('should preserve an HttpException response', () => {
    const res = response();
    const exception = new ConflictException('Already exists');

    filter.catch(exception, host(res));

    expect(res.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(res.send).toHaveBeenCalledWith(exception.getResponse());
  });

  it.each([
    ['23503', HttpStatus.NOT_FOUND, 'Referenced resource does not exist.'],
    ['23505', HttpStatus.CONFLICT, 'Resource already exists.'],
    ['23514', HttpStatus.BAD_REQUEST, 'Constraint validation failed.'],
    ['22003', HttpStatus.BAD_REQUEST, 'Numeric value is out of range.'],
  ])('should map PostgreSQL code %s', (code, status, message) => {
    const res = response();
    filter.catch(Object.assign(new Error('db'), { cause: { code } }), host(res));
    expect(res.status).toHaveBeenCalledWith(status);
    expect(res.send).toHaveBeenCalledWith({ message });
  });

  it('should return 500 for unknown PostgreSQL errors', () => {
    const res = response();
    filter.catch(Object.assign(new Error('db'), { cause: { code: '99999' } }), host(res));
    expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(res.send).toHaveBeenCalledWith({ message: 'Internal server error.' });
  });

  it('should return 500 when there is no PostgreSQL cause', () => {
    const res = response();
    filter.catch(new Error('db'), host(res));
    expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  it('should handle a non-object cause', () => {
    const res = response();
    filter.catch(Object.assign(new Error('db'), { cause: 'not-an-error' }), host(res));
    expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  it('should handle an object cause without a code', () => {
    const res = response();
    filter.catch(Object.assign(new Error('db'), { cause: {} }), host(res));
    expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
  });
});
