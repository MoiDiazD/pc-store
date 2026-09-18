export interface CreatePaymentParams {
  amount: number;
  currency: string;
  metadata: Record<string, string>;
}

export interface CreatePaymentResult {
  providerPaymentId: string;
  clientSecret: string;
}

export interface PaymentProvider {
  createPayment(
    params: CreatePaymentParams,
  ): Promise<CreatePaymentResult>;

  constructWebhookEvent(
    payload: Buffer,
    signature: string,
    webhookSecret: string,
  ): unknown;
}