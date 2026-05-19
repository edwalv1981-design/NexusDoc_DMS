import React, { useState, useEffect } from 'react';
import { 
    Heart, Users, UserCheck, Shield, FileCheck, 
    Plus, Trash2, ChevronRight, ChevronLeft, Save, 
    CheckCircle2, Info, Award, KeyRound, Globe, FileText
} from 'lucide-react';
import { useLang } from '../i18n';
import FundacionPersonFields from '../components/FundacionPersonFields';
import FundacionRegistryNameInput from '../components/FundacionRegistryNameInput';
import {
    emptyFundacionPerson,
    emptyFundacionDignitary,
    emptyFundacionBeneficiary,
    normalizeFundacionPerson,
    normalizeLoadedFundacionData,
    personDisplayName,
    personHasData,
    snapshotFromPerson,
    FUNDACION_DIGNITARY_FIELDS,
} from '../utils/fundacionPersonSchema';
import {
    buildRegistry,
    applyRoleFields,
    pickFields,
    findMatch,
    findPersonInRegistry,
    getPersonNameSuggestions,
    snapshotPersonFields,
} from '../utils/fundacionPersonRegistry';

const BENEFICIARY_REGISTRY_FILL = ['birthDate', 'address'];

const FundacionForm = ({ initialData, onSave, saving }) => {
    const { lang, t } = useLang();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        // Basic Info (Step 1)
        foundationNameOption1: '', foundationNameOption2: '', foundationNameOption3: '',
        
        // Capital Social (Step 2)
        initialPatrimony: '10000', 
        
        // Dynamic Arrays (Steps 3, 4, 5, 6, 7)
        founders: [emptyFundacionPerson()],
        protectors: [emptyFundacionPerson()],
        councilMembers: [emptyFundacionPerson(), emptyFundacionPerson(), emptyFundacionPerson()],
        dignitaries: [
            emptyFundacionDignitary('PRESIDENTE'),
            emptyFundacionDignitary('SECRETARIO'),
            emptyFundacionDignitary('TESORERO'),
        ],
        beneficiaries: [emptyFundacionBeneficiary()],
        
        // Original POA Fields (Step 8)
        poaIssue: 'NO', // 'YES', 'NO'
        poaType: 'GENERAL', // 'GENERAL', 'SPECIAL'
        poaValidityDate: '',
        poaLegalized: 'NO', // 'YES', 'NO'
        poaFirstName: '',
        poaMiddleName: '',
        poaLastName: '',
        poaBirthDate: '',
        poaMaritalStatus: '',
        poaNationality: '',
        poaPassport: '',
        poaIdCard: '',
        poaPhone: '',
        poaEmail: '',
        poaAddress: '',
        poaCity: '',
        poaCountry: '',

        // Fines/Actividades (Step 9)
        foundationObjects: '',

        declarationName: '',
        declarationSignature: '',
        signers: [{ signature: '', name: '' }],
        declarationDate: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        if (!initialData || Object.keys(initialData).length === 0) return;
        try {
            const normalized = normalizeLoadedFundacionData(initialData, formData);
            const cleanData = { ...initialData, ...normalized };
            if (cleanData.declarationName === undefined) cleanData.declarationName = formData.declarationName;
            if (cleanData.declarationSignature === undefined) cleanData.declarationSignature = formData.declarationSignature;
            if (cleanData.signers[0] && !cleanData.declarationName) {
                cleanData.declarationName = cleanData.signers[0].name || '';
                cleanData.declarationSignature = cleanData.signers[0].signature || cleanData.signers[0].name || '';
            }

            if (cleanData.poaIssue === undefined) cleanData.poaIssue = formData.poaIssue;
            if (cleanData.poaType === undefined) cleanData.poaType = formData.poaType;
            if (cleanData.poaValidityDate === undefined) cleanData.poaValidityDate = formData.poaValidityDate;
            if (cleanData.poaLegalized === undefined) cleanData.poaLegalized = formData.poaLegalized;
            if (cleanData.poaFirstName === undefined) cleanData.poaFirstName = formData.poaFirstName;
            if (cleanData.poaMiddleName === undefined) cleanData.poaMiddleName = formData.poaMiddleName;
            if (cleanData.poaLastName === undefined) cleanData.poaLastName = formData.poaLastName;
            if (cleanData.poaBirthDate === undefined) cleanData.poaBirthDate = formData.poaBirthDate;
            if (cleanData.poaMaritalStatus === undefined) cleanData.poaMaritalStatus = formData.poaMaritalStatus;
            if (cleanData.poaNationality === undefined) cleanData.poaNationality = formData.poaNationality;
            if (cleanData.poaPassport === undefined) cleanData.poaPassport = formData.poaPassport;
            if (cleanData.poaIdCard === undefined) cleanData.poaIdCard = formData.poaIdCard;
            if (cleanData.poaPhone === undefined) cleanData.poaPhone = formData.poaPhone;
            if (cleanData.poaEmail === undefined) cleanData.poaEmail = formData.poaEmail;
            if (cleanData.poaAddress === undefined) cleanData.poaAddress = formData.poaAddress;
            if (cleanData.poaCity === undefined) cleanData.poaCity = formData.poaCity;
            if (cleanData.poaCountry === undefined) cleanData.poaCountry = formData.poaCountry;

            setFormData((prev) => ({ ...prev, ...cleanData }));
        } catch (err) {
            console.error('FundacionForm: failed to load saved data', err);
        }
    }, [initialData]);

    const getAvailablePersons = (excludeStep) => {
        const list = [];
        const pushPerson = (roleLabel, person, extra = {}) => {
            const p = normalizeFundacionPerson({ ...person, ...extra });
            if (!personHasData(p) && !person.fullName) return;
            const name = personDisplayName(p) || person.fullName;
            if (!name) return;
            list.push({ label: `${roleLabel} — ${name}`, data: snapshotFromPerson(p) });
        };
        if (excludeStep !== 'founder') {
            pushPerson(lang === 'en' ? 'Founder' : 'Fundador', formData.founders[0] || {});
        }
        if (excludeStep !== 'protector') {
            formData.protectors.forEach((p, idx) => {
                pushPerson(`${lang === 'en' ? 'Protector' : 'Protector'} #${idx + 1}`, p);
            });
        }
        if (excludeStep !== 'director') {
            formData.councilMembers.forEach((m, idx) => {
                pushPerson(`${lang === 'en' ? 'Director' : 'Director'} #${idx + 1}`, m);
            });
        }
        if (excludeStep !== 'dignitary') {
            formData.dignitaries.forEach((d, idx) => {
                if (d.fullName) {
                    list.push({
                        label: `${lang === 'en' ? 'Dignitary' : 'Dignatario'} #${idx + 1} — ${d.fullName}`,
                        data: snapshotFromPerson(normalizeFundacionPerson(d)),
                    });
                }
            });
        }
        if (excludeStep !== 'beneficiary') {
            formData.beneficiaries.forEach((b, idx) => {
                const name = String(b.shareholder || b.fullName || '').trim();
                if (name) {
                    list.push({
                        label: `${lang === 'en' ? 'Beneficiary' : 'Beneficiario'} #${idx + 1} — ${name}`,
                        data: { ...snapshotFromPerson(normalizeFundacionPerson(b)), percentage: b.percentage },
                    });
                }
            });
        }
        const poaName = [formData.poaFirstName, formData.poaMiddleName, formData.poaLastName].filter(Boolean).join(' ');
        if (excludeStep !== 'poa' && poaName) {
            list.push({
                label: `${lang === 'en' ? 'Attorney-in-fact' : 'Apoderado'} — ${poaName}`,
                data: snapshotFromPerson({
                    firstName: formData.poaFirstName,
                    secondName: formData.poaMiddleName,
                    lastName: formData.poaLastName,
                    birthDate: formData.poaBirthDate,
                    maritalStatus: formData.poaMaritalStatus,
                    nationality: formData.poaNationality,
                    passport: formData.poaPassport,
                    idCard: formData.poaIdCard,
                    phone: formData.poaPhone,
                    email: formData.poaEmail,
                    address: formData.poaAddress,
                    city: formData.poaCity,
                    country: formData.poaCountry,
                }),
            });
        }
        return list;
    };

    const applyPersonSnapshot = (arrayName, index, snapshot) => {
        if (!snapshot?.data) return;
        const rows = formData[arrayName];
        if (!Array.isArray(rows) || index < 0 || index >= rows.length) return;
        const merged = { ...rows[index], ...snapshotFromPerson(snapshot.data) };
        if (snapshot.data.percentage !== undefined) merged.percentage = snapshot.data.percentage;
        const next = [...rows];
        next[index] = merged;
        setFormData((prev) => ({ ...prev, [arrayName]: next }));
    };

    const applyRegistryPerson = (arrayName, index, fields) => {
        const rows = formData[arrayName];
        if (!Array.isArray(rows) || index < 0 || index >= rows.length) return;
        const next = [...rows];
        next[index] = { ...rows[index], ...fields };
        setFormData((prev) => ({ ...prev, [arrayName]: next }));
    };

    const mergePersonIntoRow = (arrayName, index, source, allowedFields) => {
        const rows = formData[arrayName];
        if (!Array.isArray(rows) || index < 0 || index >= rows.length || !source) return;
        const merged = applyRoleFields(rows[index], source, allowedFields);
        const next = [...rows];
        next[index] = merged;
        setFormData((prev) => ({ ...prev, [arrayName]: next }));
    };

    const applyPoaFromRegistry = (source) => {
        if (!source) return;
        const p = snapshotPersonFields(source);
        setFormData((prev) => ({
            ...prev,
            poaFirstName: p.firstName || prev.poaFirstName,
            poaMiddleName: p.secondName || prev.poaMiddleName,
            poaLastName: p.lastName || prev.poaLastName,
            poaBirthDate: p.birthDate || prev.poaBirthDate,
            poaMaritalStatus: p.maritalStatus || prev.poaMaritalStatus,
            poaNationality: p.nationality || prev.poaNationality,
            poaPassport: p.passport || prev.poaPassport,
            poaIdCard: p.idCard || prev.poaIdCard,
            poaPhone: p.phone || prev.poaPhone,
            poaEmail: p.email || prev.poaEmail,
            poaAddress: p.address || prev.poaAddress,
            poaCity: p.city || prev.poaCity,
            poaCountry: p.country || prev.poaCountry,
        }));
    };

    const tryApplyPoaFromTypedName = () => {
        const registry = buildRegistry(formData, { arrayName: 'poa' });
        const draft = {
            firstName: formData.poaFirstName,
            secondName: formData.poaMiddleName,
            lastName: formData.poaLastName,
        };
        const hit =
            findPersonInRegistry(registry, draft) ||
            findMatch(registry, personDisplayName(normalizeFundacionPerson(draft)));
        if (hit) applyPoaFromRegistry(hit);
    };

    const handleImportPOA = (person) => {
        if (!person?.data) return;
        const p = snapshotFromPerson(person.data);
        setFormData((prev) => ({
            ...prev,
            poaFirstName: p.firstName || prev.poaFirstName,
            poaMiddleName: p.secondName || prev.poaMiddleName,
            poaLastName: p.lastName || prev.poaLastName,
            poaBirthDate: p.birthDate || prev.poaBirthDate,
            poaMaritalStatus: p.maritalStatus || prev.poaMaritalStatus,
            poaNationality: p.nationality || prev.poaNationality,
            poaPassport: p.passport || prev.poaPassport,
            poaIdCard: p.idCard || prev.poaIdCard,
            poaPhone: p.phone || prev.poaPhone,
            poaEmail: p.email || prev.poaEmail,
            poaAddress: p.address || prev.poaAddress,
            poaCity: p.city || prev.poaCity,
            poaCountry: p.country || prev.poaCountry,
        }));
    };

    const PersonCopySelect = ({ excludeStep, onSelect }) => {
        const persons = getAvailablePersons(excludeStep);
        if (!persons.length) return null;
        return (
            <div className="person-copy-box">
                <label>{t('fundacion.copyFrom')}</label>
                <select
                    className="expert-input"
                    defaultValue=""
                    onChange={(e) => {
                        const picked = persons[Number(e.target.value)];
                        if (picked) onSelect(picked);
                        e.target.value = '';
                    }}
                >
                    <option value="">{t('fundacion.copySelect')}</option>
                    {persons.map((p, idx) => (
                        <option key={idx} value={idx}>{p.label}</option>
                    ))}
                </select>
            </div>
        );
    };

    const updateArrayField = (arrayName, index, field, value) => {
        const newArray = [...formData[arrayName]];
        newArray[index][field] = value;
        setFormData(prev => ({ ...prev, [arrayName]: newArray }));
    };

    const addArrayItem = (arrayName, emptyObj) => {
        setFormData(prev => ({
            ...prev,
            [arrayName]: [...prev[arrayName], emptyObj]
        }));
    };

    const removeArrayItem = (arrayName, index, minItems = 1) => {
        if (formData[arrayName].length <= minItems) return;
        setFormData(prev => ({
            ...prev,
            [arrayName]: prev[arrayName].filter((_, i) => i !== index)
        }));
    };

    const updateSigner = (index, field, value) => {
        if (index !== 0) return;
        if (field === 'name') {
            setFormData(prev => ({ ...prev, declarationName: value, declarationSignature: value, signers: [{ name: value, signature: value }] }));
        } else {
            setFormData(prev => ({ ...prev, declarationSignature: value, signers: [{ name: prev.declarationName, signature: value }] }));
        }
    };

    const PRIMARY = '#0078d4';
    const SECONDARY = '#1e293b';

    // RENDER DE LOS 10 PASOS SOLICITADOS POR EL USUARIO

    // Paso 1: Nombre de la fundación (colocar 3 nombres)
    const renderStep1 = () => (
        <div className="expert-step animate-in fade-in slide-in-from-bottom-4">
            <h2 className="expert-step-title"><Heart size={22} color={PRIMARY} /> {lang === 'en' ? 'Step 1: Foundation Name' : 'Paso 1: Nombre de la Fundación'}</h2>
            
            <div className="expert-hint-box">
                <Info size={20} color="#0369a1" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '13px', lineHeight: '1.5' }}>
                    <strong>
                        {lang === 'en'
                            ? 'Please submit 3 name options in order of preference. The system will verify availability.'
                            : 'Por favor ingrese 3 opciones de nombre en orden de preferencia para verificar disponibilidad legal.'
                        }
                    </strong>
                    <div style={{ marginTop: '6px', fontSize: '11.5px', color: '#475569' }}>
                        {lang === 'en'
                            ? 'Note: The name must end with the word "Foundation" or "Fundación".'
                            : 'Nota: El nombre debe terminar obligatoriamente con la palabra "Foundation" o "Fundación".'
                        }
                    </div>
                </div>
            </div>

            <div className="expert-grid">
                <div className="expert-field full-width">
                    <label>{lang === 'en' ? 'Foundation Name - 1st Choice (Required)' : 'Opción 1 de Nombre (Requerido)'}</label>
                    <input className="expert-input" value={formData.foundationNameOption1} onChange={e => setFormData({...formData, foundationNameOption1: e.target.value.toUpperCase()})} placeholder="EJ: FUNDACIÓN ESPERANZA" required />
                </div>
                <div className="expert-field">
                    <label>{lang === 'en' ? 'Foundation Name - 2nd Choice' : 'Opción 2 de Nombre'}</label>
                    <input className="expert-input" value={formData.foundationNameOption2} onChange={e => setFormData({...formData, foundationNameOption2: e.target.value.toUpperCase()})} placeholder="EJ: FUNDACIÓN PROGRESO" />
                </div>
                <div className="expert-field">
                    <label>{lang === 'en' ? 'Foundation Name - 3rd Choice' : 'Opción 3 de Nombre'}</label>
                    <input className="expert-input" value={formData.foundationNameOption3} onChange={e => setFormData({...formData, foundationNameOption3: e.target.value.toUpperCase()})} placeholder="EJ: FUNDACIÓN FUTURO" />
                </div>
            </div>
        </div>
    );

    // Paso 2: Capital social (Patrimonio inicial)
    const renderStep2 = () => (
        <div className="expert-step animate-in fade-in slide-in-from-bottom-4">
            <h2 className="expert-step-title"><Award size={22} color={PRIMARY} /> {lang === 'en' ? 'Step 2: Initial Endowment' : 'Paso 2: Capital Social / Patrimonio Inicial'}</h2>
            
            <div className="expert-hint-box">
                <Info size={20} color="#0369a1" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '13px', lineHeight: '1.5' }}>
                    {lang === 'en'
                        ? 'The minimum initial endowment (Capital Social) to constitute a Private Interest Foundation in Panama is US$10,000.00.'
                        : 'El patrimonio mínimo inicial (Capital Social) para constituir una Fundación de Interés Privado en Panamá es de US$10,000.00.'
                    }
                </div>
            </div>

            <div className="expert-grid">
                <div className="expert-field full-width">
                    <label>{lang === 'en' ? 'Initial Endowment (USD)' : 'Capital Social / Patrimonio Declarado (USD)'}</label>
                    <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', fontWeight: 900, color: '#94a3b8' }}>$</span>
                        <input type="number" className="expert-input" style={{ paddingLeft: '32px' }} value={formData.initialPatrimony} onChange={e => setFormData({...formData, initialPatrimony: e.target.value})} placeholder="10000" />
                    </div>
                </div>
            </div>
        </div>
    );

    const renderPersonCard = (arrayName, index, cardLabel, excludeStep, canRemove, minItems) => {
        const registry = buildRegistry(formData, { arrayName, index });
        return (
        <div key={index} className="expert-card-legal">
            <PersonCopySelect
                excludeStep={excludeStep}
                onSelect={(person) => applyPersonSnapshot(arrayName, index, person)}
            />
            <div className="expert-card-label">{cardLabel}</div>
            {canRemove && (
                <button type="button" onClick={() => removeArrayItem(arrayName, index, minItems)} className="expert-btn-remove">
                    <Trash2 size={16} />
                </button>
            )}
            <FundacionPersonFields
                person={formData[arrayName][index]}
                lang={lang}
                t={t}
                personRegistry={registry}
                onApplyPerson={(fields) => applyRegistryPerson(arrayName, index, fields)}
                onChange={(field, value) => updateArrayField(arrayName, index, field, value)}
            />
        </div>
        );
    };

    const applyLegacyFullNameSnapshot = (arrayName, index, snapshot) => {
        if (!snapshot?.data) return;
        const p = snapshotFromPerson(snapshot.data);
        const next = [...formData[arrayName]];
        next[index] = {
            ...next[index],
            fullName: personDisplayName(p) || next[index].fullName,
            birthDate: p.birthDate,
            passport: p.passport || p.idCard,
            address: p.address,
            percentage: snapshot.data.percentage ?? next[index].percentage,
        };
        setFormData(prev => ({ ...prev, [arrayName]: next }));
    };

    // Paso 3: Fundador
    const renderStep3 = () => (
        <div className="expert-step animate-in fade-in slide-in-from-bottom-4">
            <h2 className="expert-step-title"><Users size={22} color={PRIMARY} /> {lang === 'en' ? 'Step 3: Founder' : 'Paso 3: Fundador'}</h2>
            {formData.founders.map((_, i) => renderPersonCard('founders', i, lang === 'en' ? 'FOUNDER' : 'FUNDADOR', 'founder', false, 1))}
            {false && formData.founders.map((f, i) => (
                <div key={i} className="expert-card-legal">
                    <div className="expert-card-label">{lang === 'en' ? 'FOUNDER' : 'FUNDADOR'}</div>
                    <div className="expert-grid">
                        <div className="expert-field full-width">
                            <label>{lang === 'en' ? 'Full name' : 'Nombre completo'}</label>
                            <input className="expert-input" value={f.fullName} onChange={e => updateArrayField('founders', i, 'fullName', e.target.value)} placeholder={lang === 'en' ? 'As it appears on Passport/ID...' : 'Como aparece en el pasaporte/cédula...'} />
                        </div>
                        <div className="expert-field">
                            <label>{lang === 'en' ? 'Date of birth' : 'Fecha de nacimiento'}</label>
                            <input type="date" className="expert-input" value={f.birthDate} onChange={e => updateArrayField('founders', i, 'birthDate', e.target.value)} />
                        </div>
                        <div className="expert-field">
                            <label>{lang === 'en' ? 'Place of birth' : 'Lugar de nacimiento'}</label>
                            <input className="expert-input" value={f.birthPlace || ''} onChange={e => updateArrayField('founders', i, 'birthPlace', e.target.value)} />
                        </div>
                        <div className="expert-field">
                            <label>{lang === 'en' ? 'Nationality' : 'Nacionalidad'}</label>
                            <input className="expert-input" value={f.nationality || ''} onChange={e => updateArrayField('founders', i, 'nationality', e.target.value)} />
                        </div>
                        <div className="expert-field">
                            <label>{lang === 'en' ? 'Passport / ID' : 'Pasaporte / Cédula'}</label>
                            <input className="expert-input" value={f.passport} onChange={e => updateArrayField('founders', i, 'passport', e.target.value)} />
                        </div>
                        <div className="expert-field full-width">
                            <label>{lang === 'en' ? 'Residential Address' : 'Dirección completa'}</label>
                            <input className="expert-input" value={f.address} onChange={e => updateArrayField('founders', i, 'address', e.target.value)} placeholder={lang === 'en' ? 'Complete residential address...' : 'Dirección residencial completa...'} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    // Paso 4: Protectores
    const renderStep4 = () => (
        <div className="expert-step animate-in fade-in slide-in-from-bottom-4">
            <div className="expert-section-header">
                <h2 className="expert-step-title"><Shield size={22} color={PRIMARY} /> {lang === 'en' ? 'Step 4: Protectors' : 'Paso 4: Protectores'}</h2>
                <button type="button" onClick={() => addArrayItem('protectors', emptyFundacionPerson())} className="expert-btn-add">
                    <Plus size={16} /> {lang === 'en' ? 'ADD PROTECTOR' : 'AÑADIR PROTECTOR'}
                </button>
            </div>
            {formData.protectors.map((_, i) =>
                renderPersonCard(
                    'protectors',
                    i,
                    lang === 'en' ? `PROTECTOR #${i + 1}` : `PROTECTOR #${i + 1}`,
                    'protector',
                    formData.protectors.length > 1,
                    1
                )
            )}
        </div>
    );

    // Paso 5: Directores (Consejo de Fundación)
    const renderStep5 = () => (
        <div className="expert-step animate-in fade-in slide-in-from-bottom-4">
            <div className="expert-section-header">
                <h2 className="expert-step-title"><Users size={22} color={PRIMARY} /> {lang === 'en' ? 'Step 5: Directors (Foundation Council)' : 'Paso 5: Directores (Consejo de Fundación)'}</h2>
                <button type="button" onClick={() => addArrayItem('councilMembers', emptyFundacionPerson())} className="expert-btn-add">
                    <Plus size={16} /> {lang === 'en' ? 'ADD COUNCIL MEMBER' : 'AÑADIR MIEMBRO'}
                </button>
            </div>
            {formData.councilMembers.map((_, i) =>
                renderPersonCard(
                    'councilMembers',
                    i,
                    lang === 'en' ? `DIRECTOR #${i + 1}` : `DIRECTOR #${i + 1}`,
                    'director',
                    formData.councilMembers.length > 3,
                    3
                )
            )}
        </div>
    );

    // Paso 6: Dignatarios
    const renderStep6 = () => (
        <div className="expert-step animate-in fade-in slide-in-from-bottom-4">
            <div className="expert-section-header">
                <h2 className="expert-step-title"><UserCheck size={22} color={PRIMARY} /> {lang === 'en' ? 'Step 6: Dignitaries' : 'Paso 6: Dignatarios'}</h2>
                <button type="button" onClick={() => addArrayItem('dignitaries', emptyFundacionDignitary())} className="expert-btn-add">
                    <Plus size={16} /> {lang === 'en' ? 'ADD DIGNITARY' : 'AÑADIR DIGNATARIO'}
                </button>
            </div>
            {formData.dignitaries.map((d, i) => (
                <div key={i} className="expert-card-legal">
                    <div className="expert-card-label">{lang === 'en' ? `DIGNITARY #${i+1}` : `DIGNATARIO #${i+1}`}</div>
                    {formData.dignitaries.length > 3 && <button type="button" onClick={() => removeArrayItem('dignitaries', i, 3)} className="expert-btn-remove"><Trash2 size={16} /></button>}
                    <div className="expert-grid">
                        <div className="expert-field">
                            <label>{t('fundacion.dignitary.role')}</label>
                            <input className="expert-input" list="roles-dignitaries" value={d.role || ''} onChange={e => updateArrayField('dignitaries', i, 'role', e.target.value.toUpperCase())} placeholder="EJ: PRESIDENTE" />
                        </div>
                        <div className="expert-field full-width">
                            <label>{t('fundacion.dignitary.fullName')}</label>
                            <FundacionRegistryNameInput
                                value={d.fullName || ''}
                                onChange={(v) => updateArrayField('dignitaries', i, 'fullName', v)}
                                registry={buildRegistry(formData, { arrayName: 'dignitaries', index: i })}
                                onMatch={(data) => mergePersonIntoRow('dignitaries', i, data, FUNDACION_DIGNITARY_FIELDS)}
                                placeholder={t('fundacion.dignitary.fullNamePlaceholder')}
                            />
                        </div>
                        <div className="expert-field">
                            <label>{t('fundacion.dignitary.birthDate')}</label>
                            <input type="date" className="expert-input" value={d.birthDate || ''} onChange={e => updateArrayField('dignitaries', i, 'birthDate', e.target.value)} />
                        </div>
                        <div className="expert-field full-width">
                            <label>{t('fundacion.dignitary.address')}</label>
                            <input className="expert-input" value={d.address || ''} onChange={e => updateArrayField('dignitaries', i, 'address', e.target.value)} placeholder={t('fundacion.dignitary.addressPlaceholder')} />
                        </div>
                        <div className="expert-field full-width">
                            <label>{t('fundacion.person.registrationNumber')}</label>
                            <input className="expert-input" value={d.registrationNumber || ''} onChange={e => updateArrayField('dignitaries', i, 'registrationNumber', e.target.value)} />
                        </div>
                    </div>
                </div>
                );
            })}
        </div>
    );

    // Paso 7: Beneficiarios
    const renderStep7 = () => (
        <div className="expert-step animate-in fade-in slide-in-from-bottom-4">
            <div className="expert-section-header">
                <h2 className="expert-step-title"><Award size={22} color={PRIMARY} /> {lang === 'en' ? 'Step 7: Beneficiaries' : 'Paso 7: Beneficiarios'}</h2>
                <button type="button" onClick={() => addArrayItem('beneficiaries', emptyFundacionBeneficiary())} className="expert-btn-add">
                    <Plus size={16} /> {lang === 'en' ? 'ADD BENEFICIARY' : 'AÑADIR BENEFICIARIO'}
                </button>
            </div>
            {formData.beneficiaries.map((b, i) => {
                const registry = buildRegistry(formData, { arrayName: 'beneficiaries', index: i });
                return (
                <div key={i} className="expert-card-legal">
                    <div className="expert-card-label">{lang === 'en' ? `BENEFICIARY #${i+1}` : `BENEFICIARIO #${i+1}`}</div>
                    {formData.beneficiaries.length > 1 && <button type="button" onClick={() => removeArrayItem('beneficiaries', i)} className="expert-btn-remove"><Trash2 size={16} /></button>}
                    <div className="expert-grid">
                        <div className="expert-field">
                            <label>{t('fundacion.beneficiary.percentage')}</label>
                            <input className="expert-input" placeholder={t('fundacion.beneficiary.percentagePlaceholder')} value={b.percentage || ''} onChange={e => updateArrayField('beneficiaries', i, 'percentage', e.target.value)} />
                        </div>
                        <div className="expert-field full-width">
                            <label>{t('fundacion.beneficiary.shareholder')}</label>
                            <FundacionRegistryNameInput
                                value={b.shareholder || ''}
                                onChange={(v) => updateArrayField('beneficiaries', i, 'shareholder', v)}
                                registry={registry}
                                onMatch={(data) => {
                                    const fill = pickFields(data, BENEFICIARY_REGISTRY_FILL);
                                    if (Object.keys(fill).length) applyRegistryPerson('beneficiaries', i, fill);
                                }}
                                placeholder={t('fundacion.beneficiary.shareholderPlaceholder')}
                            />
                        </div>
                        <div className="expert-field">
                            <label>{t('fundacion.beneficiary.birthDate')}</label>
                            <input type="date" className="expert-input" value={b.birthDate || ''} onChange={e => updateArrayField('beneficiaries', i, 'birthDate', e.target.value)} />
                        </div>
                        <div className="expert-field full-width">
                            <label>{t('fundacion.beneficiary.address')}</label>
                            <input className="expert-input" value={b.address || ''} onChange={e => updateArrayField('beneficiaries', i, 'address', e.target.value)} placeholder={t('fundacion.beneficiary.addressPlaceholder')} />
                        </div>
                    </div>
                </div>
                );
            })}
        </div>
    );

    // Paso 8: Poderes (Power of Attorney - ORIGINAL EXACT FORMAT)
    const renderStep8 = () => {
        const availablePersons = getAvailablePersons('poa');
        return (
            <div className="expert-step animate-in fade-in slide-in-from-bottom-4">
                <h2 className="expert-step-title"><KeyRound size={22} color={PRIMARY} /> {lang === 'en' ? 'Step 8: Power Of Attorney / Poderes (Optional)' : 'Paso 8: Power Of Attorney / Poderes (Opcional)'}</h2>
                
                {getAvailablePersons('poa').length > 0 && (
                    <div className="person-copy-box" style={{ marginBottom: '20px' }}>
                        <label>{t('fundacion.copyFrom')}</label>
                        <select
                            className="expert-input"
                            defaultValue=""
                            onChange={(e) => {
                                const list = getAvailablePersons('poa');
                                const selected = list[Number(e.target.value)];
                                if (selected) handleImportPOA(selected);
                                e.target.value = '';
                            }}
                        >
                            <option value="">{t('fundacion.copySelect')}</option>
                            {getAvailablePersons('poa').map((p, idx) => (
                                <option key={idx} value={idx}>{p.label}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="poa-original-grid">
                    {/* LEFT COLUMN: Apoderado Details */}
                    <div className="poa-column-card">
                        <div className="poa-column-header">
                            {lang === 'en' 
                                ? 'Name, Address of the person who\'s the POA is granted and the acting form (Individual, Jointly, etc.)'
                                : 'Nombre, Dirección del Apoderado y forma en que ejercerá el Poder (Individual, Conjunta, etc.)'
                            }
                        </div>
                        <div className="expert-grid" style={{ padding: '20px' }}>
                            <div className="expert-field">
                                <label>{lang === 'en' ? 'First name / Nombre' : 'First name / Nombre'}</label>
                                <input className="expert-input" value={formData.poaFirstName} onChange={e => setFormData({...formData, poaFirstName: e.target.value})} onBlur={tryApplyPoaFromTypedName} list={getPersonNameSuggestions(buildRegistry(formData, { arrayName: 'poa' })).length ? 'poa-names' : undefined} autoComplete="off" />
                            </div>
                            <div className="expert-field">
                                <label>{lang === 'en' ? 'Middle name / Segundo nombre' : 'Middle name / Segundo nombre'}</label>
                                <input className="expert-input" value={formData.poaMiddleName} onChange={e => setFormData({...formData, poaMiddleName: e.target.value})} />
                            </div>
                            <div className="expert-field full-width">
                                <label>{lang === 'en' ? 'Surname(s) / Apellidos' : 'Surname(s) / Apellidos'}</label>
                                <input className="expert-input" value={formData.poaLastName} onChange={e => setFormData({...formData, poaLastName: e.target.value})} onBlur={tryApplyPoaFromTypedName} list={getPersonNameSuggestions(buildRegistry(formData, { arrayName: 'poa' })).length ? 'poa-names' : undefined} autoComplete="off" />
                            </div>
                            
                            <div className="expert-field">
                                <label>{lang === 'en' ? 'Date of birth / Fecha de nacimiento' : 'Date of birth / Fecha de nacimiento'}</label>
                                <input type="date" className="expert-input" value={formData.poaBirthDate} onChange={e => setFormData({...formData, poaBirthDate: e.target.value})} />
                            </div>
                            <div className="expert-field">
                                <label>{lang === 'en' ? 'Marital Status / Estado civil' : 'Marital Status / Estado civil'}</label>
                                <select className="expert-input" value={formData.poaMaritalStatus} onChange={e => setFormData({...formData, poaMaritalStatus: e.target.value})}>
                                    <option value="">{lang === 'en' ? 'Select...' : 'Seleccione...'}</option>
                                    <option value="Single">{lang === 'en' ? 'Single / Soltero(a)' : 'Single / Soltero(a)'}</option>
                                    <option value="Married">{lang === 'en' ? 'Married / Casado(a)' : 'Married / Casado(a)'}</option>
                                    <option value="Divorced">{lang === 'en' ? 'Divorced / Divorciado(a)' : 'Divorced / Divorciado(a)'}</option>
                                    <option value="Widowed">{lang === 'en' ? 'Widowed / Viudo(a)' : 'Widowed / Viudo(a)'}</option>
                                </select>
                            </div>

                            <div className="expert-field">
                                <label>{lang === 'en' ? 'Citizenship / Nacionalidad' : 'Citizenship / Nacionalidad'}</label>
                                <input className="expert-input" value={formData.poaNationality} onChange={e => setFormData({...formData, poaNationality: e.target.value})} />
                            </div>
                            <div className="expert-field">
                                <label>{lang === 'en' ? 'Passport / Pasaporte' : 'Passport / Pasaporte'}</label>
                                <input className="expert-input" value={formData.poaPassport} onChange={e => setFormData({...formData, poaPassport: e.target.value})} />
                            </div>
                            
                            <div className="expert-field">
                                <label>{lang === 'en' ? 'ID' : 'ID'}</label>
                                <input className="expert-input" value={formData.poaIdCard} onChange={e => setFormData({...formData, poaIdCard: e.target.value})} />
                            </div>
                            <div className="expert-field">
                                <label>{lang === 'en' ? 'Phone / Teléfono' : 'Phone / Teléfono'}</label>
                                <input className="expert-input" value={formData.poaPhone} onChange={e => setFormData({...formData, poaPhone: e.target.value})} />
                            </div>

                            <div className="expert-field full-width">
                                <label>{lang === 'en' ? 'Email' : 'Email'}</label>
                                <input type="email" className="expert-input" value={formData.poaEmail} onChange={e => setFormData({...formData, poaEmail: e.target.value})} />
                            </div>

                            <div className="expert-field full-width">
                                <label>{lang === 'en' ? 'Address / Dirección' : 'Address / Dirección'}</label>
                                <input className="expert-input" value={formData.poaAddress} onChange={e => setFormData({...formData, poaAddress: e.target.value})} />
                            </div>

                            <div className="expert-field">
                                <label>{lang === 'en' ? 'City / ciudad' : 'City / ciudad'}</label>
                                <input className="expert-input" value={formData.poaCity} onChange={e => setFormData({...formData, poaCity: e.target.value})} />
                            </div>
                            <div className="expert-field">
                                <label>{lang === 'en' ? 'Country / Pais' : 'Country / Pais'}</label>
                                <input className="expert-input" value={formData.poaCountry} onChange={e => setFormData({...formData, poaCountry: e.target.value})} />
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Settings Questions */}
                    <div className="poa-column-card">
                        <div className="poa-column-header" style={{ background: '#0e7490' }}>
                            {lang === 'en' ? 'Power of Attorney Settings' : 'Configuración de Poderes'}
                        </div>
                        <div style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '25px' }}>
                            {/* Question 1: Emitir poder? */}
                            <div className="poa-question-box">
                                <div className="poa-question-text">
                                    <strong>Would you like to issue a Power of Attorney?</strong><br/>
                                    <span>Quiere Usted emitir un poder?</span>
                                </div>
                                <div className="poa-check-row">
                                    <label className="poa-check-label">
                                        <input type="radio" name="poaIssue" checked={formData.poaIssue === 'YES'} onChange={() => setFormData({...formData, poaIssue: 'YES'})} className="poa-radio" />
                                        <span>YES</span>
                                    </label>
                                    <label className="poa-check-label">
                                        <input type="radio" name="poaIssue" checked={formData.poaIssue === 'NO'} onChange={() => setFormData({...formData, poaIssue: 'NO'})} className="poa-radio" />
                                        <span>NO</span>
                                    </label>
                                </div>
                            </div>

                            {/* Question 2: Tipo de Poder */}
                            <div className="poa-question-box">
                                <div className="poa-question-text">
                                    <strong>If Yes please select type of Power of Attorney</strong><br/>
                                    <span>Tipo de Poder:</span>
                                </div>
                                <select className="expert-input" style={{ marginTop: '10px' }} value={formData.poaType} onChange={e => setFormData({...formData, poaType: e.target.value})}>
                                    <option value="GENERAL">GENERAL</option>
                                    <option value="SPECIAL">SPECIAL / ESPECIAL</option>
                                </select>
                            </div>

                            {/* Question 3: Fecha de vigencia */}
                            <div className="poa-question-box">
                                <div className="poa-question-text">
                                    <strong>Validity date / Fecha de vigencia:</strong>
                                </div>
                                <input className="expert-input" style={{ marginTop: '10px' }} value={formData.poaValidityDate} onChange={e => setFormData({...formData, poaValidityDate: e.target.value})} placeholder="e.g. Indefinida / 1 Year / 31-12-2027" />
                            </div>

                            {/* Question 4: Legalizado? */}
                            <div className="poa-question-box">
                                <div className="poa-question-text">
                                    <strong>Would you require the POA to be legalized?</strong><br/>
                                    <span>Requiere que el poder sea legalizado?</span>
                                </div>
                                <div className="poa-check-row">
                                    <label className="poa-check-label">
                                        <input type="radio" name="poaLegalized" checked={formData.poaLegalized === 'YES'} onChange={() => setFormData({...formData, poaLegalized: 'YES'})} className="poa-radio" />
                                        <span>YES</span>
                                    </label>
                                    <label className="poa-check-label">
                                        <input type="radio" name="poaLegalized" checked={formData.poaLegalized === 'NO'} onChange={() => setFormData({...formData, poaLegalized: 'NO'})} className="poa-radio" />
                                        <span>NO</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Paso 9: Actividades de la fundación (foundationObjects / fines)
    const renderStep9 = () => (
        <div className="expert-step animate-in fade-in slide-in-from-bottom-4">
            <h2 className="expert-step-title"><Globe size={22} color={PRIMARY} /> {lang === 'en' ? 'Step 9: Foundation Objects & Activities' : 'Paso 9: Actividades y Fines de la Fundación'}</h2>
            
            <div className="expert-hint-box">
                <Info size={20} color="#0369a1" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '13px', lineHeight: '1.5' }}>
                    {lang === 'en'
                        ? 'Describe in detail the objects and purposes of the Private Interest Foundation. (e.g. Asset Protection, Estate Planning).'
                        : 'Describa detalladamente el objeto y fines de la Fundación de Interés Privado. (Ej. Protección familiar, planificación patrimonial, administración de bienes).'
                    }
                </div>
            </div>

            <div className="expert-grid">
                <div className="expert-field full-width">
                    <label>{lang === 'en' ? 'Foundation Objects (Text Box)' : 'Fines de la Fundación (Detallar)'}</label>
                    <textarea className="expert-input" rows={6} value={formData.foundationObjects} onChange={e => setFormData({...formData, foundationObjects: e.target.value})} placeholder={lang === 'en' ? 'e.g. The objectives of the foundation are estate planning, family protection, holding shares...' : 'Ej: Los fines de la fundación consisten en velar por el patrimonio familiar, la planificación sucesoria, la tenencia de activos...'} required />
                </div>
            </div>
        </div>
    );

    // Paso 10: Declaraciones (Declaración Jurada y Firmantes)
    const renderStep10 = () => (
        <div className="expert-step animate-in fade-in slide-in-from-bottom-4">
            <div className="expert-section-header">
                <h2 className="expert-step-title"><FileCheck size={22} color={PRIMARY} /> {lang === 'en' ? 'Step 10: Declaration / Sworn Affidavit' : 'Paso 10: Declaración / Declaración Jurada'}</h2>
            </div>

            <div className="expert-legal-box">
                <p className="expert-legal-text">
                    {lang === 'en'
                        ? 'I/We hereby declare under penalty of perjury that all information and statements provided in this document are true, correct, and complete. All foundation assets derive from lawful activities.'
                        : 'Declaro(amos) bajo la gravedad del juramento que toda la información y manifestaciones consignadas en este formulario son verdaderas, correctas y completas. Todos los bienes de la fundación provienen de actividades lícitas.'
                    }
                </p>
                
                {(Array.isArray(formData.signers) ? formData.signers : [{ name: '', signature: '' }]).map((s, i) => (
                    <div key={i} className="signer-row animate-in fade-in" style={{ marginTop: '20px', padding: '25px', background: 'white', border: '2px solid #f1f5f9', borderRadius: '16px', position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 900, color: PRIMARY, letterSpacing: '0.5px' }}>{lang === 'en' ? `SIGNER #${i+1}` : `FIRMANTE #${i+1}`}</span>
                        </div>
                        <div className="expert-grid">
                            <div className="expert-field full-width">
                                <label style={{ color: '#64748b', fontWeight: 800, fontSize: '11px' }}>{lang === 'en' ? 'Name of Signer' : 'Nombre del Firmante'}</label>
                                <input className="expert-input-legal" list="names-global" value={s.name} onChange={e => updateSigner(i, 'name', e.target.value)} placeholder={lang === 'en' ? 'e.g. John Doe' : 'Ej: Pedro Roman Romano'} />
                            </div>
                            <div className="expert-field full-width">
                                <label style={{ color: '#64748b', fontWeight: 800, fontSize: '11px' }}>{lang === 'en' ? 'Signature (Full name)' : 'Firma (Nombre completo)'}</label>
                                <input className="expert-input-legal" value={s.signature} onChange={e => updateSigner(i, 'signature', e.target.value)} placeholder={lang === 'en' ? 'As it appears on ID...' : 'Como aparece en su identificación...'} style={{ fontFamily: 'monospace' }} />
                            </div>
                        </div>
                    </div>
                ))}
                
                <div className="expert-field" style={{ marginTop: '25px' }}>
                    <label style={{ color: '#475569', fontWeight: 800, fontSize: '11px' }}>{lang === 'en' ? 'Date of Declaration' : 'Fecha de Declaración'}</label>
                    <input type="date" className="expert-input-legal" value={formData.declarationDate} onChange={e => setFormData({...formData, declarationDate: e.target.value})} />
                </div>
            </div>
        </div>
    );

    return (
        <div className="expert-container">
            <div className="expert-header">
                <div>
                    <h1 className="expert-title">{lang === 'en' ? 'PRIVATE INTEREST FOUNDATION' : 'FUNDACIÓN DE INTERÉS PRIVADO'}</h1>
                    <p className="expert-subtitle">{lang === 'en' ? 'High-Precision Corporate DMS System' : 'Sistema de Alta Precisión en Fundaciones'}</p>
                </div>
                <button type="button" onClick={() => onSave(formData)} disabled={saving} className="expert-btn-save-master">
                    <Save size={18} /> {saving ? (lang === 'en' ? 'Synchronizing...' : 'Sincronizando...') : (lang === 'en' ? 'SAVE PROGRESS' : 'GUARDAR AVANCE')}
                </button>
            </div>

            {/* Cabecera de Paso Estándar */}
            <div className="standard-step-header">
                <span className="standard-step-title">
                    {step === 1 && `I. ${lang === 'en' ? 'Foundation Name' : 'Nombre de la Fundación'}`}
                    {step === 2 && `II. ${lang === 'en' ? 'Initial Endowment' : 'Capital Social'}`}
                    {step === 3 && `III. ${lang === 'en' ? 'Founders' : 'Fundadores'}`}
                    {step === 4 && `IV. ${lang === 'en' ? 'Protectors' : 'Protectores'}`}
                    {step === 5 && `V. ${lang === 'en' ? 'Directors (Foundation Council)' : 'Directores (Consejo)'}`}
                    {step === 6 && `VI. ${lang === 'en' ? 'Dignitaries' : 'Dignatarios'}`}
                    {step === 7 && `VII. ${lang === 'en' ? 'Beneficiaries' : 'Beneficiarios'}`}
                    {step === 8 && `VIII. ${lang === 'en' ? 'Power Of Attorney / Poderes' : 'Power Of Attorney / Poderes'}`}
                    {step === 9 && `IX. ${lang === 'en' ? 'Foundation Objects & Activities' : 'Actividades de la Fundación'}`}
                    {step === 10 && `X. ${lang === 'en' ? 'Declaration & Signatures' : 'Declaración y Firmas'}`}
                </span>
                <span className="standard-step-badge">
                    {lang === 'en' ? `Step ${step} of 10` : `Paso ${step} de 10`}
                </span>
            </div>

            {/* Stepper Progresivo Estándar de 10 Pasos */}
            <div className="standard-progress-stepper">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(s => (
                    <div key={s} className={`standard-progress-bar ${step >= s ? 'active' : ''}`} />
                ))}
            </div>

            <div className="expert-main-panel">
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
                {step === 4 && renderStep4()}
                {step === 5 && renderStep5()}
                {step === 6 && renderStep6()}
                {step === 7 && renderStep7()}
                {step === 8 && renderStep8()}
                {step === 9 && renderStep9()}
                {step === 10 && renderStep10()}

                <div className="expert-nav-footer">
                    <button type="button" onClick={() => setStep(prev => prev - 1)} disabled={step === 1} className="expert-btn-nav-prev"><ChevronLeft size={18} /> {lang === 'en' ? 'PREVIOUS' : 'ANTERIOR'}</button>
                    {step < 10 ? (
                        <button type="button" onClick={() => setStep(prev => prev + 1)} className="expert-btn-nav-next">{lang === 'en' ? 'NEXT STEP' : 'SIGUIENTE PASO'} <ChevronRight size={18} /></button>
                    ) : (
                        <button type="button" onClick={() => onSave(formData, true)} disabled={saving} className="expert-btn-nav-finish"><CheckCircle2 size={18} /> {saving ? (lang === 'en' ? 'FINALIZING...' : 'FINALIZANDO...') : (lang === 'en' ? 'REGISTER FOUNDATION' : 'REGISTRAR FUNDACIÓN')}</button>
                    )}
                </div>
            </div>

            {/* DATALISTS PARA AUTOCOMPLETADO */}
            <datalist id="poa-names">
                {getPersonNameSuggestions(buildRegistry(formData, { arrayName: 'poa' })).map((name) => (
                    <option key={`poa-${name}`} value={name} />
                ))}
            </datalist>

            <datalist id="names-global">
                {formData.founders.map((f, i) => f.fullName && <option key={`f-${i}`} value={f.fullName} />)}
                {formData.councilMembers.map((m, i) => {
                    const full = [m.firstName, m.secondName, m.lastName].filter(Boolean).join(' ');
                    return full && <option key={`c-${i}`} value={full} />;
                })}
                {formData.protectors.map((p, i) => p.fullName && <option key={`p-${i}`} value={p.fullName} />)}
                {formData.dignitaries.map((d, i) => d.fullName && <option key={`d-${i}`} value={d.fullName} />)}
                {formData.beneficiaries.map((b, i) => b.shareholder && <option key={`b-${i}`} value={b.shareholder} />)}
            </datalist>

            <datalist id="roles-dignitaries">
                <option value="PRESIDENTE" />
                <option value="SECRETARIO" />
                <option value="TESORERO" />
                <option value="VOCAL" />
                <option value="VICEPRESIDENTE" />
            </datalist>

            <style>{`
                .expert-container { width: 100%; maxWidth: 900px; margin: 0 auto; padding: 20px 0 80px; font-family: 'Inter', sans-serif; }
                .expert-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 40px; }
                .expert-title { font-size: 26px; font-weight: 900; color: ${SECONDARY}; margin: 0; letter-spacing: -1px; }
                .expert-subtitle { font-size: 13px; color: #64748b; margin: 5px 0 0; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
                
                .expert-btn-save-master { padding: 12px 24px; background: white; color: ${PRIMARY}; border: 2.5px solid ${PRIMARY}; border-radius: 12px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: all 0.2s; font-size: 13px; }
                .expert-btn-save-master:hover { background: ${PRIMARY}; color: white; transform: translateY(-2px); box-shadow: 0 10px 20px ${PRIMARY}30; }

                .standard-step-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 0 5px; }
                .standard-step-title { font-size: 14px; font-weight: 800; color: ${SECONDARY}; text-transform: uppercase; letter-spacing: 0.5px; }
                .standard-step-badge { font-size: 11px; font-weight: 900; color: ${PRIMARY}; background: ${PRIMARY}15; padding: 4px 12px; border-radius: 20px; letter-spacing: 1px; }

                .standard-progress-stepper { display: flex; gap: 8px; margin-bottom: 40px; }
                .standard-progress-bar { flex: 1; height: 6px; background: #e2e8f0; border-radius: 10px; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
                .standard-progress-bar.active { background: ${PRIMARY}; }

                .expert-main-panel { background: white; border-radius: 24px; padding: 45px; border: 1px solid #e2e8f0; box-shadow: 0 10px 40px rgba(0,0,0,0.03); }
                .expert-step-title { font-size: 17px; font-weight: 900; color: ${SECONDARY}; margin: 0 0 25px; display: flex; align-items: center; gap: 12px; }
                
                .expert-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                .full-width { grid-column: span 2; }
                .expert-field { display: flex; flex-direction: column; gap: 8px; }
                .expert-field label { font-size: 11px; font-weight: 800; color: #64748b; letter-spacing: 0.5px; }
                
                .expert-input { width: 100%; padding: 14px 18px; border: 2.5px solid #f1f5f9; border-radius: 14px; outline: none; font-size: 14px; font-weight: 600; color: ${SECONDARY}; transition: all 0.2s; background: #f8fafc; }
                .expert-input:focus { border-color: ${PRIMARY}; background: white; box-shadow: 0 0 0 4px ${PRIMARY}10; }

                .expert-hint { font-size: 12px; color: #64748b; font-style: italic; font-weight: 500; }
                .expert-hint-box { background: #f0f9ff; border: 1px solid #bae6fd; color: #0369a1; padding: 12px 18px; border-radius: 12px; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 12px; margin-bottom: 25px; }

                .expert-section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
                .expert-btn-add { padding: 10px 18px; background: ${PRIMARY}10; color: ${PRIMARY}; border: none; border-radius: 10px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 11px; transition: 0.2s; }
                .expert-btn-add:hover { background: ${PRIMARY}; color: white; transform: scale(1.03); }

                .expert-card-legal { background: #fcfdfe; border: 2px solid #f1f5f9; border-radius: 20px; padding: 30px; position: relative; margin-bottom: 25px; }
                .expert-card-label { position: absolute; top: -10px; left: 25px; background: ${SECONDARY}; color: white; font-size: 9px; font-weight: 900; padding: 5px 14px; border-radius: 20px; }
                .expert-btn-remove { position: absolute; top: 15px; right: 15px; color: #ef4444; background: #fee2e2; border: none; padding: 8px; border-radius: 10px; cursor: pointer; transition: 0.2s; }
                .expert-btn-remove:hover { transform: rotate(90deg); }

                .expert-legal-box { background: #f8fafc; border: 2.5px dashed #cbd5e1; border-radius: 20px; padding: 35px; color: ${SECONDARY}; margin-top: 30px; }
                .expert-legal-text { font-size: 13px; line-height: 1.6; color: #334155; margin-bottom: 25px; font-style: italic; border-left: 4px solid ${PRIMARY}; padding: 15px 20px; background: #eff6ff; border-radius: 8px; font-weight: 500; }
                .expert-input-legal { width: 100%; padding: 14px 18px; border: 2.5px solid #e2e8f0; border-radius: 12px; background: white; color: ${SECONDARY}; outline: none; font-size: 14px; font-weight: 600; transition: all 0.2s; }
                .expert-input-legal:focus { border-color: ${PRIMARY}; background: white; box-shadow: 0 0 0 4px ${PRIMARY}10; }

                .expert-nav-footer { display: flex; justify-content: space-between; margin-top: 50px; padding-top: 30px; border-top: 2px solid #f1f5f9; }
                .expert-btn-nav-prev { padding: 14px 28px; background: #f8fafc; color: #64748b; border: 2px solid #e2e8f0; border-radius: 14px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: 0.2s; font-size: 13px; }
                .expert-btn-nav-prev:hover:not(:disabled) { background: #f1f5f9; }
                .expert-btn-nav-next { padding: 14px 28px; background: ${PRIMARY}; color: white; border: none; border-radius: 14px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 10px; box-shadow: 0 10px 20px ${PRIMARY}30; transition: 0.3s; font-size: 13px; }
                .expert-btn-nav-next:hover { transform: translateY(-2px); box-shadow: 0 15px 30px ${PRIMARY}40; }
                .expert-btn-nav-finish { padding: 14px 28px; background: #16a34a; color: white; border: none; border-radius: 14px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 10px; box-shadow: 0 10px 20px rgba(22, 163, 74, 0.3); transition: 0.3s; font-size: 13px; }

                /* ORIGINAL FORMAT STYLING FOR POA */
                .poa-original-grid { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 20px; margin-top: 20px; }
                .poa-column-card { background: #ffffff; border: 2.5px solid #40a2be; border-radius: 16px; overflow: hidden; }
                .poa-column-header { background: #40a2be; color: white; padding: 15px 20px; font-weight: 900; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.4; }
                .poa-question-box { background: #f0f9ff; border: 1.5px solid #bae6fd; border-radius: 12px; padding: 18px; }
                .poa-question-text { font-size: 12px; color: #1e293b; line-height: 1.4; }
                .poa-check-row { display: flex; gap: 20px; margin-top: 12px; }
                .poa-check-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 800; color: #0e7490; }
                .poa-radio { width: 18px; height: 18px; accent-color: #0e7490; cursor: pointer; }
                .person-copy-box { margin-bottom: 16px; padding: 12px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; }
                .person-copy-box label { font-size: 10px; font-weight: 800; color: ${PRIMARY}; text-transform: uppercase; margin-bottom: 6px; display: block; }
                @media (max-width: 768px) {
                    .poa-original-grid { grid-template-columns: 1fr; }
                }
            `}</style>
        </div>
    );
};

export default FundacionForm;
