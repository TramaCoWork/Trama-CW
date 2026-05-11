import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentStrategy, PAYMENT_STRATEGIES } from './payment-strategy.interface';

/**
 * Mapeo de PAYMENT_MODE (env var legacy) a strategy codes.
 */
const PAYMENT_MODE_MAP: Record<string, string> = {
  checkout: 'mp_checkout',
  subscription: 'mp_subscription',
};

@Injectable()
export class PaymentStrategyFactory {
  private readonly logger = new Logger(PaymentStrategyFactory.name);
  private readonly strategiesMap: Map<string, PaymentStrategy>;
  private readonly defaultCode: string;

  constructor(
    @Inject(PAYMENT_STRATEGIES) strategies: PaymentStrategy[],
    private readonly config: ConfigService,
  ) {
    this.strategiesMap = new Map();
    for (const strategy of strategies) {
      this.strategiesMap.set(strategy.code, strategy);
      this.logger.log(`Payment strategy registered: ${strategy.code}`);
    }

    // Resolver default desde PAYMENT_MODE env var
    const paymentMode = this.config.get<string>('PAYMENT_MODE', 'subscription');
    this.defaultCode = PAYMENT_MODE_MAP[paymentMode] ?? paymentMode;
    this.logger.log(`Default payment strategy: ${this.defaultCode}`);
  }

  /**
   * Obtener strategy por código. Si no se pasa código, usa el default.
   * @throws Error si el código no corresponde a ninguna strategy registrada.
   */
  getStrategy(code?: string | null): PaymentStrategy {
    const resolvedCode = code ?? this.defaultCode;
    const strategy = this.strategiesMap.get(resolvedCode);

    if (!strategy) {
      throw new Error(`Payment strategy '${resolvedCode}' not found. Available: ${this.getAvailableCodes().join(', ')}`);
    }

    return strategy;
  }

  /** Obtener el código default (derivado de PAYMENT_MODE) */
  getDefaultCode(): string {
    return this.defaultCode;
  }

  /** Listar todos los códigos registrados */
  getAvailableCodes(): string[] {
    return Array.from(this.strategiesMap.keys());
  }

  /** Obtener todas las strategies registradas */
  getAllStrategies(): PaymentStrategy[] {
    return Array.from(this.strategiesMap.values());
  }
}
