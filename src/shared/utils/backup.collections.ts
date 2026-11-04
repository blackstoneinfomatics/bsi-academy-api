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
    collectionName: "users",
    sheetName: "Users",
    tenantField: "tenantId",
    dateField: "createdAt",
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
];