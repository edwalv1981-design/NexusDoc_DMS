import {
  normalizeFundacionPerson,
  ensurePersonArray,
} from './fundacionPersonSchema';

/** Migra dignatarios legacy (objeto por rol) a arreglo. */
export function normalizeLoadedCorporacionData(raw = {}, defaults = {}) {
  const clean = { ...raw };

  clean.directors = ensurePersonArray(clean.directors, defaults.directors).map((d) =>
    normalizeFundacionPerson(d)
  );

  if (clean.dignitaries && !Array.isArray(clean.dignitaries)) {
    clean.dignitaries = Object.entries(clean.dignitaries).map(([role, d]) => ({
      role: (d?.role || role || '').toString().toUpperCase(),
      fullName: d?.fullName || '',
      birthDate: d?.birthDate || '',
      passport: d?.passport || '',
      registrationNumber: d?.registrationNumber || '',
    }));
  } else {
    clean.dignitaries = ensurePersonArray(clean.dignitaries, defaults.dignitaries).map((d) => ({
      role: d?.role || '',
      fullName: d?.fullName || '',
      birthDate: d?.birthDate || '',
      passport: d?.passport || '',
      registrationNumber: d?.registrationNumber || '',
    }));
  }

  clean.shareholders = ensurePersonArray(clean.shareholders, defaults.shareholders);
  clean.signers = ensurePersonArray(clean.signers, defaults.signers).map((s) => ({
    name: s?.name || '',
    signature: s?.signature || '',
  }));

  return clean;
}
