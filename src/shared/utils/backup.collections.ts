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
    collectionName: "paymenttransactions",
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