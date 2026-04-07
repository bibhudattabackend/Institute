import { Institute } from "../models/Institute.js";

export async function appendPaymentReceipt(instituteId, student, amount, note) {
  if (!amount || amount <= 0) return;
  const inst = await Institute.findByIdAndUpdate(
    instituteId,
    { $inc: { next_receipt_seq: 1 } },
    { new: true }
  );
  if (!inst) return;
  const n = inst.next_receipt_seq;
  const receipt_no = `RCP-${String(n).padStart(6, "0")}`;
  if (!student.payment_receipts) student.payment_receipts = [];
  student.payment_receipts.push({
    receipt_no,
    amount: Math.round(amount * 100) / 100,
    recorded_at: new Date(),
    note: note || null,
  });
  student.markModified("payment_receipts");
}

/** When amount_paid increases, record receipt for the delta. */
export async function recordPaymentDelta(instituteId, student, previousPaid, nextPaid) {
  const prev = Number(previousPaid) || 0;
  const next = Number(nextPaid) || 0;
  const delta = next - prev;
  if (delta > 0.001) {
    await appendPaymentReceipt(instituteId, student, delta, "Fee recorded");
  }
}
