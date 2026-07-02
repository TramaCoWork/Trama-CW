import * as winston from 'winston';
import 'winston-daily-rotate-file';

export const createWinstonConfig = (
  retentionDays: number = 90,
): winston.LoggerOptions => {
  const isProduction = process.env.NODE_ENV === 'production';

  // Formato JSON para archivos
  const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    winston.format.json(),
  );

  // Formato legible para consola en dev
  const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
      const ctx = context
        ? `[${typeof context === 'string' ? context : (context as any).context || 'App'}]`
        : '';
      const metaStr = Object.keys(meta).length
        ? ` ${JSON.stringify(meta)}`
        : '';
      return `${timestamp} ${level} ${ctx} ${message}${metaStr}`;
    }),
  );

  const transports: winston.transport[] = [
    // Consola: legible en dev, JSON en prod
    new winston.transports.Console({
      format: isProduction ? fileFormat : consoleFormat,
    }),

    // Archivo diario: todos los niveles
    new winston.transports.DailyRotateFile({
      dirname: 'logs',
      filename: 'app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: `${retentionDays}d`,
      format: fileFormat,
    }),

    // Archivo diario: solo errores
    new winston.transports.DailyRotateFile({
      dirname: 'logs',
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: `${retentionDays}d`,
      format: fileFormat,
    }),
  ];

  return {
    level: isProduction ? 'info' : 'debug',
    transports,
  };
};
