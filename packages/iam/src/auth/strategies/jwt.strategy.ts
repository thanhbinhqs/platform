import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthenticatedUser } from '../../common';

export interface JwtPayload {
  sub: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  tenantId: string | null;
  sessionId: string;
  isMfaVerified: boolean;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    return {
      id: payload.sub,
      tenantId: payload.tenantId,
      username: payload.username,
      email: payload.email,
      displayName: null,
      roles: payload.roles.map((name) => ({ id: name, name })),
      permissions: payload.permissions,
      rules: [], // rules come from /auth/me, not from JWT (too large)
      isMfaEnabled: false,
      sessionId: payload.sessionId,
    };
  }
}
