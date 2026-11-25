// RF-02: cédula ecuatoriana. Misma regla en la base de datos (public.cedula_valida).
export function validarCedula(cedula: string): string | null {
  const c = cedula.trim();
  if (!/^\d+$/.test(c)) return 'La cédula solo lleva números';
  if (c.length !== 10) return `La cédula tiene 10 dígitos (escribiste ${c.length})`;
  const provincia = Number(c.slice(0, 2));
  if (!((provincia >= 1 && provincia <= 24) || provincia === 30)) return 'Los dos primeros dígitos no corresponden a una provincia';
  if (Number(c[2]) >= 6) return 'El tercer dígito de la cédula no es válido';
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let v = Number(c[i]) * (i % 2 === 0 ? 2 : 1);
    if (v > 9) v -= 9;
    suma += v;
  }
  const verificador = (10 - (suma % 10)) % 10;
  if (verificador !== Number(c[9])) return 'La cédula no es válida. Revisa que esté bien digitada';
  return null;
}
