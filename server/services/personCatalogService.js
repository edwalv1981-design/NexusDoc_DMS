const Person = require('../models/Person');
const FormData = require('../models/FormData');
const User = require('../models/User');
const { Op } = require('sequelize');

/**
 * personCatalogService.js
 * Servicio de sincronización y búsqueda optimizada para el Catálogo Maestro de Personas.
 */

/**
 * Extrae todas las personas presentes en una estructura JSON de cualquier tipo de formulario.
 */
function extractPeopleFromPayload(data = {}) {
  if (!data || typeof data !== 'object') return [];

  const peopleList = [];

  const addPerson = (obj, roleLabel) => {
    if (!obj || typeof obj !== 'object') return;
    const fullName = (
      obj.fullName ||
      obj.name ||
      obj.legalRepName ||
      obj.declarantName ||
      obj.declarationName ||
      obj.beneficiaryName ||
      obj.shareholder ||
      ''
    ).trim();

    if (!fullName || fullName.length < 2) return;

    const idNumber = (
      obj.passport ||
      obj.idCard ||
      obj.taxId ||
      obj.legalRepId ||
      obj.registrationNumber ||
      ''
    ).trim();

    peopleList.push({
      fullName,
      idNumber,
      passport: obj.passport || idNumber || '',
      idCard: obj.idCard || idNumber || '',
      nationality: obj.nationality || obj.country || '',
      birthDate: obj.birthDate || obj.incorporationDate || '',
      birthPlace: obj.birthPlace || '',
      maritalStatus: obj.maritalStatus || '',
      address: obj.address || obj.registeredAddress || obj.operatingAddress || '',
      phone: obj.phone || '',
      email: obj.email || '',
      city: obj.city || '',
      country: obj.country || '',
      entityType: obj.entityType || 'individual',
      lastRoleLabel: roleLabel || 'Registrado'
    });
  };

  // 1. Directores
  if (Array.isArray(data.directors)) {
    data.directors.forEach((d, idx) => addPerson(d, `Director ${idx + 1}`));
  }

  // 2. Dignatarios
  if (Array.isArray(data.dignitaries)) {
    data.dignitaries.forEach((d) => addPerson(d, d.role ? `Dignatario (${d.role})` : 'Dignatario'));
  } else if (data.dignitaries && typeof data.dignitaries === 'object') {
    Object.entries(data.dignitaries).forEach(([role, d]) => addPerson(d, `Dignatario (${role.toUpperCase()})`));
  }

  // 3. Accionistas / Suscriptores
  if (Array.isArray(data.shareholders)) {
    data.shareholders.forEach((s, idx) => addPerson(s, `Accionista ${idx + 1}`));
  }
  if (Array.isArray(data.subscribers)) {
    data.subscribers.forEach((s, idx) => addPerson(s, `Suscriptor ${idx + 1}`));
  }

  // 4. Fundadores
  if (Array.isArray(data.founders)) {
    data.founders.forEach((f, idx) => addPerson(f, `Fundador ${idx + 1}`));
  } else if (data.founder) {
    addPerson(data.founder, 'Fundador');
  }

  // 5. Consejo Fundacional
  if (Array.isArray(data.councilMembers)) {
    data.councilMembers.forEach((m, idx) => addPerson(m, `Consejo ${idx + 1}`));
  }

  // 6. Protectores
  if (Array.isArray(data.protectors)) {
    data.protectors.forEach((p, idx) => addPerson(p, `Protector ${idx + 1}`));
  } else if (data.protector) {
    addPerson(data.protector, 'Protector');
  }

  // 7. Beneficiarios
  if (Array.isArray(data.beneficiaries)) {
    data.beneficiaries.forEach((b, idx) => addPerson(b, `Beneficiario ${idx + 1}`));
  }
  if (Array.isArray(data.beneficialOwners)) {
    data.beneficialOwners.forEach((b, idx) => addPerson(b, `Beneficiario Final ${idx + 1}`));
  }

  // 8. Representante Legal / Declarante / Apoderados (Campos planos)
  if (data.legalRepName) {
    addPerson({ fullName: data.legalRepName, passport: data.legalRepId, nationality: data.legalRepNationality }, 'Representante Legal');
  }
  if (data.poaFullName) {
    addPerson({
      fullName: data.poaFullName,
      birthDate: data.poaBirthDate,
      maritalStatus: data.poaMaritalStatus,
      nationality: data.poaNationality,
      passport: data.poaPassport,
      idCard: data.poaIdCard,
      phone: data.poaPhone,
      email: data.poaEmail,
      address: data.poaAddress,
      city: data.poaCity,
      country: data.poaCountry
    }, 'Apoderado');
  }
  if (Array.isArray(data.signers)) {
    data.signers.forEach((s) => addPerson(s, 'Firmante'));
  }
  if (data.declarantName || data.declarationName) {
    addPerson({ fullName: data.declarantName || data.declarationName }, 'Declarante');
  }

  return peopleList;
}

