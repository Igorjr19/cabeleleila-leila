import { SpDatetimePipe } from './sp-datetime.pipe';

describe('SpDatetimePipe', () => {
  let pipe: SpDatetimePipe;

  beforeEach(() => {
    pipe = new SpDatetimePipe();
  });

  it('retorna "—" para null', () => {
    expect(pipe.transform(null)).toBe('—');
  });

  it('retorna "—" para undefined', () => {
    expect(pipe.transform(undefined)).toBe('—');
  });

  it('retorna "—" para string vazia', () => {
    expect(pipe.transform('')).toBe('—');
  });

  it('formata ISO UTC para horário de SP com padrão dd/MM/yyyy às HH:mm', () => {
    // 15:00 UTC = 12:00 BRT (UTC-3)
    const result = pipe.transform('2026-04-04T15:00:00.000Z');
    expect(result).toBe('04/04/2026 às 12:00');
  });

  it('aceita formato personalizado', () => {
    const result = pipe.transform('2026-04-04T15:00:00.000Z', 'HH:mm');
    expect(result).toBe('12:00');
  });

  it('formata apenas a data', () => {
    const result = pipe.transform('2026-04-04T15:00:00.000Z', 'dd/MM/yyyy');
    expect(result).toBe('04/04/2026');
  });
});
