import { z } from "zod";

// Transaction event types for Razorpay
export const transactionEventTypeSchema = z.enum([
  "CHARGE_SUCCESS",
  "CHARGE_FAILURE", 
  "AUTHORIZATION_SUCCESS",
  "AUTHORIZATION_FAILURE",
  "REFUND_SUCCESS",
  "REFUND_FAILURE",
  "CANCEL_SUCCESS",
  "CANCEL_FAILURE"
]);

export const transactionActionsSchema = z.array(z.enum(["CHARGE", "AUTHORIZATION", "REFUND", "CANCEL"]));

// Data schema for webhook requests
export const dataSchema = z.object({
  event: z.object({
    type: transactionEventTypeSchema,
    includePspReference: z.boolean().optional().default(true),
  }),
});

export type SyncWebhookRequestData = z.infer<typeof dataSchema>;

// Response schema for webhook responses
export const responseSchema = z.object({
  pspReference: z.string().optional(),
  result: transactionEventTypeSchema,
  amount: z.number(),
  data: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  time: z.string().optional(),
  externalUrl: z.string().url().optional(),
  message: z.string().optional(),
  actions: transactionActionsSchema,
});

export type ResponseType = z.infer<typeof responseSchema>;

// Legacy schema for backward compatibility
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