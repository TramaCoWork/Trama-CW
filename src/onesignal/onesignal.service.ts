import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClientService } from '../common/http/http-client.service';

export type SendPushInput = {
  subscriptionIds: string[];
  title: string;
  message: string;
  data?: Record<string, unknown>;
};

const ONESIGNAL_API_URL = 'https://api.onesignal.com/notifications';
// OneSignal permite hasta 2000 subscription ids por request.
const MAX_SUBSCRIPTIONS_PER_REQUEST = 2000;

@Injectable()
export class OneSignalService {
  private readonly logger = new Logger(OneSignalService.name);
  private readonly appId?: string;
  private readonly apiKey?: string;

  constructor(
    private readonly config: ConfigService,
    private readonly http: HttpClientService,
  ) {
    this.appId = this.config.get<string>('ONESIGNAL_APP_ID');
    this.apiKey = this.config.get<string>('ONESIGNAL_REST_API_KEY');
  }

  get isConfigured(): boolean {
    return Boolean(this.appId && this.apiKey);
  }

  /**
   * Envia un push a un conjunto de subscription ids. No-op si falta config.
   * Nunca lanza: loguea errores (fire-and-forget desde los callers).
   */
  async sendToSubscriptions(input: SendPushInput): Promise<void> {
    if (!this.isConfigured) {
      this.logger.warn(
        'OneSignal no configurado (falta ONESIGNAL_APP_ID/ONESIGNAL_REST_API_KEY); se omite el push',
      );
      return;
    }

    const ids = [...new Set(input.subscriptionIds.filter(Boolean))];
    if (ids.length === 0) {
      return;
    }

    for (let i = 0; i < ids.length; i += MAX_SUBSCRIPTIONS_PER_REQUEST) {
      const chunk = ids.slice(i, i + MAX_SUBSCRIPTIONS_PER_REQUEST);
      await this.postChunk(chunk, input);
    }
  }

  private async postChunk(
    subscriptionIds: string[],
    input: SendPushInput,
  ): Promise<void> {
    try {
      const response = await this.http.post(ONESIGNAL_API_URL, {
        headers: { Authorization: `key ${this.apiKey}` },
        body: {
          app_id: this.appId,
          headings: { en: input.title },
          contents: { en: input.message },
          include_subscription_ids: subscriptionIds,
          ...(input.data ? { data: input.data } : {}),
        },
      });

      if (!response.ok) {
        this.logger.error(
          `OneSignal respondio ${response.status}: ${response.raw.slice(0, 500)}`,
        );
      }
    } catch (error) {
      this.logger.error(`Error enviando push a OneSignal: ${String(error)}`);
    }
  }
}
