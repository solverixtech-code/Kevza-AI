import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        customerDashboard: resolve(import.meta.dirname, 'customer-dashboard.html'),
        login: resolve(import.meta.dirname, 'login.html'),
        signup: resolve(import.meta.dirname, 'signup.html'),
        forgotPassword: resolve(import.meta.dirname, 'forgot-password.html'),
        resetPassword: resolve(import.meta.dirname, 'reset-password.html'),
        verifyLogin: resolve(import.meta.dirname, 'verify-login.html'),
        verifySession: resolve(import.meta.dirname, 'verify-session.html'),
        loginHistory: resolve(import.meta.dirname, 'login-history.html'),
        activeSessions: resolve(import.meta.dirname, 'active-sessions.html'),
        changePassword: resolve(import.meta.dirname, 'change-password.html'),
        notificationPreferences: resolve(import.meta.dirname, 'notification-preferences.html'),
        mySecurity: resolve(import.meta.dirname, 'security.html'),
        infrastructureHealth: resolve(import.meta.dirname, 'infrastructure-health.html'),
        supportDashboard: resolve(import.meta.dirname, 'support-dashboard.html'),
        costMarginDashboard: resolve(import.meta.dirname, 'cost-margin-dashboard.html'),
        liveOperationsCenter: resolve(import.meta.dirname, 'live-operations-center.html'),
        complianceDashboard: resolve(import.meta.dirname, 'compliance-dashboard.html'),
        aiOperationsDashboard: resolve(import.meta.dirname, 'ai-operations-dashboard.html'),
        campaignOperationsDashboard: resolve(import.meta.dirname, 'campaign-operations-dashboard.html'),
        automationOperationsDashboard: resolve(import.meta.dirname, 'automation-operations-dashboard.html'),
        messagingDashboard: resolve(import.meta.dirname, 'messaging-dashboard.html'),
        templates: resolve(import.meta.dirname, 'templates.html'),
        subscriptionDashboard: resolve(import.meta.dirname, 'subscription-dashboard.html'),
        channelOperationsDashboard: resolve(import.meta.dirname, 'channel-operations-dashboard.html'),
        customerOnboardingActivation: resolve(import.meta.dirname, 'customer-onboarding-activation.html'),
        activatedCustomers: resolve(import.meta.dirname, 'activated-customers.html'),
        newSignups: resolve(import.meta.dirname, 'new-signups.html'),
        onboardingInProgress: resolve(import.meta.dirname, 'onboarding-in-progress.html'),
        onboardingInProcess: resolve(import.meta.dirname, 'onboarding-in-process.html'),
        awaitingWhatsappConnection: resolve(import.meta.dirname, 'awaiting-whatsapp-connection.html'),
        awaitingTemplateApproval: resolve(import.meta.dirname, 'awaiting-template-approval.html'),
        missingKnowledge: resolve(import.meta.dirname, 'missing-knowledge.html'),
        walletBlocked: resolve(import.meta.dirname, 'wallet-blocked.html'),
        activationBlocked: resolve(import.meta.dirname, 'activation-blocked.html'),
        customerActivationQueue: resolve(import.meta.dirname, 'customer-activation-queue.html'),
        plansAndPricing: resolve(import.meta.dirname, 'plans-and-pricing.html'),
        professionalPlan: resolve(import.meta.dirname, 'professional-plan.html'),
        planFeatures: resolve(import.meta.dirname, 'plan-features.html'),
        planLimits: resolve(import.meta.dirname, 'plan-limits.html'),
        channelEntitlements: resolve(import.meta.dirname, 'channel-entitlements.html'),
        aiEntitlements: resolve(import.meta.dirname, 'ai-entitlements.html'),
        contactLimits: resolve(import.meta.dirname, 'contact-limits.html'),
        automationLimits: resolve(import.meta.dirname, 'automation-limits.html'),
        apiLimits: resolve(import.meta.dirname, 'api-limits.html'),
        overageRules: resolve(import.meta.dirname, 'overage-rules.html'),
        allPlans: resolve(import.meta.dirname, 'all-plans.html'),
        allCustomers: resolve(import.meta.dirname, 'all-customers.html'),
      },
    },
  },
});





























