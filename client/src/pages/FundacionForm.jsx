/**
 * FundacionForm — Formulario de Constitución de Fundación de Interés Privado (Panamá).
 * 10 secciones: Nombre, Capital, Fundador, Protectores, Directores, Dignatarios,
 * Beneficiarios, Poderes, Actividades, Declaración.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import API_BASE_URL from '../config';

import { 

    Heart, Users, UserCheck, Shield, FileCheck, 

    Plus, Trash2, ChevronRight, ChevronLeft, Save, 

    CheckCircle2, Info, Award, KeyRound, Globe, FileText

} from 'lucide-react';

import { useLang } from '../i18n';
import { extractRegisteredPeople } from '../utils/personExtractor';
import PersonSelector from '../components/common/PersonSelector';
import FundacionPersonFields, { FUNDACION_MARITAL_OPTIONS } from '../components/FundacionPersonFields';

import { validateField } from '../utils/fieldValidators';

import {

    emptyFundacionPerson,

    emptyFundacionDignitary,

    emptyFundacionBeneficiary,

    normalizeLoadedFundacionData,

    poaPersonFromFormData,

    POA_FORM_FIELD_MAP,

} from '../utils/fundacionPersonSchema';



const FundacionForm = ({ initialData, onSave, saving }) => {

    const { lang, t } = useLang();

    const L = (key) => (t?.(`fundacion.person.${key}`) ?? key);

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

        poaFullName: '',

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

            if (cleanData.poaLegalized === undefined) cleanData.poaLegalized = formData.poaLegalized;

            if (cleanData.poaFullName === undefined) {
                cleanData.poaFullName = cleanData.poaFirstName
                    ? [cleanData.poaFirstName, cleanData.poaMiddleName, cleanData.poaLastName].filter(Boolean).join(' ')
                    : formData.poaFullName;
            }

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

            console.error(err);

        }

    }, [initialData]);

    const registeredPeople = extractRegisteredPeople(formData);

    const handleAutoFillPerson = (targetPath, index, person) => {
        setFormData((prev) => {
            const next = { ...prev };
            if (Array.isArray(next[targetPath])) {
                const list = [...next[targetPath]];
                const target = { ...list[index] };
                if (person.fullName || person.name) target.fullName = person.fullName || person.name;
                if (person.passport || person.idNumber) target.passport = person.passport || person.idNumber;
                if (person.nationality) target.nationality = person.nationality;
                if (person.birthDate) target.birthDate = person.birthDate;
                if (person.maritalStatus) target.maritalStatus = person.maritalStatus;
                if (person.phone) target.phone = person.phone;
                if (person.email) target.email = person.email;
                if (person.address) target.address = person.address;
                if (person.city) target.city = person.city;
                if (person.country) target.country = person.country;
                list[index] = target;
                next[targetPath] = list;
            }
            return next;
        });
    };



    /* ── Field validation ── */
    const [fieldErrors, setFieldErrors] = useState({});

    const handleFieldBlur = (fieldName) => {
        const error = validateField(fieldName, formData[fieldName]);
        setFieldErrors(prev => {
            const next = { ...prev };
            if (error) next[fieldName] = error;
            else delete next[fieldName];
            return next;
        });
    };

    const handleArrayFieldBlur = (arrayName, index, fieldName) => {
        const key = `${arrayName}.${index}.${fieldName}`;
        const value = formData[arrayName][index]?.[fieldName];
        const error = validateField(fieldName, value);
        setFieldErrors(prev => {
            const next = { ...prev };
            if (error) next[key] = error;
            else delete next[key];
            return next;
        });
    };

    const getErrorStyle = (key) => fieldErrors[key] ? { borderColor: '#ef4444', boxShadow: '0 0 0 1px #fecaca' } : {};
    const getArrayErrorStyle = (arrayName, index, fieldName) => getErrorStyle(`${arrayName}.${index}.${fieldName}`);

    const FieldError = ({ name }) => fieldErrors[name] ? <span style={{ fontSize: '9px', color: '#ef4444', fontWeight: 600 }}>{fieldErrors[name]}</span> : null;
    const ArrayFieldError = ({ array, index, field }) => <FieldError name={`${array}.${index}.${field}`} />;

    /* ── Autocomplete state ── */
    const [personSuggestions, setPersonSuggestions] = useState({});
    const [activePersonKey, setActivePersonKey] = useState(null);
    const [beneficiarySuggestions, setBeneficiarySuggestions] = useState({});
    const [activeBeneficiaryIdx, setActiveBeneficiaryIdx] = useState(null);
    const [poaSuggestions, setPoaSuggestions] = useState([]);
    const [showPoaDropdown, setShowPoaDropdown] = useState(false);
    const debounceTimers = useRef({});
    const autocompleteRefs = useRef({});

    useEffect(() => {
        const handleClickOutside = (e) => {
            const isInsideAny = Object.values(autocompleteRefs.current).some(
                ref => ref && ref.contains(e.target)
            );
            if (!isInsideAny) {
                setActivePersonKey(null);
                setActiveBeneficiaryIdx(null);
                setShowPoaDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const searchFundacionPerson = useCallback((query, arrayName, index) => {
        const timerKey = `${arrayName}-${index}`;
        if (debounceTimers.current[timerKey]) clearTimeout(debounceTimers.current[timerKey]);
        if (!query || query.trim().length < 2) {
            setPersonSuggestions(prev => ({ ...prev, [timerKey]: [] }));
            setActivePersonKey(null);
            return;
        }
        debounceTimers.current[timerKey] = setTimeout(async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(
                    `${API_BASE_URL}/api/forms/fundacion/search-person?q=${encodeURIComponent(query.trim())}`,
                    { headers: { 'x-auth-token': token } }
                );
                if (res.ok) {
                    const data = await res.json();
                    setPersonSuggestions(prev => ({ ...prev, [timerKey]: data }));
                    setActivePersonKey(data.length > 0 ? timerKey : null);
                }
            } catch (err) { /* silent */ }
        }, 300);
    }, []);

    const selectPersonSuggestion = (arrayName, index, person) => {
        const newArray = [...formData[arrayName]];
        const p = newArray[index];
        const fn = person.fullName || [person.firstName, person.secondName, person.lastName].filter(Boolean).join(' ');
        if (fn) p.fullName = fn;
        const fields = ['birthDate', 'maritalStatus', 'nationality', 'passport', 'idCard', 'phone', 'email', 'address', 'city', 'country'];
        fields.forEach(f => { if (person[f]) p[f] = person[f]; });
        setFormData(prev => ({ ...prev, [arrayName]: newArray }));
        const timerKey = `${arrayName}-${index}`;
        setPersonSuggestions(prev => ({ ...prev, [timerKey]: [] }));
        setActivePersonKey(null);
    };

    const searchDignitaryPerson = useCallback((query, index) => {
        const timerKey = `dignitaries-${index}`;
        if (debounceTimers.current[timerKey]) clearTimeout(debounceTimers.current[timerKey]);
        if (!query || query.trim().length < 2) {
            setPersonSuggestions(prev => ({ ...prev, [timerKey]: [] }));
            setActivePersonKey(null);
            return;
        }
        debounceTimers.current[timerKey] = setTimeout(async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(
                    `${API_BASE_URL}/api/forms/fundacion/search-person?q=${encodeURIComponent(query.trim())}`,
                    { headers: { 'x-auth-token': token } }
                );
                if (res.ok) {
                    const data = await res.json();
                    setPersonSuggestions(prev => ({ ...prev, [timerKey]: data }));
                    setActivePersonKey(data.length > 0 ? timerKey : null);
                }
            } catch (err) { /* silent */ }
        }, 300);
    }, []);

    const selectDignitarySuggestion = (index, person) => {
        const newDigs = [...formData.dignitaries];
        const d = newDigs[index];
        if (person.fullName) d.fullName = person.fullName;
        else if (person.firstName) d.fullName = [person.firstName, person.secondName, person.lastName].filter(Boolean).join(' ');
        if (person.passport) d.passport = person.passport;
        if (person.birthDate) d.birthDate = person.birthDate;
        if (person.registrationNumber) d.registrationNumber = person.registrationNumber;
        if (person.address) d.address = person.address;
        setFormData(prev => ({ ...prev, dignitaries: newDigs }));
        const timerKey = `dignitaries-${index}`;
        setPersonSuggestions(prev => ({ ...prev, [timerKey]: [] }));
        setActivePersonKey(null);
    };

    const searchBeneficiary = useCallback((query, index) => {
        const timerKey = `beneficiary-${index}`;
        if (debounceTimers.current[timerKey]) clearTimeout(debounceTimers.current[timerKey]);
        if (!query || query.trim().length < 2) {
            setBeneficiarySuggestions(prev => ({ ...prev, [index]: [] }));
            setActiveBeneficiaryIdx(null);
            return;
        }
        debounceTimers.current[timerKey] = setTimeout(async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(
                    `${API_BASE_URL}/api/forms/fundacion/search-beneficiary?q=${encodeURIComponent(query.trim())}`,
                    { headers: { 'x-auth-token': token } }
                );
                if (res.ok) {
                    const data = await res.json();
                    setBeneficiarySuggestions(prev => ({ ...prev, [index]: data }));
                    setActiveBeneficiaryIdx(data.length > 0 ? index : null);
                }
            } catch (err) { /* silent */ }
        }, 300);
    }, []);

    const selectBeneficiarySuggestion = (index, person) => {
        const newBen = [...formData.beneficiaries];
        const b = newBen[index];
        if (person.shareholder) b.shareholder = person.shareholder;
        if (person.birthDate) b.birthDate = person.birthDate;
        if (person.address) b.address = person.address;
        setFormData(prev => ({ ...prev, beneficiaries: newBen }));
        setBeneficiarySuggestions(prev => ({ ...prev, [index]: [] }));
        setActiveBeneficiaryIdx(null);
    };

    const searchPoaPerson = useCallback((query) => {
        const timerKey = 'poa';
        if (debounceTimers.current[timerKey]) clearTimeout(debounceTimers.current[timerKey]);
        if (!query || query.trim().length < 2) {
            setPoaSuggestions([]);
            setShowPoaDropdown(false);
            return;
        }
        debounceTimers.current[timerKey] = setTimeout(async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(
                    `${API_BASE_URL}/api/forms/fundacion/search-person?q=${encodeURIComponent(query.trim())}`,
                    { headers: { 'x-auth-token': token } }
                );
                if (res.ok) {
                    const data = await res.json();
                    setPoaSuggestions(data);
                    setShowPoaDropdown(data.length > 0);
                }
            } catch (err) { /* silent */ }
        }, 300);
    }, []);

    const selectPoaSuggestion = (person) => {
        const updates = {};
        const fn = person.fullName || [person.firstName, person.secondName, person.lastName].filter(Boolean).join(' ');
        if (fn) updates.poaFullName = fn;
        if (person.birthDate) updates.poaBirthDate = person.birthDate;
        if (person.maritalStatus) updates.poaMaritalStatus = person.maritalStatus;
        if (person.nationality) updates.poaNationality = person.nationality;
        if (person.passport) updates.poaPassport = person.passport;
        if (person.idCard) updates.poaIdCard = person.idCard;
        if (person.phone) updates.poaPhone = person.phone;
        if (person.email) updates.poaEmail = person.email;
        if (person.address) updates.poaAddress = person.address;
        if (person.city) updates.poaCity = person.city;
        if (person.country) updates.poaCountry = person.country;
        setFormData(prev => ({ ...prev, ...updates }));
        setPoaSuggestions([]);
        setShowPoaDropdown(false);
    };

    const updateArrayField = (arrayName, index, field, value) => {

        const newArray = [...formData[arrayName]];

        newArray[index][field] = value;

        setFormData(prev => ({ ...prev, [arrayName]: newArray }));

        const key = `${arrayName}.${index}.${field}`;
        if (fieldErrors[key]) {
            const error = validateField(field, value);
            if (!error) setFieldErrors(prev => { const next = { ...prev }; delete next[key]; return next; });
        }

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



    const PRIMARY = '#0f766e';

    const SECONDARY = '#1e293b';



    const renderStep1 = () => (

        <div className="expert-step animate-in fade-in slide-in-from-bottom-4">

            <h2 className="expert-step-title"><Heart size={22} color={PRIMARY} /> {lang === 'en' ? 'Step 1: Foundation Name' : 'Paso 1: Nombre de la Fundación'}</h2>

            

            <div className="expert-hint-box">

                <Info size={14} color="#475569" style={{ flexShrink: 0, marginTop: '2px' }} />

                <div style={{ fontSize: '12px', lineHeight: '1.5' }}>

                    <strong>

                        {lang === 'en'

                            ? 'Please submit 3 name options in order of preference. The system will verify availability.'

                            : 'Por favor ingrese 3 opciones de nombre en orden de preferencia para verificar disponibilidad legal.'

                        }

                    </strong>

                    <div style={{ marginTop: '4px', fontSize: '11px', color: '#64748b' }}>

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

                    <input className="expert-input" style={getErrorStyle('foundationNameOption1')} value={formData.foundationNameOption1} onChange={e => { setFormData({...formData, foundationNameOption1: e.target.value.toUpperCase()}); if (fieldErrors.foundationNameOption1) { const er = validateField('foundationNameOption1', e.target.value.toUpperCase()); if (!er) setFieldErrors(prev => { const n = { ...prev }; delete n.foundationNameOption1; return n; }); } }} onBlur={() => handleFieldBlur('foundationNameOption1')} placeholder="EJ: FUNDACIÓN ESPERANZA" required />

                    <FieldError name="foundationNameOption1" />

                </div>

                <div className="expert-field">

                    <label>{lang === 'en' ? 'Foundation Name - 2nd Choice' : 'Opción 2 de Nombre'}</label>

                    <input className="expert-input" style={getErrorStyle('foundationNameOption2')} value={formData.foundationNameOption2} onChange={e => { setFormData({...formData, foundationNameOption2: e.target.value.toUpperCase()}); if (fieldErrors.foundationNameOption2) { const er = validateField('foundationNameOption2', e.target.value.toUpperCase()); if (!er) setFieldErrors(prev => { const n = { ...prev }; delete n.foundationNameOption2; return n; }); } }} onBlur={() => handleFieldBlur('foundationNameOption2')} placeholder="EJ: FUNDACIÓN PROGRESO" />

                    <FieldError name="foundationNameOption2" />

                </div>

                <div className="expert-field">

                    <label>{lang === 'en' ? 'Foundation Name - 3rd Choice' : 'Opción 3 de Nombre'}</label>

                    <input className="expert-input" style={getErrorStyle('foundationNameOption3')} value={formData.foundationNameOption3} onChange={e => { setFormData({...formData, foundationNameOption3: e.target.value.toUpperCase()}); if (fieldErrors.foundationNameOption3) { const er = validateField('foundationNameOption3', e.target.value.toUpperCase()); if (!er) setFieldErrors(prev => { const n = { ...prev }; delete n.foundationNameOption3; return n; }); } }} onBlur={() => handleFieldBlur('foundationNameOption3')} placeholder="EJ: FUNDACIÓN FUTURO" />

                    <FieldError name="foundationNameOption3" />

                </div>

            </div>

        </div>

    );



    const renderStep2 = () => (

        <div className="expert-step animate-in fade-in slide-in-from-bottom-4">

            <h2 className="expert-step-title"><Award size={22} color={PRIMARY} /> {lang === 'en' ? 'Step 2: Initial Endowment' : 'Paso 2: Capital Social / Patrimonio Inicial'}</h2>

            

            <div className="expert-hint-box">

                <Info size={14} color="#475569" style={{ flexShrink: 0, marginTop: '2px' }} />

                <div style={{ fontSize: '12px', lineHeight: '1.5' }}>

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

                        <input type="number" className="expert-input" style={{ paddingLeft: '32px', ...getErrorStyle('initialPatrimony') }} value={formData.initialPatrimony} onChange={e => { setFormData({...formData, initialPatrimony: e.target.value}); if (fieldErrors.initialPatrimony) { const er = validateField('initialPatrimony', e.target.value); if (!er) setFieldErrors(prev => { const n = { ...prev }; delete n.initialPatrimony; return n; }); } }} onBlur={() => handleFieldBlur('initialPatrimony')} placeholder="10000" />

                        <FieldError name="initialPatrimony" />

                    </div>

                </div>

            </div>

        </div>

    );



    const renderPersonCard = (arrayName, index, cardLabel, excludeStep, canRemove, minItems) => {
        const timerKey = `${arrayName}-${index}`;
        return (
            <div key={index} className="expert-card-legal">
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
                    onChange={(field, value) => updateArrayField(arrayName, index, field, value)}
                    suggestions={personSuggestions[timerKey] || []}
                    showDropdown={activePersonKey === timerKey}
                    onSearch={(query) => searchFundacionPerson(query, arrayName, index)}
                    onSelect={(person) => selectPersonSuggestion(arrayName, index, person)}
                    dropdownRef={el => autocompleteRefs.current[timerKey] = el}
                />
            </div>
        );
    };



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

            {false && formData.councilMembers.map((m, i) => (

                <div key={i} className="expert-card-legal">

                    <div className="expert-card-label">{lang === 'en' ? `DIRECTOR #${i+1}` : `DIRECTOR #${i+1}`}</div>

                    {formData.councilMembers.length > 3 && <button type="button" onClick={() => removeArrayItem('councilMembers', i, 3)} className="expert-btn-remove"><Trash2 size={16} /></button>}

                    <div className="expert-grid">

                        <div className="expert-field"><label>{lang === 'en' ? 'First Name' : 'Primer nombre'}</label><input className="expert-input" value={m.firstName} onChange={e => updateArrayField('councilMembers', i, 'firstName', e.target.value)} /></div>

                        <div className="expert-field"><label>{lang === 'en' ? 'Middle Name' : 'Segundo nombre'}</label><input className="expert-input" value={m.secondName} onChange={e => updateArrayField('councilMembers', i, 'secondName', e.target.value)} /></div>

                        <div className="expert-field"><label>{lang === 'en' ? 'Surname(s)' : 'Apellidos'}</label><input className="expert-input" value={m.lastName} onChange={e => updateArrayField('councilMembers', i, 'lastName', e.target.value)} /></div>

                        <div className="expert-field">

                            <label>{lang === 'en' ? 'Marital Status' : 'Estado civil'}</label>

                            <select className="expert-input" value={m.maritalStatus} onChange={e => updateArrayField('councilMembers', i, 'maritalStatus', e.target.value)}>

                                <option value="">{lang === 'en' ? 'Select...' : 'Seleccione...'}</option>

                                <option value="Soltero">{lang === 'en' ? 'Single' : 'Soltero(a)'}</option>

                                <option value="Casado">{lang === 'en' ? 'Married' : 'Casado(a)'}</option>

                                <option value="Divorciado">{lang === 'en' ? 'Divorced' : 'Divorciado(a)'}</option>

                                <option value="Viudo">{lang === 'en' ? 'Widowed' : 'Viudo(a)'}</option>

                            </select>

                        </div>

                        <div className="expert-field"><label>{lang === 'en' ? 'Nationality' : 'Nacionalidad'}</label><input className="expert-input" value={m.nationality} onChange={e => updateArrayField('councilMembers', i, 'nationality', e.target.value)} /></div>

                        <div className="expert-field"><label>{lang === 'en' ? 'Passport / ID' : 'Pasaporte / Cédula'}</label><input className="expert-input" value={m.passport} onChange={e => updateArrayField('councilMembers', i, 'passport', e.target.value)} /></div>

                        <div className="expert-field"><label>{lang === 'en' ? 'Date of birth' : 'Fecha de nacimiento'}</label><input type="date" className="expert-input" value={m.birthDate} onChange={e => updateArrayField('councilMembers', i, 'birthDate', e.target.value)} /></div>

                        <div className="expert-field full-width"><label>{lang === 'en' ? 'Residential Address' : 'Dirección completa'}</label><input className="expert-input" value={m.address} onChange={e => updateArrayField('councilMembers', i, 'address', e.target.value)} /></div>

                    </div>

                </div>

            ))}

        </div>

    );



    const renderStep6 = () => (

        <div className="expert-step animate-in fade-in slide-in-from-bottom-4">

            <div className="expert-section-header">

                <h2 className="expert-step-title"><UserCheck size={22} color={PRIMARY} /> {lang === 'en' ? 'Step 6: Dignitaries' : 'Paso 6: Dignatarios'}</h2>

                <button type="button" onClick={() => addArrayItem('dignitaries', emptyFundacionDignitary())} className="expert-btn-add">

                    <Plus size={16} /> {lang === 'en' ? 'ADD DIGNITARY' : 'AÑADIR DIGNATARIO'}

                </button>

            </div>

            {formData.dignitaries.map((d, i) => {
                const digKey = `dignitaries-${i}`;
                return (
                <div key={i} className="expert-card-legal" ref={el => autocompleteRefs.current[digKey] = el}>

                    <div className="expert-card-label">{lang === 'en' ? `DIGNITARY #${i+1}` : `DIGNATARIO #${i+1}`}</div>

                    {formData.dignitaries.length > 3 && <button type="button" onClick={() => removeArrayItem('dignitaries', i, 3)} className="expert-btn-remove"><Trash2 size={16} /></button>}

                    <div className="expert-grid">

                        <div className="expert-field">

                            <label>{t('fundacion.dignitary.role')}</label>

                            <input className="expert-input" style={getArrayErrorStyle('dignitaries', i, 'role')} list="roles-dignitaries" value={d.role || ''} onChange={e => updateArrayField('dignitaries', i, 'role', e.target.value.toUpperCase())} onBlur={() => handleArrayFieldBlur('dignitaries', i, 'role')} placeholder="EJ: PRESIDENTE" />

                            <ArrayFieldError array="dignitaries" index={i} field="role" />

                        </div>

                        <div className="expert-field full-width" style={{ position: 'relative' }}>

                            <label>{t('fundacion.dignitary.fullName')}</label>

                            <input
                                className="expert-input"
                                style={getArrayErrorStyle('dignitaries', i, 'fullName')}
                                value={d.fullName || ''}
                                autoComplete="off"
                                onChange={(e) => { updateArrayField('dignitaries', i, 'fullName', e.target.value); searchDignitaryPerson(e.target.value, i); }}
                                onBlur={() => handleArrayFieldBlur('dignitaries', i, 'fullName')}
                                onFocus={() => { if (personSuggestions[digKey]?.length) setActivePersonKey(digKey); }}
                                placeholder={t('fundacion.dignitary.fullNamePlaceholder')}
                            />
                            <ArrayFieldError array="dignitaries" index={i} field="fullName" />
                            {activePersonKey === digKey && personSuggestions[digKey]?.length > 0 && (
                                <div className="fund-autocomplete-dropdown">
                                    {personSuggestions[digKey].map((p, j) => (
                                        <div key={j} className="fund-autocomplete-item" onMouseDown={(e) => { e.preventDefault(); selectDignitarySuggestion(i, p); }}>
                                            <span className="fund-ac-name">{p.fullName || ''}</span>
                                            <span className="fund-ac-detail">{p.passport || ''}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                        </div>

                        <div className="expert-field">

                            <label>{t('fundacion.dignitary.birthDate')}</label>

                            <input type="date" className="expert-input" style={getArrayErrorStyle('dignitaries', i, 'birthDate')} value={d.birthDate || ''} onChange={e => updateArrayField('dignitaries', i, 'birthDate', e.target.value)} onBlur={() => handleArrayFieldBlur('dignitaries', i, 'birthDate')} />

                            <ArrayFieldError array="dignitaries" index={i} field="birthDate" />

                        </div>

                        <div className="expert-field full-width">

                            <label>{t('fundacion.dignitary.address')}</label>

                            <input className="expert-input" style={getArrayErrorStyle('dignitaries', i, 'address')} value={d.address || ''} onChange={e => updateArrayField('dignitaries', i, 'address', e.target.value)} onBlur={() => handleArrayFieldBlur('dignitaries', i, 'address')} placeholder={t('fundacion.dignitary.addressPlaceholder')} />

                            <ArrayFieldError array="dignitaries" index={i} field="address" />

                        </div>

                    </div>

                </div>
                );
            })}

        </div>

    );



    const renderStep7 = () => (

        <div className="expert-step animate-in fade-in slide-in-from-bottom-4">

            <div className="expert-section-header">

                <h2 className="expert-step-title"><Award size={22} color={PRIMARY} /> {lang === 'en' ? 'Step 7: Beneficiaries' : 'Paso 7: Beneficiarios'}</h2>

                <button type="button" onClick={() => addArrayItem('beneficiaries', emptyFundacionBeneficiary())} className="expert-btn-add">

                    <Plus size={16} /> {lang === 'en' ? 'ADD BENEFICIARY' : 'AÑADIR BENEFICIARIO'}

                </button>

            </div>

            {formData.beneficiaries.map((b, i) => (

                <div key={i} className="expert-card-legal" ref={el => autocompleteRefs.current[`ben-${i}`] = el}>

                    <div className="expert-card-label">{lang === 'en' ? `BENEFICIARY #${i+1}` : `BENEFICIARIO #${i+1}`}</div>

                    {formData.beneficiaries.length > 1 && <button type="button" onClick={() => removeArrayItem('beneficiaries', i)} className="expert-btn-remove"><Trash2 size={16} /></button>}

                    <div className="expert-grid">

                        <div className="expert-field">

                            <label>{t('fundacion.beneficiary.percentage')}</label>

                            <input className="expert-input" style={getArrayErrorStyle('beneficiaries', i, 'percentage')} placeholder={t('fundacion.beneficiary.percentagePlaceholder')} value={b.percentage || ''} onChange={e => updateArrayField('beneficiaries', i, 'percentage', e.target.value)} onBlur={() => handleArrayFieldBlur('beneficiaries', i, 'percentage')} />

                            <ArrayFieldError array="beneficiaries" index={i} field="percentage" />

                        </div>

                        <div className="expert-field full-width" style={{ position: 'relative' }}>

                            <label>{t('fundacion.beneficiary.shareholder')}</label>

                            <input
                                className="expert-input"
                                style={getArrayErrorStyle('beneficiaries', i, 'shareholder')}
                                value={b.shareholder || ''}
                                autoComplete="off"
                                onChange={(e) => { updateArrayField('beneficiaries', i, 'shareholder', e.target.value); searchBeneficiary(e.target.value, i); }}
                                onBlur={() => handleArrayFieldBlur('beneficiaries', i, 'shareholder')}
                                onFocus={() => { if (beneficiarySuggestions[i]?.length) setActiveBeneficiaryIdx(i); }}
                                placeholder={t('fundacion.beneficiary.shareholderPlaceholder')}
                            />
                            <ArrayFieldError array="beneficiaries" index={i} field="shareholder" />
                            {activeBeneficiaryIdx === i && beneficiarySuggestions[i]?.length > 0 && (
                                <div className="fund-autocomplete-dropdown">
                                    {beneficiarySuggestions[i].map((p, j) => (
                                        <div key={j} className="fund-autocomplete-item" onMouseDown={(e) => { e.preventDefault(); selectBeneficiarySuggestion(i, p); }}>
                                            <span className="fund-ac-name">{p.shareholder || ''}</span>
                                            {p.address && <span className="fund-ac-detail">{p.address}</span>}
                                        </div>
                                    ))}
                                </div>
                            )}

                        </div>

                        <div className="expert-field">

                            <label>{t('fundacion.beneficiary.birthDate')}</label>

                            <input type="date" className="expert-input" style={getArrayErrorStyle('beneficiaries', i, 'birthDate')} value={b.birthDate || ''} onChange={e => updateArrayField('beneficiaries', i, 'birthDate', e.target.value)} onBlur={() => handleArrayFieldBlur('beneficiaries', i, 'birthDate')} />

                            <ArrayFieldError array="beneficiaries" index={i} field="birthDate" />

                        </div>

                        <div className="expert-field full-width">

                            <label>{t('fundacion.beneficiary.address')}</label>

                            <input className="expert-input" style={getArrayErrorStyle('beneficiaries', i, 'address')} value={b.address || ''} onChange={e => updateArrayField('beneficiaries', i, 'address', e.target.value)} onBlur={() => handleArrayFieldBlur('beneficiaries', i, 'address')} placeholder={t('fundacion.beneficiary.addressPlaceholder')} />

                            <ArrayFieldError array="beneficiaries" index={i} field="address" />

                        </div>

                    </div>

                </div>

            ))}

        </div>

    );



    const updatePoaField = (field, value) => {

        const key = POA_FORM_FIELD_MAP[field];

        if (!key) return;

        setFormData((prev) => ({ ...prev, [key]: value }));

    };



    const renderStep8 = () => (

            <div className="expert-step animate-in fade-in slide-in-from-bottom-4">

                <h2 className="expert-step-title"><KeyRound size={22} color={PRIMARY} /> {t('fundacion.poa.stepTitle')}</h2>



                <div className="poa-original-grid">

                    <div className="poa-column-card">

                        <div className="poa-column-header">{t('fundacion.poa.granteeHeader')}</div>

                        <div className="expert-grid" style={{ padding: '12px' }} ref={el => autocompleteRefs.current['poa'] = el}>

                            <div className="expert-field full-width" style={{ position: 'relative' }}>

                                <label>{L('fullName')}</label>

                                <input className="expert-input" style={getErrorStyle('poaFullName')} value={formData.poaFullName} autoComplete="off" onChange={e => { setFormData({...formData, poaFullName: e.target.value}); searchPoaPerson(e.target.value); if (fieldErrors.poaFullName) { const er = validateField('poaFullName', e.target.value); if (!er) setFieldErrors(prev => { const n = { ...prev }; delete n.poaFullName; return n; }); } }} onBlur={() => handleFieldBlur('poaFullName')} onFocus={() => { if (poaSuggestions.length) setShowPoaDropdown(true); }} placeholder={lang === 'en' ? 'Full name as on Passport/ID' : 'Nombre completo como aparece en pasaporte/cédula'} />
                                <FieldError name="poaFullName" />
                                {showPoaDropdown && poaSuggestions.length > 0 && (
                                    <div className="fund-autocomplete-dropdown">
                                        {poaSuggestions.map((p, j) => (
                                            <div key={j} className="fund-autocomplete-item" onMouseDown={(e) => { e.preventDefault(); selectPoaSuggestion(p); }}>
                                                <span className="fund-ac-name">{p.fullName || ''}</span>
                                                <span className="fund-ac-detail">{p.passport || ''}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                            </div>

                            

                            <div className="expert-field">

                                <label>{L('birthDate')}</label>

                                <input type="date" className="expert-input" style={getErrorStyle('poaBirthDate')} value={formData.poaBirthDate} onChange={e => { setFormData({...formData, poaBirthDate: e.target.value}); if (fieldErrors.poaBirthDate) { const er = validateField('poaBirthDate', e.target.value); if (!er) setFieldErrors(prev => { const n = { ...prev }; delete n.poaBirthDate; return n; }); } }} onBlur={() => handleFieldBlur('poaBirthDate')} />

                                <FieldError name="poaBirthDate" />

                            </div>

                            <div className="expert-field">

                                <label>{L('maritalStatus')}</label>

                                <select className="expert-input" value={formData.poaMaritalStatus} onChange={e => setFormData({...formData, poaMaritalStatus: e.target.value})}>

                                    <option value="">{t('fundacion.poa.selectPlaceholder')}</option>

                                    {FUNDACION_MARITAL_OPTIONS.map((o) => (

                                        <option key={o.value} value={o.value}>{lang === 'en' ? o.en : o.es}</option>

                                    ))}

                                </select>

                            </div>



                            <div className="expert-field">

                                <label>{L('nationality')}</label>

                                <input className="expert-input" style={getErrorStyle('poaNationality')} value={formData.poaNationality} onChange={e => { setFormData({...formData, poaNationality: e.target.value}); if (fieldErrors.poaNationality) { const er = validateField('poaNationality', e.target.value); if (!er) setFieldErrors(prev => { const n = { ...prev }; delete n.poaNationality; return n; }); } }} onBlur={() => handleFieldBlur('poaNationality')} />

                                <FieldError name="poaNationality" />

                            </div>

                            <div className="expert-field" style={{ position: 'relative' }}>

                                <label>{L('passport')}</label>

                                <input className="expert-input" style={getErrorStyle('poaPassport')} value={formData.poaPassport} autoComplete="off" onChange={e => { setFormData({...formData, poaPassport: e.target.value}); searchPoaPerson(e.target.value); if (fieldErrors.poaPassport) { const er = validateField('poaPassport', e.target.value); if (!er) setFieldErrors(prev => { const n = { ...prev }; delete n.poaPassport; return n; }); } }} onBlur={() => handleFieldBlur('poaPassport')} onFocus={() => { if (poaSuggestions.length) setShowPoaDropdown(true); }} />

                                <FieldError name="poaPassport" />

                            </div>

                            

                            <div className="expert-field">

                                <label>{L('idCard')}</label>

                                <input className="expert-input" style={getErrorStyle('poaIdCard')} value={formData.poaIdCard} onChange={e => { setFormData({...formData, poaIdCard: e.target.value}); if (fieldErrors.poaIdCard) { const er = validateField('poaIdCard', e.target.value); if (!er) setFieldErrors(prev => { const n = { ...prev }; delete n.poaIdCard; return n; }); } }} onBlur={() => handleFieldBlur('poaIdCard')} />

                                <FieldError name="poaIdCard" />

                            </div>

                            <div className="expert-field">

                                <label>{L('phone')}</label>

                                <input className="expert-input" style={getErrorStyle('poaPhone')} value={formData.poaPhone} onChange={e => { setFormData({...formData, poaPhone: e.target.value}); if (fieldErrors.poaPhone) { const er = validateField('poaPhone', e.target.value); if (!er) setFieldErrors(prev => { const n = { ...prev }; delete n.poaPhone; return n; }); } }} onBlur={() => handleFieldBlur('poaPhone')} />

                                <FieldError name="poaPhone" />

                            </div>



                            <div className="expert-field full-width">

                                <label>{L('email')}</label>

                                <input type="email" className="expert-input" style={getErrorStyle('poaEmail')} value={formData.poaEmail} onChange={e => { setFormData({...formData, poaEmail: e.target.value}); if (fieldErrors.poaEmail) { const er = validateField('poaEmail', e.target.value); if (!er) setFieldErrors(prev => { const n = { ...prev }; delete n.poaEmail; return n; }); } }} onBlur={() => handleFieldBlur('poaEmail')} />

                                <FieldError name="poaEmail" />

                            </div>



                            <div className="expert-field full-width">

                                <label>{L('address')}</label>

                                <input className="expert-input" style={getErrorStyle('poaAddress')} value={formData.poaAddress} onChange={e => { setFormData({...formData, poaAddress: e.target.value}); if (fieldErrors.poaAddress) { const er = validateField('poaAddress', e.target.value); if (!er) setFieldErrors(prev => { const n = { ...prev }; delete n.poaAddress; return n; }); } }} onBlur={() => handleFieldBlur('poaAddress')} />

                                <FieldError name="poaAddress" />

                            </div>



                            <div className="expert-field">

                                <label>{L('city')}</label>

                                <input className="expert-input" style={getErrorStyle('poaCity')} value={formData.poaCity} onChange={e => { setFormData({...formData, poaCity: e.target.value}); if (fieldErrors.poaCity) { const er = validateField('poaCity', e.target.value); if (!er) setFieldErrors(prev => { const n = { ...prev }; delete n.poaCity; return n; }); } }} onBlur={() => handleFieldBlur('poaCity')} />

                                <FieldError name="poaCity" />

                            </div>

                            <div className="expert-field">

                                <label>{L('country')}</label>

                                <input className="expert-input" style={getErrorStyle('poaCountry')} value={formData.poaCountry} onChange={e => { setFormData({...formData, poaCountry: e.target.value}); if (fieldErrors.poaCountry) { const er = validateField('poaCountry', e.target.value); if (!er) setFieldErrors(prev => { const n = { ...prev }; delete n.poaCountry; return n; }); } }} onBlur={() => handleFieldBlur('poaCountry')} />

                                <FieldError name="poaCountry" />

                            </div>

                        </div>

                    </div>



                    

                    <div className="poa-column-card">

                        <div className="poa-column-header">

                            {t('fundacion.poa.settingsHeader')}

                        </div>

                        <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

                            <div className="poa-question-box">

                                <div className="poa-question-text">

                                    <strong>{t('fundacion.poa.issueQuestion')}</strong>

                                </div>

                                <div className="poa-check-row">

                                    <label className="poa-check-label">

                                        <input type="radio" name="poaIssue" checked={formData.poaIssue === 'YES'} onChange={() => setFormData({...formData, poaIssue: 'YES'})} className="poa-radio" />

                                        <span>{t('fundacion.poa.yes')}</span>

                                    </label>

                                    <label className="poa-check-label">

                                        <input type="radio" name="poaIssue" checked={formData.poaIssue === 'NO'} onChange={() => setFormData({...formData, poaIssue: 'NO'})} className="poa-radio" />

                                        <span>{t('fundacion.poa.no')}</span>

                                    </label>

                                </div>

                            </div>



                            <div className="poa-question-box">

                                <div className="poa-question-text">

                                    <strong>{t('fundacion.poa.typeQuestion')}</strong>

                                </div>

                                <select className="expert-input" style={{ marginTop: '10px' }} value={formData.poaType} onChange={e => setFormData({...formData, poaType: e.target.value})}>

                                    <option value="GENERAL">{t('fundacion.poa.typeGeneral')}</option>

                                    <option value="SPECIAL">{t('fundacion.poa.typeSpecial')}</option>

                                </select>

                            </div>



                            <div className="poa-question-box">

                                <div className="poa-question-text">

                                    <strong>{t('fundacion.poa.validityQuestion')}</strong>

                                </div>

                                <input className="expert-input" style={{ marginTop: '10px', ...getErrorStyle('poaValidityDate') }} value={formData.poaValidityDate} onChange={e => { setFormData({...formData, poaValidityDate: e.target.value}); if (fieldErrors.poaValidityDate) { const er = validateField('poaValidityDate', e.target.value); if (!er) setFieldErrors(prev => { const n = { ...prev }; delete n.poaValidityDate; return n; }); } }} onBlur={() => handleFieldBlur('poaValidityDate')} placeholder={t('fundacion.poa.validityPlaceholder')} />

                                <FieldError name="poaValidityDate" />

                            </div>



                            <div className="poa-question-box">

                                <div className="poa-question-text">

                                    <strong>{t('fundacion.poa.legalizedQuestion')}</strong>

                                </div>

                                <div className="poa-check-row">

                                    <label className="poa-check-label">

                                        <input type="radio" name="poaLegalized" checked={formData.poaLegalized === 'YES'} onChange={() => setFormData({...formData, poaLegalized: 'YES'})} className="poa-radio" />

                                        <span>{t('fundacion.poa.yes')}</span>

                                    </label>

                                    <label className="poa-check-label">

                                        <input type="radio" name="poaLegalized" checked={formData.poaLegalized === 'NO'} onChange={() => setFormData({...formData, poaLegalized: 'NO'})} className="poa-radio" />

                                        <span>{t('fundacion.poa.no')}</span>

                                    </label>

                                </div>

                            </div>

                        </div>

                    </div>

                </div>

            </div>

    );



    const renderStep9 = () => (

        <div className="expert-step animate-in fade-in slide-in-from-bottom-4">

            <h2 className="expert-step-title"><Globe size={22} color={PRIMARY} /> {lang === 'en' ? 'Step 9: Foundation Objects & Activities' : 'Paso 9: Actividades y Fines de la Fundación'}</h2>

            

            <div className="expert-hint-box">

                <Info size={14} color="#475569" style={{ flexShrink: 0, marginTop: '2px' }} />

                <div style={{ fontSize: '12px', lineHeight: '1.5' }}>

                    {lang === 'en'

                        ? 'Describe in detail the objects and purposes of the Private Interest Foundation. (e.g. Asset Protection, Estate Planning).'

                        : 'Describa detalladamente el objeto y fines de la Fundación de Interés Privado. (Ej. Protección familiar, planificación patrimonial, administración de bienes).'

                    }

                </div>

            </div>



            <div className="expert-grid">

                <div className="expert-field full-width">

                    <label>{lang === 'en' ? 'Foundation Objects (Text Box)' : 'Fines de la Fundación (Detallar)'}</label>

                    <textarea className="expert-input" style={getErrorStyle('foundationObjects')} rows={6} value={formData.foundationObjects} onChange={e => { setFormData({...formData, foundationObjects: e.target.value}); if (fieldErrors.foundationObjects) { const er = validateField('foundationObjects', e.target.value); if (!er) setFieldErrors(prev => { const n = { ...prev }; delete n.foundationObjects; return n; }); } }} onBlur={() => handleFieldBlur('foundationObjects')} placeholder={lang === 'en' ? 'e.g. The objectives of the foundation are estate planning, family protection, holding shares...' : 'Ej: Los fines de la fundación consisten en velar por el patrimonio familiar, la planificación sucesoria, la tenencia de activos...'} required />

                    <FieldError name="foundationObjects" />

                </div>

            </div>

        </div>

    );



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

                    <div key={i} className="signer-row animate-in fade-in" style={{ marginTop: '10px', padding: '14px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', position: 'relative' }}>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>

                            <span style={{ fontSize: '10px', fontWeight: 800, color: PRIMARY, letterSpacing: '0.3px' }}>{lang === 'en' ? `SIGNER #${i+1}` : `FIRMANTE #${i+1}`}</span>

                        </div>

                        <div className="expert-grid">

                            <div className="expert-field full-width">

                                <label style={{ color: '#64748b', fontWeight: 700, fontSize: '10.5px' }}>{lang === 'en' ? 'Name of Signer' : 'Nombre del Firmante'}</label>

                                <input className="expert-input-legal" style={getErrorStyle('declarationName')} value={s.name} onChange={e => { updateSigner(i, 'name', e.target.value); if (fieldErrors.declarationName) { const er = validateField('declarationName', e.target.value); if (!er) setFieldErrors(prev => { const n = { ...prev }; delete n.declarationName; return n; }); } }} onBlur={() => handleFieldBlur('declarationName')} placeholder={lang === 'en' ? 'e.g. John Doe' : 'Ej: Pedro Roman Romano'} />

                                <FieldError name="declarationName" />

                            </div>

                            <div className="expert-field full-width">

                                <label style={{ color: '#64748b', fontWeight: 700, fontSize: '10.5px' }}>{lang === 'en' ? 'Signature (Full name)' : 'Firma (Nombre completo)'}</label>

                                <input className="expert-input-legal" style={{ fontFamily: 'monospace', ...getErrorStyle('declarationSignature') }} value={s.signature} onChange={e => { updateSigner(i, 'signature', e.target.value); if (fieldErrors.declarationSignature) { const er = validateField('declarationSignature', e.target.value); if (!er) setFieldErrors(prev => { const n = { ...prev }; delete n.declarationSignature; return n; }); } }} onBlur={() => handleFieldBlur('declarationSignature')} placeholder={lang === 'en' ? 'As it appears on ID...' : 'Como aparece en su identificación...'} />

                                <FieldError name="declarationSignature" />

                            </div>

                        </div>

                    </div>

                ))}

                

                <div className="expert-field" style={{ marginTop: '12px' }}>

                    <label style={{ color: '#475569', fontWeight: 700, fontSize: '10.5px' }}>{lang === 'en' ? 'Date of Declaration' : 'Fecha de Declaración'}</label>

                    <input type="date" className="expert-input-legal" style={getErrorStyle('declarationDate')} value={formData.declarationDate} onChange={e => { setFormData({...formData, declarationDate: e.target.value}); if (fieldErrors.declarationDate) { const er = validateField('declarationDate', e.target.value); if (!er) setFieldErrors(prev => { const n = { ...prev }; delete n.declarationDate; return n; }); } }} onBlur={() => handleFieldBlur('declarationDate')} />

                    <FieldError name="declarationDate" />

                </div>

            </div>

        </div>

    );



    return (

        <div className="expert-container">

            <div className="expert-header">

                <div>

                    <h1 className="expert-title">{t('fundacion.title')}</h1>

                    <p className="expert-subtitle">{t('fundacion.subtitle')}</p>

                </div>

                <button type="button" onClick={() => onSave(formData)} disabled={saving} className="expert-btn-save-master">

                    <Save size={18} /> {saving ? t('fundacion.syncing') : t('fundacion.saveProgress')}

                </button>

            </div>



            <div className="standard-step-header">

                <span className="standard-step-title">

                    {step === 1 && `I. ${lang === 'en' ? 'Foundation Name' : 'Nombre de la Fundación'}`}

                    {step === 2 && `II. ${lang === 'en' ? 'Initial Endowment' : 'Capital Social'}`}

                    {step === 3 && `III. ${lang === 'en' ? 'Founders' : 'Fundadores'}`}

                    {step === 4 && `IV. ${lang === 'en' ? 'Protectors' : 'Protectores'}`}

                    {step === 5 && `V. ${lang === 'en' ? 'Directors (Foundation Council)' : 'Directores (Consejo)'}`}

                    {step === 6 && `VI. ${lang === 'en' ? 'Dignitaries' : 'Dignatarios'}`}

                    {step === 7 && `VII. ${lang === 'en' ? 'Beneficiaries' : 'Beneficiarios'}`}

                    {step === 8 && `VIII. ${t('fundacion.poa.navLabel')}`}

                    {step === 9 && `IX. ${lang === 'en' ? 'Foundation Objects & Activities' : 'Actividades de la Fundación'}`}

                    {step === 10 && `X. ${lang === 'en' ? 'Declaration & Signatures' : 'Declaración y Firmas'}`}

                </span>

                <span className="standard-step-badge">

                    {lang === 'en' ? `Step ${step} of 10` : `Paso ${step} de 10`}

                </span>

            </div>



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

                    <button type="button" onClick={() => setStep(prev => prev - 1)} disabled={step === 1} className="expert-btn-nav-prev"><ChevronLeft size={18} /> {t('fundacion.previous')}</button>

                    {step < 10 ? (

                        <button type="button" onClick={() => setStep(prev => prev + 1)} className="expert-btn-nav-next">{t('fundacion.nextStep')} <ChevronRight size={18} /></button>

                    ) : (

                        <button type="button" onClick={() => onSave(formData, true)} disabled={saving} className="expert-btn-nav-finish"><CheckCircle2 size={18} /> {saving ? t('fundacion.finalizing') : t('fundacion.registerFoundation')}</button>

                    )}

                </div>

            </div>



            <datalist id="roles-dignitaries">

                <option value="PRESIDENTE" />

                <option value="SECRETARIO" />

                <option value="TESORERO" />

                <option value="VOCAL" />

                <option value="VICEPRESIDENTE" />

            </datalist>



            <style>{`
                .expert-container { width: 100%; padding: 8px 0 24px; font-family: 'Inter', sans-serif; }
                .expert-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 10px; }
                .expert-title { font-size: 18px; font-weight: 800; color: ${SECONDARY}; margin: 0; letter-spacing: -0.5px; }
                .expert-subtitle { font-size: 10px; color: #64748b; margin: 2px 0 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; }

                .expert-btn-save-master { padding: 5px 14px; background: white; color: ${PRIMARY}; border: 1.5px solid ${PRIMARY}; border-radius: 5px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 5px; transition: all 0.15s; font-size: 11px; }
                .expert-btn-save-master:hover { background: ${PRIMARY}; color: white; }

                .standard-step-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; padding: 0 4px; }
                .standard-step-title { font-size: 11px; font-weight: 700; color: ${SECONDARY}; text-transform: uppercase; letter-spacing: 0.5px; }
                .standard-step-badge { font-size: 9px; font-weight: 800; color: #64748b; background: #f1f5f9; padding: 2px 6px; border-radius: 3px; letter-spacing: 0.5px; }

                .standard-progress-stepper { display: flex; gap: 3px; margin-bottom: 10px; }
                .standard-progress-bar { flex: 1; height: 3px; background: #e2e8f0; border-radius: 3px; transition: all 0.3s ease; }
                .standard-progress-bar.active { background: ${PRIMARY}; }

                .expert-main-panel { background: white; border-radius: 8px; padding: 16px 20px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
                .expert-step-title { font-size: 13px; font-weight: 700; color: ${SECONDARY}; margin: 0 0 10px; display: flex; align-items: center; gap: 6px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }

                .expert-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 10px; }
                .full-width { grid-column: span 2; }
                .expert-field { display: flex; flex-direction: column; gap: 2px; }
                .expert-field label { font-size: 10px; font-weight: 700; color: #64748b; letter-spacing: 0.3px; }

                .expert-input { width: 100%; padding: 5px 8px; border: 1px solid #cbd5e1; border-radius: 4px; outline: none; font-size: 13px; font-weight: 500; color: ${SECONDARY}; transition: all 0.15s; background: #f8fafc; }
                .expert-input:focus { border-color: ${PRIMARY}; background: white; box-shadow: 0 0 0 2px rgba(15,118,110,0.08); }

                .expert-hint { font-size: 10px; color: #64748b; font-style: italic; font-weight: 500; }
                .expert-hint-box { background: #f1f5f9; border: 1px solid #e2e8f0; color: #475569; padding: 6px 10px; border-radius: 5px; font-size: 10px; font-weight: 600; display: flex; align-items: flex-start; gap: 6px; margin-bottom: 8px; line-height: 1.3; }

                .expert-section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
                .expert-btn-add { padding: 4px 10px; background: transparent; color: ${PRIMARY}; border: 1px solid ${PRIMARY}40; border-radius: 4px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 10px; transition: 0.15s; }
                .expert-btn-add:hover { background: ${PRIMARY}; color: white; }

                .expert-card-legal { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 12px 10px; position: relative; margin-bottom: 8px; }
                .expert-card-label { position: absolute; top: -7px; left: 12px; background: #475569; color: white; font-size: 8px; font-weight: 800; padding: 1px 6px; border-radius: 3px; letter-spacing: 0.3px; }
                .expert-btn-remove { position: absolute; top: 6px; right: 6px; color: #ef4444; background: #fef2f2; border: none; padding: 4px; border-radius: 3px; cursor: pointer; transition: 0.15s; }
                .expert-btn-remove:hover { background: #fee2e2; }

                .expert-legal-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; color: ${SECONDARY}; margin-top: 10px; }
                .expert-legal-text { font-size: 11px; line-height: 1.4; color: #334155; margin-bottom: 8px; font-style: italic; border-left: 3px solid #e2e8f0; padding: 6px 10px; background: #f1f5f9; border-radius: 4px; font-weight: 500; }
                .expert-input-legal { width: 100%; padding: 5px 8px; border: 1px solid #cbd5e1; border-radius: 4px; background: #f8fafc; color: ${SECONDARY}; outline: none; font-size: 13px; font-weight: 500; transition: all 0.15s; }
                .expert-input-legal:focus { border-color: ${PRIMARY}; background: white; box-shadow: 0 0 0 2px rgba(15,118,110,0.08); }

                .expert-nav-footer { display: flex; justify-content: space-between; margin-top: 14px; padding-top: 10px; border-top: 1px solid #e2e8f0; }
                .expert-btn-nav-prev { padding: 7px 16px; background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0; border-radius: 5px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 5px; transition: 0.15s; font-size: 12px; }
                .expert-btn-nav-prev:hover:not(:disabled) { background: #f1f5f9; }
                .expert-btn-nav-next { padding: 7px 16px; background: ${PRIMARY}; color: white; border: none; border-radius: 5px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 5px; transition: 0.15s; font-size: 12px; }
                .expert-btn-nav-next:hover { opacity: 0.9; }
                .expert-btn-nav-finish { padding: 7px 16px; background: ${PRIMARY}; color: white; border: none; border-radius: 5px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 5px; transition: 0.15s; font-size: 12px; }

                .poa-original-grid { display: flex; flex-direction: column; gap: 14px; margin-top: 12px; }
                .poa-column-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
                .poa-column-header { background: #475569; color: white; padding: 8px 14px; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; line-height: 1.3; }
                .poa-question-box { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; }
                .poa-question-text { font-size: 11.5px; color: #1e293b; line-height: 1.4; }
                .poa-check-row { display: flex; gap: 16px; margin-top: 8px; }
                .poa-check-label { display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12px; font-weight: 700; color: #334155; }
                .poa-radio { width: 16px; height: 16px; accent-color: ${PRIMARY}; cursor: pointer; }
                .person-copy-box { margin-bottom: 10px; padding: 8px 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; }
                .person-copy-box label { font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 4px; display: block; }

                .fund-autocomplete-dropdown { position: absolute; top: 100%; left: 0; right: 0; z-index: 200; background: white; border: 1px solid #e2e8f0; border-radius: 5px; box-shadow: 0 4px 16px rgba(0,0,0,0.12); max-height: 180px; overflow-y: auto; margin-top: 2px; }
                .fund-autocomplete-item { padding: 6px 10px; cursor: pointer; display: flex; flex-direction: column; gap: 1px; border-bottom: 1px solid #f1f5f9; transition: background 0.1s; }
                .fund-autocomplete-item:last-child { border-bottom: none; }
                .fund-autocomplete-item:hover { background: #f1f5f9; }
                .fund-ac-name { font-size: 11px; font-weight: 700; color: #1e293b; }
                .fund-ac-detail { font-size: 10px; color: #64748b; font-weight: 500; }

                @media (max-width: 768px) {
                    .poa-original-grid .expert-grid { grid-template-columns: 1fr; }
                    .poa-original-grid .full-width { grid-column: span 1; }
                }
            `}</style>

        </div>

    );

};



export default FundacionForm;

