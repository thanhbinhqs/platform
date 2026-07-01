import { Global, Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { AuthorizationModule } from './authorization/authorization.module';
import { SessionModule } from './session/session.module';
import { MfaModule } from './mfa/mfa.module';

@Global()
@Module({
  imports: [
    AuthModule,
    UsersModule,
    RolesModule,
    AuthorizationModule,
    SessionModule,
    MfaModule,
  ],
  exports: [
    AuthModule,
    UsersModule,
    RolesModule,
    AuthorizationModule,
    SessionModule,
    MfaModule,
  ],
})
export class IamModule {}
