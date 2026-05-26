/**
 * fieldValidators.js
 * Módulo central de validación inteligente de campos para todos los formularios.
 * Valida que la información ingresada corresponda al tipo de dato solicitado.
 */

const PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  phone: /^[+]?[\d\s()-]{6,20}$/,
  onlyLetters: /^[\p{L}\s'.,-]+$/u,
  noOnlyNumbers: /(?!\d+$)/,
  date: /^\d{4}-\d{2}-\d{2}$/,
  url: /^https?:\/\/.+\..+/i,
  money: /^[\d,.$]+$/,
  idDocument: /^[\w\d\s./-]{3,30}$/,
  registrationNum: /^[\w\d\s./-]{1,30}$/,
};

const containsLetters = (v) => /\p{L}/u.test(v);

const validators = {
  personName(value) {
    if (!value || !value.trim()) return null;
    const v = value.trim();
    if (v.length < 2) return 'Mínimo 2 caracteres';
    if (/^\d+$/.test(v)) return 'Un nombre no puede ser solo números';
    if (!containsLetters(v)) return 'Debe contener letras';
    if (/[@#$%^&*()+=\[\]{}|\\<>~`]/.test(v)) return 'Contiene caracteres no válidos para un nombre';
    return null;
  },

  email(value) {
    if (!value || !value.trim()) return null;
    if (!PATTERNS.email.test(value.trim())) return 'Formato de correo inválido (ej: usuario@dominio.com)';
    return null;
  },

  phone(value) {
    if (!value || !value.trim()) return null;
    const v = value.trim();
    if (!PATTERNS.phone.test(v)) return 'Formato de teléfono inválido (solo números, +, -, paréntesis)';
    const digits = v.replace(/\D/g, '');
    if (digits.length < 6) return 'Teléfono muy corto (mínimo 6 dígitos)';
    if (digits.length > 15) return 'Teléfono muy largo (máximo 15 dígitos)';
    return null;
  },

  nationality(value) {
    if (!value || !value.trim()) return null;
    const v = value.trim();
    if (/^\d+$/.test(v)) return 'La nacionalidad no puede ser solo números';
    if (!containsLetters(v)) return 'Debe contener letras';
    if (v.length < 3) return 'Nacionalidad muy corta';
    if (/[@#$%^&*()+=\[\]{}|\\<>~`]/.test(v)) return 'Contiene caracteres no válidos';
    return null;
  },

  country(value) {
    if (!value || !value.trim()) return null;
    const v = value.trim();
    if (/^\d+$/.test(v)) return 'El país no puede ser solo números';
    if (!containsLetters(v)) return 'Debe contener letras';
    if (v.length < 2) return 'Nombre de país muy corto';
    return null;
  },

  city(value) {
    if (!value || !value.trim()) return null;
    const v = value.trim();
    if (/^\d+$/.test(v)) return 'La ciudad no puede ser solo números';
    if (!containsLetters(v)) return 'Debe contener letras';
    if (v.length < 2) return 'Nombre de ciudad muy corto';
    return null;
  },

  address(value) {
    if (!value || !value.trim()) return null;
    const v = value.trim();
    if (v.length < 5) return 'Dirección muy corta (mínimo 5 caracteres)';
    if (/^\d+$/.test(v)) return 'La dirección no puede ser solo números';
    return null;
  },

  idDocument(value) {
    if (!value || !value.trim()) return null;
    const v = value.trim();
    if (v.length < 3) return 'Identificación muy corta (mínimo 3 caracteres)';
    if (v.length > 30) return 'Identificación muy larga';
    return null;
  },

  date(value) {
    if (!value || !value.trim()) return null;
    if (!PATTERNS.date.test(value)) return 'Formato de fecha inválido';
    const d = new Date(value);
    if (isNaN(d.getTime())) return 'Fecha no válida';
    const year = d.getFullYear();
    if (year < 1900 || year > 2100) return 'Año fuera de rango (1900-2100)';
    return null;
  },

  birthDate(value) {
    if (!value || !value.trim()) return null;
    const err = validators.date(value);
    if (err) return err;
    const d = new Date(value);
    const now = new Date();
    if (d > now) return 'La fecha de nacimiento no puede ser en el futuro';
    const age = (now - d) / (365.25 * 24 * 60 * 60 * 1000);
    if (age < 1) return 'La persona debe tener al menos 1 año';
    if (age > 150) return 'Fecha de nacimiento no parece válida';
    return null;
  },

  money(value) {
    if (!value || !String(value).trim()) return null;
    const v = String(value).trim().replace(/[$,\s]/g, '');
    if (isNaN(Number(v))) return 'Debe ser un valor numérico';
    if (Number(v) < 0) return 'El valor no puede ser negativo';
    return null;
  },

  positiveInteger(value) {
    if (!value || !String(value).trim()) return null;
    const v = String(value).trim();
    if (!/^\d+$/.test(v)) return 'Debe ser un número entero';
    if (Number(v) <= 0) return 'Debe ser mayor a 0';
    return null;
  },

  companyName(value) {
    if (!value || !value.trim()) return null;
    const v = value.trim();
    if (v.length < 2) return 'Nombre de empresa muy corto';
    if (/^\d+$/.test(v)) return 'El nombre no puede ser solo números';
    return null;
  },

  textArea(value) {
    if (!value || !value.trim()) return null;
    const v = value.trim();
    if (v.length < 3) return 'Texto muy corto (mínimo 3 caracteres)';
    if (/^\d+$/.test(v)) return 'Debe contener texto descriptivo, no solo números';
    return null;
  },

  occupation(value) {
    if (!value || !value.trim()) return null;
    const v = value.trim();
    if (/^\d+$/.test(v)) return 'La ocupación no puede ser solo números';
    if (!containsLetters(v)) return 'Debe contener letras';
    if (v.length < 2) return 'Ocupación muy corta';
    return null;
  },

  website(value) {
    if (!value || !value.trim()) return null;
    const v = value.trim();
    if (v.length > 3 && !PATTERNS.url.test(v) && !v.includes('.')) {
      return 'Formato de URL inválido (ej: https://ejemplo.com)';
    }
    return null;
  },

  taxId(value) {
    if (!value || !value.trim()) return null;
    const v = value.trim();
    if (v.length < 3) return 'Identificación fiscal muy corta';
    return null;
  },

  percentage(value) {
    if (!value || !String(value).trim()) return null;
    const v = String(value).trim().replace('%', '');
    if (isNaN(Number(v))) return 'Debe ser un porcentaje numérico';
    const n = Number(v);
    if (n < 0 || n > 100) return 'El porcentaje debe estar entre 0 y 100';
    return null;
  },

  maritalStatus(value) {
    if (!value || !value.trim()) return null;
    const valid = ['soltero', 'casado', 'divorciado', 'viudo', 'union libre',
                   'single', 'married', 'divorced', 'widowed'];
    const v = value.trim().toLowerCase().replace(/\(a\)/g, '');
    if (!valid.some(s => v.includes(s)) && value.length > 0) {
      return null;
    }
    return null;
  },

  role(value) {
    if (!value || !value.trim()) return null;
    const v = value.trim();
    if (/^\d+$/.test(v)) return 'El cargo no puede ser solo números';
    if (!containsLetters(v)) return 'Debe contener letras';
    return null;
  },

  registrationNumber(value) {
    if (!value || !value.trim()) return null;
    const v = value.trim();
    if (v.length < 1) return 'Número de registro muy corto';
    return null;
  },

  required(value) {
    if (value === undefined || value === null) return 'Campo requerido';
    if (typeof value === 'string' && !value.trim()) return 'Campo requerido';
    return null;
  },
};

/**
 * FIELD_TYPE_MAP: Mapeo de nombre de campo → tipo de validador.
 * Cubre todos los formularios del sistema.
 */
const FIELD_TYPE_MAP = {
  // Nombres de persona
  fullName: 'personName',
  firstName: 'personName',
  secondName: 'personName',
  lastName: 'personName',
  name: 'personName',
  beneficiaryName: 'personName',
  signerName: 'personName',
  declarationName: 'personName',
  declarationSignature: 'personName',
  signature: 'personName',
  legalRepName: 'personName',
  shareholder: 'personName',
  poaFullName: 'personName',
  custodyName: 'personName',
  founderName: 'personName',

  // Email
  email: 'email',
  custodyEmail: 'email',
  poaEmail: 'email',

  // Teléfono
  phone: 'phone',
  custodyPhone: 'phone',
  poaPhone: 'phone',

  // Nacionalidad
  nationality: 'nationality',
  poaNationality: 'nationality',
  legalRepNationality: 'nationality',

  // País
  country: 'country',
  poaCountry: 'country',

  // Ciudad
  city: 'city',
  poaCity: 'city',

  // Dirección
  address: 'address',
  custodyAddress: 'address',
  registeredAddress: 'address',
  poaAddress: 'address',

  // Documentos de identidad
  passport: 'idDocument',
  idCard: 'idDocument',
  idNumber: 'idDocument',
  poaPassport: 'idDocument',
  poaIdCard: 'idDocument',
  legalRepId: 'idDocument',

  // Fechas
  birthDate: 'birthDate',
  poaBirthDate: 'birthDate',
  date: 'date',
  declarationDate: 'date',
  incorporationDate: 'date',
  poaValidityDate: 'date',

  // Dinero / Capital
  capitalSocial: 'money',
  initialPatrimony: 'money',
  value: 'money',

  // Números
  shares: 'positiveInteger',
  certificate: 'registrationNumber',
  registrationNumber: 'registrationNumber',

  // Empresa
  companyName: 'companyName',
  corpNameSA: 'companyName',
  corpNameCorp: 'companyName',
  corpNameInc: 'companyName',
  foundationNameOption1: 'companyName',
  foundationNameOption2: 'companyName',
  foundationNameOption3: 'companyName',
  legalName: 'companyName',
  tradeName: 'companyName',

  // Textos / Descripciones
  activities: 'textArea',
  companyActivities: 'textArea',
  foundationObjects: 'textArea',
  businessActivity: 'textArea',
  beneficialOwners: 'textArea',
  pepDetails: 'textArea',
  fundsOther: 'textArea',

  // Ocupación
  occupation: 'occupation',
  employer: 'companyName',

  // Lugar de nacimiento
  birthPlace: 'city',

  // Cargo / Rol
  role: 'role',

  // Porcentaje
  percentage: 'percentage',

  // Web
  website: 'website',

  // Identificadores fiscales
  taxId: 'taxId',
  jurisdiction: 'country',
};

/**
 * Valida un campo individual.
 * @param {string} fieldName - Nombre del campo
 * @param {*} value - Valor a validar
 * @returns {string|null} Mensaje de error o null si es válido
 */
export function validateField(fieldName, value) {
  const validatorName = FIELD_TYPE_MAP[fieldName];
  if (!validatorName || !validators[validatorName]) return null;
  return validators[validatorName](value);
}

/**
 * Valida múltiples campos de un objeto de datos.
 * @param {Object} data - Objeto con los datos del formulario
 * @param {string[]} fieldNames - Lista de campos a validar
 * @returns {Object} Mapa de fieldName → errorMessage (solo incluye campos con error)
 */
export function validateFields(data, fieldNames) {
  const errors = {};
  fieldNames.forEach(field => {
    const error = validateField(field, data[field]);
    if (error) errors[field] = error;
  });
  return errors;
}

/**
 * Valida un array de personas (directores, dignatarios, etc.).
 * @param {Object[]} people - Array de objetos persona
 * @param {string[]} fieldNames - Campos de persona a validar
 * @returns {Object[]} Array de mapas de errores por persona
 */
export function validatePersonArray(people, fieldNames) {
  return people.map(person => validateFields(person, fieldNames));
}

/**
 * Verifica si un mapa de errores tiene algún error.
 */
export function hasErrors(errorMap) {
  if (Array.isArray(errorMap)) {
    return errorMap.some(e => Object.keys(e).length > 0);
  }
  return Object.keys(errorMap).length > 0;
}

export { validators, FIELD_TYPE_MAP };
export default validators;
