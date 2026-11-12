export interface BackupCollectionConfig {
  collectionName: string;
  sheetName: string;
  tenantField: string;
  dateField: string;

  excludedFields?: string[];
}

export const BACKUP_COLLECTIONS: BackupCollectionConfig[] = [
//   {
//     collectionName: "students",
//     sheetName: "Students",
//     tenantField: "tenantId",
//     dateField: "createdAt",
//     excludedFields: [
//       "password",
//       "passwordHash",
//       "resetToken",
//       "otp",
//     ],
//   },
  {
    collectionName: "tenantUsers",
    sheetName: "Users",
    tenantField: "tenantId",
    dateField: "createdDate",
    excludedFields: [
      "password",
      "passwordHash",
      "refreshToken",
      "resetToken",
      "otp",
    ],
  },
  {
    collectionName: "paymenttransaction",
    sheetName: "Payments",
    tenantField: "tenantId",
    dateField: "createdAt",
    excludedFields: [],
  },
  {
    collectionName: "subscriptioninvoice",
    sheetName: "Invoices",
    tenantField: "tenantId",
    dateField: "createdAt",
    excludedFields: [],
  },

  {
    collectionName: "tickets",
    sheetName: "Tickets",
    tenantField: "tenantId",
    dateField: "createdAt",
    excludedFields: [],
  },

    {
    collectionName: "tenantsubscriptions",
    sheetName: "Tenant Subscriptions",
    tenantField: "tenantId",
    dateField: "createdAt",
    excludedFields: [],
  },

    {
    collectionName: "tenantBackup",
    sheetName: "Tenant Backups",
    tenantField: "tenantId",
    dateField: "createdAt",
    excludedFields: [],
  },

  {
    collectionName: "subscriptiontrials",
    sheetName: "Subscription Trials",
    tenantField: "tenantId",
    dateField: "createdAt",
    excludedFields: [],
  },

    {
    collectionName: "refundtransaction",
    sheetName: "Refund Transactions",
    tenantField: "tenantId",
    dateField: "createdAt",
    excludedFields: [],
  },

    {
    collectionName: "purchaserequest",
    sheetName: "Purchase Requests",
    tenantField: "tenantId",
    dateField: "createdAt",
    excludedFields: [],
  },

    {
    collectionName: "portalRequests",
    sheetName: "Portal Requests",
    tenantField: "tenantId",
    dateField: "createdAt",
    excludedFields: [],
  },

    {
    collectionName: "planChangeRequests",
    sheetName: "Plan Change Requests",
    tenantField: "tenantId",
    dateField: "createdAt",
    excludedFields: [],
  },

    {
    collectionName: "notification",
    sheetName: "Notifications",
    tenantField: "tenantId",
    dateField: "createdAt",
    excludedFields: [],
  },

    {
    collectionName: "tenantPortal",
    sheetName: "Tenant Portals",
    tenantField: "tenantId",
    dateField: "createdAt",
    excludedFields: [],
  },

    {
    collectionName: "tenantPortalConfig",
    sheetName: "Tenant Portal Configurations",
    tenantField: "tenantId",
    dateField: "createdAt",
    excludedFields: [],
  },

    {
    collectionName: "students",
    sheetName: "Students",
    tenantField: "tenantId",
    dateField: "createdAt",
    excludedFields: [],
  },

    {
    collectionName: "customServiceInvoice",
    sheetName: "Custom Service Invoices",
    tenantField: "tenantId",
    dateField: "createdAt",
    excludedFields: [],
  },
];