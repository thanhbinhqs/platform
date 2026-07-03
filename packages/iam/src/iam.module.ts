import { Global, Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { AuthorizationModule } from './authorization/authorization.module';
import { SessionModule } from './session/session.module';
import { AuditLogsModule } from './audit-logs/audit-log.module';
import { LoginHistoryModule } from './login-history/login-history.module';
import { SecurityEventsModule } from './security-events/security-event.module';
import { TenantsModule } from './tenants/tenants.module';
import { TrustedDevicesModule } from './trusted-devices/trusted-devices.module';
import { DelegationsModule } from './delegations/delegations.module';
import { StorageModule } from './storage/storage.module';
import { ScheduledJobsModule } from './scheduled-jobs/scheduled-jobs.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RulesModule } from './rules/rules.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { SalesModule } from './sales/sales.module';
import { OAuthModule } from './oauth/oauth.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { AdminModule } from './admin/admin.module';
import { MfaModule } from './mfa/mfa.module';

@Global()
@Module({
  imports: [
    AuthModule, UsersModule, RolesModule, PermissionsModule,
    AuthorizationModule, SessionModule, AuditLogsModule,
    LoginHistoryModule, SecurityEventsModule, TenantsModule,
    TrustedDevicesModule, DelegationsModule,
    StorageModule, ScheduledJobsModule, IntegrationsModule,
    WebhooksModule, NotificationsModule, RulesModule,
    WorkflowsModule,
    SalesModule,
    OAuthModule, ApiKeysModule,
    AdminModule, MfaModule,
  ],
  exports: [
    AuthModule, UsersModule, RolesModule, PermissionsModule,
    AuthorizationModule, SessionModule, AuditLogsModule,
    LoginHistoryModule, SecurityEventsModule, TenantsModule,
    TrustedDevicesModule, DelegationsModule,
    StorageModule, ScheduledJobsModule, IntegrationsModule,
    WebhooksModule, NotificationsModule, RulesModule,
    WorkflowsModule,
    SalesModule,
    OAuthModule, ApiKeysModule,
    AdminModule, MfaModule,
  ],
})
export class IamModule {}