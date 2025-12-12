import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

interface PaystackInitResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
}

interface PaystackVerifyResponse {
  status: string;
  reference: string;
  amount: number;
  gateway_response: string;
  paid_at: string;
  metadata?: any;
}

@Injectable()
export class PaystackService {
  private readonly baseUrl = 'https://api.paystack.co';
  private readonly secretKey: string;

  constructor(private configService: ConfigService) {
    this.secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');
  }

  async initializeTransaction(
    email: string,
    amount: number, // in kobo (smallest currency unit)
    reference: string,
    metadata?: any,
    callbackUrl?: string,
  ): Promise<PaystackInitResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/transaction/initialize`,
        {
          email,
          amount: amount.toString(),
          reference,
          metadata,
          callback_url: callbackUrl,
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        },
      );

      return response.data.data;
    } catch (error) {
      throw new Error(
        `Paystack initialization failed: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  async verifyTransaction(
    reference: string,
  ): Promise<PaystackVerifyResponse> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
          timeout: 15000,
        },
      );

      return response.data.data;
    } catch (error) {
      throw new Error(
        `Paystack verification failed: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const hash = crypto
      .createHmac('sha512', this.secretKey)
      .update(payload)
      .digest('hex');
    return hash === signature;
  }
}