/**
 * Sincroniza y realiza Upsert de las personas de un formulario al Catálogo Maestro `Person`.
 */
async function syncPeopleFromFormData(userId, formDataPayload) {
  if (!userId || !formDataPayload) return;

  try {
    await Person.sync().catch(() => {});
    const extracted = extractPeopleFromPayload(formDataPayload);
    if (!extracted || extracted.length === 0) return;

    for (const item of extracted) {
      const searchCriteria = { userId };
      if (item.passport || item.idNumber) {
        searchCriteria[Op.or] = [
          { passport: item.passport || item.idNumber },
          { idNumber: item.idNumber || item.passport },
          { fullName: item.fullName }
        ];
      } else {
        searchCriteria.fullName = item.fullName;
      }

      const existing = await Person.findOne({ where: searchCriteria });

      if (existing) {
        // Actualizar datos faltantes
        const updates = {};
        if (!existing.passport && item.passport) updates.passport = item.passport;
        if (!existing.idNumber && item.idNumber) updates.idNumber = item.idNumber;
        if (!existing.idCard && item.idCard) updates.idCard = item.idCard;
        if (!existing.nationality && item.nationality) updates.nationality = item.nationality;
        if (!existing.birthDate && item.birthDate) updates.birthDate = item.birthDate;
        if (!existing.maritalStatus && item.maritalStatus) updates.maritalStatus = item.maritalStatus;
        if (!existing.address && item.address) updates.address = item.address;
        if (!existing.phone && item.phone) updates.phone = item.phone;
        if (!existing.email && item.email) updates.email = item.email;
        if (!existing.city && item.city) updates.city = item.city;
        if (!existing.country && item.country) updates.country = item.country;
        if (item.lastRoleLabel) updates.lastRoleLabel = item.lastRoleLabel;

        if (Object.keys(updates).length > 0) {
          await existing.update(updates);
        }
      } else {
        // Crear nuevo registro en el catálogo
        await Person.create({
          userId,
          ...item
        });
      }
    }
  } catch (err) {
    console.error('Error al sincronizar personas con Catálogo Maestro:', err);
  }
}

/**
 * Busca personas en el Catálogo Maestro filtradas por el usuario activo (Multi-Tenant).
 */
async function searchPersonCatalog(userId, queryLimit) {
  const query = (queryLimit || '').trim();
  if (!query || query.length < 2) return [];

  try {
    await Person.sync().catch(() => {});
    const pattern = `%${query}%`;
    const people = await Person.findAll({
      where: {
        userId,
        [Op.or]: [
          { fullName: { [Op.iLike]: pattern } },
          { idNumber: { [Op.iLike]: pattern } },
          { passport: { [Op.iLike]: pattern } },
          { email: { [Op.iLike]: pattern } }
        ]
      },
      order: [['updatedAt', 'DESC']],
      limit: 15
    });

    return people.map(p => ({
      fullName: p.fullName,
      name: p.fullName,
      passport: p.passport || p.idNumber || '',
      idNumber: p.idNumber || p.passport || '',
      idCard: p.idCard || '',
      nationality: p.nationality || '',
      birthDate: p.birthDate || '',
      birthPlace: p.birthPlace || '',
      maritalStatus: p.maritalStatus || '',
      address: p.address || '',
      city: p.city || '',
      country: p.country || '',
      phone: p.phone || '',
      email: p.email || '',
      roleLabel: p.lastRoleLabel || 'Catálogo'
    }));
  } catch (err) {
    console.error('Error al buscar en Catálogo Maestro Person:', err);
    return [];
  }
}

/**
 * Escanea y migra todos los trámites históricos existentes a la tabla `Person`.
 */
async function backfillHistoricalData() {
  try {
    await Person.sync().catch(() => {});
    const count = await Person.count();
    // Si la tabla ya tiene personas, no hace falta backfill masivo
    if (count > 0) return;

    console.log('Iniciando poblamiento histórico del Catálogo Maestro Person...');
    const allForms = await FormData.findAll();
    for (const f of allForms) {
      if (f.userId && f.data) {
        await syncPeopleFromFormData(f.userId, f.data);
      }
    }
    console.log(`Catálogo Maestro Person poblado exitosamente con trámites históricos.`);
  } catch (err) {
    console.error('Error durante el backfill histórico:', err);
  }
}

module.exports = {
  extractPeopleFromPayload,
  syncPeopleFromFormData,
  searchPersonCatalog,
  backfillHistoricalData
};
