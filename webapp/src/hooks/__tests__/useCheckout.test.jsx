import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCheckout } from '../useCheckout';

// Mock localStorage
const localStorageMock = (function() {
  let store = {};
  return {
    getItem(key) {
      return store[key] || null;
    },
    setItem(key, value) {
      store[key] = value.toString();
    },
    clear() {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('useCheckout hook', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('should initialize with default state', () => {
    const mockUser = { id: 1, first_name: 'TestUser' };
    const { result } = renderHook(() => useCheckout({
      user: mockUser,
      cart: [],
      clearCart: vi.fn(),
      prepareIdempotency: vi.fn(),
      idempotencyKey: 'test-key',
      fetchWithRetry: vi.fn(),
      showAlert: vi.fn(),
      setView: vi.fn(),
      tg: {},
      backendUrl: 'http://localhost',
      lang: 'en'
    }));

    expect(result.current.showInvoice).toBe(false);
    expect(result.current.isPlacingOrder).toBe(false);
    expect(result.current.formData.name).toBe('TestUser');
    expect(result.current.formData.province).toBe('Phnom Penh');
  });
});
