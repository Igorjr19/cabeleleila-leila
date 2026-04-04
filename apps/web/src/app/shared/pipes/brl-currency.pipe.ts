import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'brlCurrency', standalone: true })
export class BrlCurrencyPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value == null) return '—';
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }
}
