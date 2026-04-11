export function validarCPF(valor: string): boolean {
  const digits = valor.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  const calc = (slice: string, weights: number[]) =>
    weights.reduce((sum, w, i) => sum + parseInt(slice[i], 10) * w, 0);

  let resto = calc(digits, [10, 9, 8, 7, 6, 5, 4, 3, 2]) % 11;
  const d1 = resto < 2 ? 0 : 11 - resto;
  if (parseInt(digits[9], 10) !== d1) return false;

  resto = calc(digits, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]) % 11;
  const d2 = resto < 2 ? 0 : 11 - resto;
  return parseInt(digits[10], 10) === d2;
}

export function validarCNPJ(valor: string): boolean {
  const digits = valor.replace(/\D/g, "");
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;

  const calc = (slice: string, weights: number[]) =>
    weights.reduce((sum, w, i) => sum + parseInt(slice[i], 10) * w, 0);

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let resto = calc(digits, w1) % 11;
  const d1 = resto < 2 ? 0 : 11 - resto;
  if (parseInt(digits[12], 10) !== d1) return false;

  resto = calc(digits, w2) % 11;
  const d2 = resto < 2 ? 0 : 11 - resto;
  return parseInt(digits[13], 10) === d2;
}
