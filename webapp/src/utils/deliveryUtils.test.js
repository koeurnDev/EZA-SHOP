import { describe, it, expect } from 'vitest';
import { parseDeliverySetting, calculateDeliveryFee } from './deliveryUtils';
import { calculateDeliveryFeeCents, toCents } from '@shared/deliveryUtils';

describe('deliveryUtils', () => {
  describe('parseDeliverySetting', () => {
    it('returns parsed float when valid', () => {
      expect(parseDeliverySetting('1.50', 2)).toBe(1.5);
      expect(parseDeliverySetting(3, 2)).toBe(3);
    });

    it('returns fallback when invalid or null', () => {
      expect(parseDeliverySetting(null, 2.5)).toBe(2.5);
      expect(parseDeliverySetting(undefined, 1)).toBe(1);
      expect(parseDeliverySetting('', 1.5)).toBe(1.5);
      expect(parseDeliverySetting('abc', 1.5)).toBe(1.5);
    });
  });

  describe('calculateDeliveryFeeCents (Shared)', () => {
    it('returns 0 if subtotal meets or exceeds threshold', () => {
      // Fee 1.5, Threshold 50, Subtotal 50
      expect(calculateDeliveryFeeCents(toCents(50), 1.5, 50, 'Phnom Penh', 2.5)).toBe(0);
      // Subtotal 100
      expect(calculateDeliveryFeeCents(toCents(100), 1.5, 50, 'Phnom Penh', 2.5)).toBe(0);
    });

    it('returns Phnom Penh fee if subtotal is below threshold', () => {
      // Fee 1.5, Threshold 50, Subtotal 20
      expect(calculateDeliveryFeeCents(toCents(20), 1.5, 50, 'Phnom Penh', 2.5)).toBe(150);
    });

    it('returns Provincial fee if outside Phnom Penh', () => {
      // Provincial Fee 2.5, Threshold 50, Subtotal 20
      expect(calculateDeliveryFeeCents(toCents(20), 1.5, 50, 'Siem Reap', 2.5)).toBe(250);
    });

    it('returns 0 if fee setting is <= 0', () => {
      expect(calculateDeliveryFeeCents(toCents(20), 0, 50, 'Phnom Penh', 2.5)).toBe(0);
    });
  });

  describe('calculateDeliveryFee (Webapp Export)', () => {
    it('correctly calculates the final dollar amount', () => {
      // Should be $1.50
      expect(calculateDeliveryFee(20, 1.5, 50, 'Phnom Penh', 2.5)).toBe(1.5);
      
      // Should be $2.50
      expect(calculateDeliveryFee(20, 1.5, 50, 'Kandal', 2.5)).toBe(2.5);
      
      // Free delivery
      expect(calculateDeliveryFee(60, 1.5, 50, 'Phnom Penh', 2.5)).toBe(0);
    });
  });
});
