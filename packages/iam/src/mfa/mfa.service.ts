import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { MFA_ISSUER } from '../common/constants/iam.constants';

@Injectable()
export class MfaService {
  private readonly logger = new Logger(MfaService.name);

  async generateSecret(userId: string, email: string) {
    const secret = speakeasy.generateSecret({
      name: `${MFA_ISSUER}:${email}`,
      issuer: MFA_ISSUER,
    });

    const qrCode = await QRCode.toDataURL(secret.otpauth_url ?? '');

    return {
      secret: secret.base32,
      qrCode,
    };
  }

  verifyToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1,
    });
  }

  async enable(userId: string, secret: string, token: string): Promise<boolean> {
    if (!this.verifyToken(secret, token)) {
      throw new BadRequestException('Invalid TOTP token');
    }
    // TODO: Persist MFA device in DB
    this.logger.log(`MFA enabled for user ${userId}`);
    return true;
  }

  async disable(userId: string) {
    // TODO: Remove MFA devices from DB
    this.logger.log(`MFA disabled for user ${userId}`);
    return true;
  }
}
