import RollCounter from "../models/rollCounter";
export async function generateRollNo(prefix = 'ALFST', width = 3): Promise<string> {
  const counter = await RollCounter.findOneAndUpdate(
    { prefix },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true }
  );

  const seqStr = String(counter.sequence).padStart(width, '0');
  return `${prefix}-${seqStr}`;
}
export async function generateTenant(prefix = 'TEN', width = 6): Promise<string> {
  const counter = await RollCounter.findOneAndUpdate(
    { prefix },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true }
  );

  const seqStr = String(counter.sequence).padStart(width, '0');
  return `${prefix}${seqStr}`;
}