import { z } from "zod";

export const TransactionDataSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default("INR"),
  customer: z.object({
    name: z.string(),
    email: z.string().email(),
    contact: z.string(),
  }),
  notes: z.record(z.string()).optional(),
  order_id: z.string(),
});

export type TransactionData = z.infer<typeof TransactionDataSchema>;

export const validateTransactionData = (data: unknown): TransactionData => {
  return TransactionDataSchema.parse(data);
}; 