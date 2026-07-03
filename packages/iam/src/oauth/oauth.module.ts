import { Module } from '@nestjs/common';
import { PrismaModule } from '@platform/platform-core';
import { OAuthAccountsController } from './oauth-accounts.controller';

@Module({ imports: [PrismaModule], controllers: [OAuthAccountsController] })
export class OAuthModule {}