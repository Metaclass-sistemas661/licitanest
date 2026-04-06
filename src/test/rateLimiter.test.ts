import { describe, it, expect, beforeEach, vi } from 'vitest';
import { verificarRateLimit, verificarRateLimitLogin, limparRateLimits } from '@/lib/rateLimiter';

beforeEach(() => {
  limparRateLimits();
  vi.restoreAllMocks();
});

describe('verificarRateLimit', () => {
  it('permite chamadas dentro do limite', () => {
    for (let i = 0; i < 5; i++) {
      expect(verificarRateLimit('teste', 5, 60_000)).toBe(true);
    }
  });

  it('bloqueia chamadas acima do limite', () => {
    for (let i = 0; i < 5; i++) {
      verificarRateLimit('teste', 5, 60_000);
    }
    expect(verificarRateLimit('teste', 5, 60_000)).toBe(false);
  });

  it('chaves diferentes são independentes', () => {
    for (let i = 0; i < 5; i++) {
      verificarRateLimit('a', 5, 60_000);
    }
    expect(verificarRateLimit('a', 5, 60_000)).toBe(false);
    expect(verificarRateLimit('b', 5, 60_000)).toBe(true);
  });

  it('reseta após a janela expirar', () => {
    const dateSpy = vi.spyOn(Date, 'now');
    const agora = 1700000000000;
    dateSpy.mockReturnValue(agora);

    for (let i = 0; i < 5; i++) {
      verificarRateLimit('teste', 5, 1_000);
    }
    expect(verificarRateLimit('teste', 5, 1_000)).toBe(false);

    // Avançar 1.1 segundos
    dateSpy.mockReturnValue(agora + 1_100);
    expect(verificarRateLimit('teste', 5, 1_000)).toBe(true);
  });
});

describe('verificarRateLimitLogin', () => {
  it('permite 5 tentativas', () => {
    for (let i = 0; i < 5; i++) {
      expect(verificarRateLimitLogin()).toBe(true);
    }
    expect(verificarRateLimitLogin()).toBe(false);
  });
});

describe('limparRateLimits', () => {
  it('reseta todos os buckets', () => {
    for (let i = 0; i < 5; i++) {
      verificarRateLimit('teste', 5, 60_000);
    }
    expect(verificarRateLimit('teste', 5, 60_000)).toBe(false);
    limparRateLimits();
    expect(verificarRateLimit('teste', 5, 60_000)).toBe(true);
  });
});
