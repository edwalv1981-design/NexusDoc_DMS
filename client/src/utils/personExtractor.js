/**
 * personExtractor.js
 * Extrae y consolida una lista única de personas ingresadas en cualquier parte del formulario activo.
 */

export function extractRegisteredPeople(formData = {}) {
  if (!formData || typeof formData !== 'object') return [];

  const peopleMap = new Map();

  const addPerson = (personObj, roleLabel) => {
    if (!personObj || typeof personObj !== 'object') return;
    const name = (
      personObj.fullName ||
      personObj.name ||
      personObj.legalRepName ||
      personObj.declarantName ||
      personObj.declarationName ||
      personObj.beneficiaryName ||
      ''
    ).trim();
    if (!name || name.length < 2) return;

    const idNumber = (
      personObj.passport ||
      personObj.idCard ||
      personObj.taxId ||
      personObj.legalRepId ||
      personObj.registrationNumber ||
      ''
    ).trim();
    const key = `${name.toLowerCase()}_${idNumber.toLowerCase()}`;

    if (!peopleMap.has(key)) {
      peopleMap.set(key, {
        id: key,
        name,
        fullName: name,
        idNumber,
        passport: personObj.passport || idNumber,
        idCard: personObj.idCard || idNumber,
        nationality: personObj.nationality || personObj.country || '',
        birthDate: personObj.birthDate || personObj.incorporationDate || '',
        birthPlace: personObj.birthPlace || '',
        maritalStatus: personObj.maritalStatus || '',
        address: personObj.address || personObj.registeredAddress || personObj.operatingAddress || '',
        phone: personObj.phone || '',
        email: personObj.email || '',
        city: personObj.city || '',
        country: personObj.country || '',
        entityType: personObj.entityType || 'individual',
        roleLabel: roleLabel || 'Registrado'
      });
    }
  };

  // 1. Directores
  if (Array.isArray(formData.directors)) {
    formData.directors.forEach((d, idx) => addPerson(d, `Director ${idx + 1}`));
  }

  // 2. Dignatarios
  if (Array.isArray(formData.dignitaries)) {
    formData.dignitaries.forEach((d) => addPerson(d, d.role ? `Dignatario (${d.role})` : 'Dignatario'));
  } else if (formData.dignitaries && typeof formData.dignitaries === 'object') {
    Object.entries(formData.dignitaries).forEach(([role, d]) => addPerson(d, `Dignatario (${role.toUpperCase()})`));
  }

  // 3. Accionistas
  if (Array.isArray(formData.shareholders)) {
    formData.shareholders.forEach((s, idx) => addPerson(s, `Accionista ${idx + 1}`));
  }

  // 4. Fundadores
  if (Array.isArray(formData.founders)) {
    formData.founders.forEach((f, idx) => addPerson(f, `Fundador ${idx + 1}`));
  } else if (formData.founder) {
    addPerson(formData.founder, 'Fundador');
  }

  // 5. Consejo Fundacional
  if (Array.isArray(formData.councilMembers)) {
    formData.councilMembers.forEach((m, idx) => addPerson(m, `Consejo ${idx + 1}`));
  }

  // 6. Protectores
  if (Array.isArray(formData.protectors)) {
    formData.protectors.forEach((p, idx) => addPerson(p, `Protector ${idx + 1}`));
  } else if (formData.protector) {
    addPerson(formData.protector, 'Protector');
  }

  // 7. Beneficiarios
  if (Array.isArray(formData.beneficiaries)) {
    formData.beneficiaries.forEach((b, idx) => addPerson(b, `Beneficiario ${idx + 1}`));
  }

  // 8. Beneficiarios Finales (KYCE)
  if (Array.isArray(formData.beneficialOwners)) {
    formData.beneficialOwners.forEach((b, idx) => addPerson(b, `Beneficiario Final ${idx + 1}`));
  }

  // 9. Representante Legal
  if (formData.legalRepName) {
    addPerson(
      {
        fullName: formData.legalRepName,
        passport: formData.legalRepId,
        nationality: formData.legalRepNationality
      },
      'Representante Legal'
    );
  }

  // 10. Firmantes / Declarante
  if (Array.isArray(formData.signers)) {
    formData.signers.forEach((s) => addPerson(s, 'Firmante'));
  }
  if (formData.declarantName || formData.declarationName) {
    addPerson(
      {
        fullName: formData.declarantName || formData.declarationName,
        birthDate: formData.declarationDate
      },
      'Declarante'
    );
  }

  return Array.from(peopleMap.values());
}
