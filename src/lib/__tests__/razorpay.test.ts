import { describe, it, expect, vi } from "vitest";
import { RazorpayService } from "../razorpay";

// Mock Razorpay
vi.mock("razorpay", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      orders: {
        create: vi.fn(),
      },
      payments: {
        fetch: vi.fn(),
        capture: vi.fn(),
        refund: vi.fn(),
      },
    })),
  };
});

describe("RazorpayService", () => {
  describe("createOrder", () => {
    it("should create an order successfully", async () => {
      const mockOrder = {
        id: "order_test123",
        amount: 200,
        currency: "INR",
        receipt: "test_receipt",
      };

      const Razorpay = require("razorpay").default;
      const mockRazorpayInstance = new Razorpay();
      mockRazorpayInstance.orders.create.mockResolvedValue(mockOrder);

      const result = await RazorpayService.createOrder({
        amount: 2.00,
        currency: "INR",
        receipt: "test_receipt",
        notes: { test: "note" },
      });

      expect(result.success).toBe(true);
      expect(result.order).toEqual(mockOrder);
      expect(result.error).toBeNull();
      expect(mockRazorpayInstance.orders.create).toHaveBeenCalledWith({
        amount: 200, // Converted to paise
        currency: "INR",
        receipt: "test_receipt",
        payment_capture: true,
        notes: { test: "note" },
      });
    });

    it("should handle order creation errors", async () => {
      const Razorpay = require("razorpay").default;
      const mockRazorpayInstance = new Razorpay();
      mockRazorpayInstance.orders.create.mockRejectedValue(new Error("API Error"));

      const result = await RazorpayService.createOrder({
        amount: 2.00,
        currency: "INR",
        receipt: "test_receipt",
      });

      expect(result.success).toBe(false);
      expect(result.order).toBeNull();
      expect(result.error).toBe("API Error");
    });
  });

  describe("processPayment", () => {
    it("should process payment successfully", async () => {
      const mockPayment = {
        id: "pay_test123",
        amount: 200,
        currency: "INR",
        status: "captured",
        order_id: "order_test123",
      };

      const Razorpay = require("razorpay").default;
      const mockRazorpayInstance = new Razorpay();
      mockRazorpayInstance.payments.fetch.mockResolvedValue(mockPayment);

      const result = await RazorpayService.processPayment({
        paymentId: "pay_test123",
        amount: 2.00,
        currency: "INR",
      });

      expect(result.success).toBe(true);
      expect(result.payment).toEqual(mockPayment);
      expect(result.error).toBeNull();
      expect(mockRazorpayInstance.payments.fetch).toHaveBeenCalledWith("pay_test123");
    });

    it("should capture payment if not already captured", async () => {
      const mockPayment = {
        id: "pay_test123",
        amount: 200,
        currency: "INR",
        status: "authorized",
        order_id: "order_test123",
      };

      const mockCapturedPayment = {
        ...mockPayment,
        status: "captured",
      };

      const Razorpay = require("razorpay").default;
      const mockRazorpayInstance = new Razorpay();
      mockRazorpayInstance.payments.fetch.mockResolvedValue(mockPayment);
      mockRazorpayInstance.payments.capture.mockResolvedValue(mockCapturedPayment);

      const result = await RazorpayService.processPayment({
        paymentId: "pay_test123",
        amount: 2.00,
        currency: "INR",
      });

      expect(result.success).toBe(true);
      expect(result.payment).toEqual(mockCapturedPayment);
      expect(mockRazorpayInstance.payments.capture).toHaveBeenCalledWith(
        "pay_test123",
        200,
        "INR"
      );
    });
  });
}); 