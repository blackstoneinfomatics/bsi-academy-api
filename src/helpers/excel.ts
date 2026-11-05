import ExcelJS from "exceljs";

export const sanitizeExcelValue = (value: any): any => {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value?._bsontype === "ObjectId") {
    return value.toString();
  }

  if (Array.isArray(value) || typeof value === "object") {
    return JSON.stringify(value);
  }

  if (
    typeof value === "string" &&
    /^[=+\-@]/.test(value)
  ) {
    return `'${value}`;
  }

  return value;
};

export const flattenDocument = (
  document: Record<string, any>,
  excludedFields: string[] = []
): Record<string, any> => {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(document)) {
    if (excludedFields.includes(key)) {
      continue;
    }

    result[key] = sanitizeExcelValue(value);
  }

  return result;
};

export const addWorksheetHeaders = (
  worksheet: ExcelJS.Worksheet,
  headers: string[]
) => {
  const row = worksheet.addRow(headers);

  row.font = {
    bold: true,
  };

  row.commit();
};