import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

const SENSITIVE_FIELDS = new Set([
  'password',
  'passwordhash',
  'currentpassword',
  'newpassword',
  'token',
  'accesstoken',
  'refreshtoken',
  'secret',
  'authorization',
]);

function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') return body;

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(body)) {
    if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeBody(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url, body, query } = req;
    const userId = req.user?.userId ?? req.user?.sub ?? 'anonymous';
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.headers?.['user-agent'] || 'unknown';
    const controller = context.getClass().name;
    const handler = context.getHandler().name;
    const now = Date.now();

    const sanitizedBody = body && Object.keys(body).length > 0 ? sanitizeBody(body) : undefined;
    const queryParams = query && Object.keys(query).length > 0 ? query : undefined;

    this.logger.info(`→ ${method} ${url} | ${controller}.${handler} | user: ${userId}`, {
      context: 'HTTP',
      method,
      url,
      controller,
      handler,
      userId,
      ip,
      userAgent,
      ...(queryParams && { query: queryParams }),
      ...(sanitizedBody && { body: sanitizedBody }),
    });

    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse();
        const duration = Date.now() - now;
        const statusCode = res.statusCode;

        this.logger.info(`← ${method} ${url} | ${statusCode} | ${duration}ms`, {
          context: 'HTTP',
          method,
          url,
          controller,
          handler,
          userId,
          statusCode,
          duration,
        });
      }),
      catchError((error) => {
        const duration = Date.now() - now;
        const statusCode = error.status || error.getStatus?.() || 500;

        this.logger.error(`← ${method} ${url} | ${statusCode} | ${duration}ms | ${error.message}`, {
          context: 'HTTP',
          method,
          url,
          controller,
          handler,
          userId,
          statusCode,
          duration,
          errorMessage: error.message,
          errorStack: error.stack,
        });

        return throwError(() => error);
      }),
    );
  }
}
