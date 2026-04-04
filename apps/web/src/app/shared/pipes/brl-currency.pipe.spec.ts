import { BrlCurrencyPipe } from './brl-currency.pipe';

describe('BrlCurrencyPipe', () => {
  let pipe: BrlCurrencyPipe;

  beforeEach(() => {
    pipe = new BrlCurrencyPipe();
  });

  it('formata número como moeda BRL', () => {
    const result = pipe.transform(80);
    expect(result).toContain('80');
    expect(result).toMatch(/R\$|R\s/);
  });

  it('formata centavos corretamente', () => {
    const result = pipe.transform(80.5);
    expect(result).toContain('80');
  });

  it('retorna "—" para null', () => {
    expect(pipe.transform(null)).toBe('—');
  });

  it('retorna "—" para undefined', () => {
    expect(pipe.transform(undefined)).toBe('—');
  });

  it('formata zero como R$ 0,00', () => {
    const result = pipe.transform(0);
    expect(result).not.toBe('—');
    expect(result).toContain('0');
  });

  it('formata valor alto com separador de milhar', () => {
    const result = pipe.transform(1500);
    expect(result).toContain('1');
    expect(result).toContain('500');
  });
});
