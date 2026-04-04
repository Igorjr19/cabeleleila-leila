import { Pipe, PipeTransform } from '@angular/core';
import { formatSP } from '../utils/date.utils';

@Pipe({ name: 'spDatetime', standalone: true })
export class SpDatetimePipe implements PipeTransform {
  transform(isoUtc: string | null | undefined, fmt?: string): string {
    if (!isoUtc) return '—';
    return formatSP(isoUtc, fmt);
  }
}
