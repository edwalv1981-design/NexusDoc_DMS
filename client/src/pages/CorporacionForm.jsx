/**
 * CorporacionForm — Formulario de Incorporación de Sociedad Anónima (Panamá).
 * Secciones: Nombre, Capital, Directores, Dignatarios, Accionistas, Declaración.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    Building, Building2, Users, UserCheck, Award, FileCheck, 
    Plus, Trash2, ChevronRight, ChevronLeft, CheckCircle2, 
    Shield, Info, Save 
} from 'lucide-react';
import { useLang, useT } from '../i18n';
import API_BASE_URL from '../config';
import { extractRegisteredPeople } from '../utils/personExtractor';
import PersonSelector from '../components/common/PersonSelector';
import { validateField } from '../utils/fieldValidators';
import { normalizeLoadedCorporacionData } from '../utils/corporacionPersonRegistry';

const TEXT_PRIMARY = '#1e293b';
const TEXT_SECONDARY = '#475569';
const TEXT_MUTED = '#64748b';
const BORDER = '#e2e8f0';
const BG_SUBTLE = '#f8fafc';
const BG_CARD = '#ffffff';
const ACCENT = '#0f766e';

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

const CorporacionForm = ({ initialData, onSave, saving }) => {
    const { lang, t } = useLang();
    const [step, setStep] = useState(1);
    const [fieldErrors, setFieldErrors] = useState({});
    const [formData, setFormData] = useState({
        corpNameSA: '', corpNameCorp: '', corpNameInc: '',
        capitalSocial: '10000', 
        companyActivities: '',
        directors: [
            { _id: generateId(), entityType: 'individual', fullName: '', birthDate: '', maritalStatus: '', nationality: '', passport: '', phone: '', email: '', address: '', city: '', country: '' },
            { _id: generateId(), entityType: 'individual', fullName: '', birthDate: '', maritalStatus: '', nationality: '', passport: '', phone: '', email: '', address: '', city: '', country: '' },
            { _id: generateId(), entityType: 'individual', fullName: '', birthDate: '', maritalStatus: '', nationality: '', passport: '', phone: '', email: '', address: '', city: '', country: '' }
        ],
        dignitaries: [
            { _id: generateId(), entityType: 'individual', role: 'PRESIDENTE', fullName: '', birthDate: '', passport: '', registrationNumber: '' },
            { _id: generateId(), entityType: 'individual', role: 'SECRETARIO', fullName: '', birthDate: '', passport: '', registrationNumber: '' },
            { _id: generateId(), entityType: 'individual', role: 'TESORERO', fullName: '', birthDate: '', passport: '', registrationNumber: '' }
        ],
        shareholders: [
            { _id: generateId(), entityType: 'individual', certificate: '1', value: '100', shares: '100', name: '', address: '' }
        ],
        signers: [
            { signature: '', name: '' }
        ],
        declarationDate: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        if (initialData && Object.keys(initialData).length > 0) {
            const cleanData = normalizeLoadedCorporacionData(initialData, formData);
            setFormData(prev => ({ ...prev, ...cleanData }));
        }
    }, [initialData]);

    /* ── Autocomplete state ── */
    const [directorSuggestions, setDirectorSuggestions] = useState({});
    const [dignitarySuggestions, setDignitarySuggestions] = useState({});
    const [shareholderSuggestions, setShareholderSuggestions] = useState({});
    const [signerSuggestions, setSignerSuggestions] = useState({});
    const [activeDirectorKey, setActiveDirectorKey] = useState(null);
    const [activeDignitaryKey, setActiveDignitaryKey] = useState(null);
    const [activeShareholderIdx, setActiveShareholderIdx] = useState(null);
    const [activeSignerIdx, setActiveSignerIdx] = useState(null);
    const debounceTimers = useRef({});
    const autocompleteRefs = useRef({});

    useEffect(() => {
        const handleClickOutside = (e) => {
            const isInsideAny = Object.values(autocompleteRefs.current).some(
                ref => ref && ref.contains(e.target)
            );
            if (!isInsideAny) {
                setActiveDirectorKey(null);
                setActiveDignitaryKey(null);
                setActiveShareholderIdx(null);
                setActiveSignerIdx(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const searchPerson = useCallback((query, index, type, field = 'name') => {
        const timerKey = `${type}-${index}-${field}`;
        const activeKey = `${index}-${field}`;
        if (debounceTimers.current[timerKey]) clearTimeout(debounceTimers.current[timerKey]);
        if (!query || query.trim().length < 2) {
            if (type === 'director') { setDirectorSuggestions(prev => ({ ...prev, [activeKey]: [] })); setActiveDirectorKey(null); }
            if (type === 'dignitary') { setDignitarySuggestions(prev => ({ ...prev, [activeKey]: [] })); setActiveDignitaryKey(null); }
            return;
        }
        debounceTimers.current[timerKey] = setTimeout(async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(
                    `${API_BASE_URL}/api/forms/corporacion/search-person?q=${encodeURIComponent(query.trim())}`,
                    { headers: { 'x-auth-token': token } }
                );
                if (res.ok) {
                    const data = await res.json();
                    if (type === 'director') { setDirectorSuggestions(prev => ({ ...prev, [activeKey]: data })); setActiveDirectorKey(data.length > 0 ? activeKey : null); }
                    if (type === 'dignitary') { setDignitarySuggestions(prev => ({ ...prev, [activeKey]: data })); setActiveDignitaryKey(data.length > 0 ? activeKey : null); }
                }
            } catch (err) { /* silent */ }
        }, 300);
    }, []);

    const searchShareholder = useCallback((query, index) => {
        const timerKey = `shareholder-${index}`;
        if (debounceTimers.current[timerKey]) clearTimeout(debounceTimers.current[timerKey]);
        if (!query || query.trim().length < 2) {
            setShareholderSuggestions(prev => ({ ...prev, [index]: [] }));
            setActiveShareholderIdx(null);
            return;
        }
        debounceTimers.current[timerKey] = setTimeout(async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(
                    `${API_BASE_URL}/api/forms/corporacion/search-shareholder?q=${encodeURIComponent(query.trim())}`,
                    { headers: { 'x-auth-token': token } }
                );
                if (res.ok) {
                    const data = await res.json();
                    setShareholderSuggestions(prev => ({ ...prev, [index]: data }));
                    setActiveShareholderIdx(data.length > 0 ? index : null);
                }
            } catch (err) { /* silent */ }
        }, 300);
    }, []);

    const searchSigner = useCallback((query, index) => {
        const timerKey = `signer-${index}`;
        if (debounceTimers.current[timerKey]) clearTimeout(debounceTimers.current[timerKey]);
        if (!query || query.trim().length < 2) {
            setSignerSuggestions(prev => ({ ...prev, [index]: [] }));
            setActiveSignerIdx(null);
            return;
        }
        debounceTimers.current[timerKey] = setTimeout(async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(
                    `${API_BASE_URL}/api/forms/corporacion/search-person?q=${encodeURIComponent(query.trim())}`,
                    { headers: { 'x-auth-token': token } }
                );
                if (res.ok) {
                    const data = await res.json();
                    setSignerSuggestions(prev => ({ ...prev, [index]: data }));
                    setActiveSignerIdx(data.length > 0 ? index : null);
                }
            } catch (err) { /* silent */ }
        }, 300);
    }, []);

    const selectDirectorSuggestion = (index, person, field) => {
        const newDirectors = [...formData.directors];
        const d = newDirectors[index];
        const fn = person.fullName || [person.firstName, person.secondName, person.lastName].filter(Boolean).join(' ');
        if (fn) d.fullName = fn;
        const fields = ['birthDate', 'maritalStatus', 'nationality', 'passport', 'phone', 'email', 'address', 'city', 'country'];
        fields.forEach(f => { if (person[f]) d[f] = person[f]; });
        setFormData(prev => ({ ...prev, directors: newDirectors }));
        setDirectorSuggestions(prev => ({ ...prev, [`${index}-name`]: [], [`${index}-passport`]: [] }));
        setActiveDirectorKey(null);
    };

    const selectDignitarySuggestion = (index, person) => {
        const newDigs = [...formData.dignitaries];
        const d = newDigs[index];
        const fn = person.fullName || [person.firstName, person.secondName, person.lastName].filter(Boolean).join(' ');
        if (fn) d.fullName = fn;
        if (person.passport) d.passport = person.passport;
        if (person.birthDate) d.birthDate = person.birthDate;
        if (person.registrationNumber) d.registrationNumber = person.registrationNumber;
        setFormData(prev => ({ ...prev, dignitaries: newDigs }));
        setDignitarySuggestions(prev => ({ ...prev, [`${index}-name`]: [], [`${index}-passport`]: [] }));
        setActiveDignitaryKey(null);
    };

    const selectShareholderSuggestion = (index, person) => {
        const newSh = [...formData.shareholders];
        const s = newSh[index];
        if (person.name) s.name = person.name;
        if (person.address) s.address = person.address;
        setFormData(prev => ({ ...prev, shareholders: newSh }));
        setShareholderSuggestions(prev => ({ ...prev, [index]: [] }));
        setActiveShareholderIdx(null);
    };

    const selectSignerSuggestion = (index, person) => {
        const newSigners = [...formData.signers];
        const fn = person.fullName || person.name || [person.firstName, person.secondName, person.lastName].filter(Boolean).join(' ');
        if (fn) {
            newSigners[index].name = fn;
            newSigners[index].signature = fn;
        }
        setFormData(prev => ({ ...prev, signers: newSigners }));
        setSignerSuggestions(prev => ({ ...prev, [index]: [] }));
        setActiveSignerIdx(null);
    };

    const registeredPeople = extractRegisteredPeople(formData);

    const handleAutoFillDirector = (index, person) => {
        const newDirectors = [...formData.directors];
        const d = newDirectors[index];
        const fn = person.fullName || [person.firstName, person.secondName, person.lastName].filter(Boolean).join(' ');
        if (fn) d.fullName = fn;
        if (person.birthDate) d.birthDate = person.birthDate;
        if (person.maritalStatus) d.maritalStatus = person.maritalStatus;
        if (person.nationality) d.nationality = person.nationality;
        if (person.passport) d.passport = person.passport;
        if (person.phone) d.phone = person.phone;
        if (person.email) d.email = person.email;
        if (person.address) d.address = person.address;
        if (person.city) d.city = person.city;
        if (person.country) d.country = person.country;
        setFormData(prev => ({ ...prev, directors: newDirectors }));
    };

    const handleAutoFillDignitary = (index, person) => {
        const newDigs = [...formData.dignitaries];
        const d = newDigs[index];
        const fn = person.fullName || [person.firstName, person.secondName, person.lastName].filter(Boolean).join(' ');
        if (fn) d.fullName = fn;
        if (person.passport) d.passport = person.passport;
        if (person.birthDate) d.birthDate = person.birthDate;
        setFormData(prev => ({ ...prev, dignitaries: newDigs }));
    };

    const handleAutoFillShareholder = (index, person) => {
        const newSh = [...formData.shareholders];
        const s = newSh[index];
        const fn = person.fullName || person.name || [person.firstName, person.secondName, person.lastName].filter(Boolean).join(' ');
        if (fn) s.name = fn;
        if (person.address) s.address = person.address;
        setFormData(prev => ({ ...prev, shareholders: newSh }));
    };

    const handleAutoFillSigner = (index, person) => {
        const newSigners = [...formData.signers];
        const fn = person.fullName || person.name || [person.firstName, person.secondName, person.lastName].filter(Boolean).join(' ');
        if (fn) {
            newSigners[index].name = fn;
            newSigners[index].signature = fn;
        }
        setFormData(prev => ({ ...prev, signers: newSigners }));
    };

    /* ── Field validation ── */
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

    /* ── Array operations ── */
    const addDignitary = () => {
        setFormData(prev => ({
            ...prev,
            dignitaries: [...prev.dignitaries, { _id: generateId(), entityType: 'individual', role: '', fullName: '', birthDate: '', passport: '', registrationNumber: '' }]
        }));
    };

    const removeDignitary = (index) => {
        if (formData.dignitaries.length <= 1) return;
        setFormData(prev => ({ ...prev, dignitaries: prev.dignitaries.filter((_, i) => i !== index) }));
    };

    const updateDignitary = (index, field, value) => {
        const newDigs = [...formData.dignitaries];
        newDigs[index][field] = value;
        setFormData(prev => ({ ...prev, dignitaries: newDigs }));
        const key = `dignitaries.${index}.${field}`;
        if (fieldErrors[key]) {
            const error = validateField(field, value);
            if (!error) setFieldErrors(prev => { const next = { ...prev }; delete next[key]; return next; });
        }
    };

    const addDirector = () => {
        setFormData(prev => ({
            ...prev,
            directors: [...prev.directors, { _id: generateId(), entityType: 'individual', fullName: '', birthDate: '', maritalStatus: '', nationality: '', passport: '', phone: '', email: '', address: '', city: '', country: '' }]
        }));
    };

    const removeDirector = (index) => {
        if (formData.directors.length <= 3) return;
        setFormData(prev => ({ ...prev, directors: prev.directors.filter((_, i) => i !== index) }));
    };

    const updateDirector = (index, field, value) => {
        const newDirectors = [...formData.directors];
        newDirectors[index][field] = value;
        setFormData(prev => ({ ...prev, directors: newDirectors }));
        const key = `directors.${index}.${field}`;
        if (fieldErrors[key]) {
            const error = validateField(field, value);
            if (!error) setFieldErrors(prev => { const next = { ...prev }; delete next[key]; return next; });
        }
    };

    const addShareholder = () => {
        setFormData(prev => ({
            ...prev,
            shareholders: [...prev.shareholders, { _id: generateId(), entityType: 'individual', certificate: '', value: '', shares: '', name: '', address: '' }]
        }));
    };

    const removeShareholder = (index) => {
        if (formData.shareholders.length <= 1) return;
        setFormData(prev => ({ ...prev, shareholders: prev.shareholders.filter((_, i) => i !== index) }));
    };

    const updateShareholder = (index, field, value) => {
        const newShareholders = [...formData.shareholders];
        newShareholders[index][field] = value;
        setFormData(prev => ({ ...prev, shareholders: newShareholders }));
        const key = `shareholders.${index}.${field}`;
        if (fieldErrors[key]) {
            const error = validateField(field, value);
            if (!error) setFieldErrors(prev => { const next = { ...prev }; delete next[key]; return next; });
        }
    };

    const addSigner = () => {
        setFormData(prev => ({ ...prev, signers: [...prev.signers, { signature: '', name: '' }] }));
    };

    const removeSigner = (index) => {
        if (formData.signers.length <= 1) return;
        setFormData(prev => ({ ...prev, signers: prev.signers.filter((_, i) => i !== index) }));
    };

    const updateSigner = (index, field, value) => {
        const newSigners = [...formData.signers];
        newSigners[index][field] = value;
        if (field === 'name') {
            newSigners[index].signature = value;
        }
        setFormData(prev => ({ ...prev, signers: newSigners }));
        const key = `signers.${index}.${field}`;
        if (fieldErrors[key]) {
            const error = validateField(field, value);
            if (!error) setFieldErrors(prev => { const next = { ...prev }; delete next[key]; return next; });
        }
    };

    /* ── Full form validation on submit ── */
    const validateAllFields = () => {
        const errors = {};
        const simpleFields = ['corpNameSA', 'corpNameCorp', 'corpNameInc', 'capitalSocial', 'companyActivities', 'declarationDate'];
        simpleFields.forEach(field => {
            const error = validateField(field, formData[field]);
            if (error) errors[field] = error;
        });
        const directorFields = ['fullName', 'nationality', 'passport', 'birthDate', 'phone', 'email', 'address', 'city', 'country'];
        formData.directors.forEach((d, i) => {
            directorFields.forEach(field => {
                const error = validateField(field, d[field]);
                if (error) errors[`directors.${i}.${field}`] = error;
            });
        });
        const dignitaryFields = ['role', 'fullName', 'passport', 'birthDate', 'registrationNumber'];
        formData.dignitaries.forEach((d, i) => {
            dignitaryFields.forEach(field => {
                const error = validateField(field, d[field]);
                if (error) errors[`dignitaries.${i}.${field}`] = error;
            });
        });
        const shareholderFields = ['certificate', 'value', 'shares', 'name', 'address'];
        formData.shareholders.forEach((s, i) => {
            shareholderFields.forEach(field => {
                const error = validateField(field, s[field]);
                if (error) errors[`shareholders.${i}.${field}`] = error;
            });
        });
        const signerFields = ['name', 'signature'];
        formData.signers.forEach((s, i) => {
            signerFields.forEach(field => {
                const error = validateField(field, s[field]);
                if (error) errors[`signers.${i}.${field}`] = error;
            });
        });
        return errors;
    };

    const handleFinalSave = () => {
        const errors = validateAllFields();
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            alert(lang === 'en'
                ? `There are ${Object.keys(errors).length} field(s) with format errors. Please review and correct them before submitting.`
                : `Hay ${Object.keys(errors).length} campo(s) con errores de formato. Por favor revise y corríjalos antes de enviar.`
            );
            return;
        }
        onSave(formData, true);
    };

    /* ── Step renderers ── */

    const renderStep1 = () => (
        <div className="corp-step">
            <h2 className="corp-section-title"><Building size={18} /> {t('corporacion.steps.societyInfo') || 'Información de la Sociedad'}</h2>
            
            <div className="corp-hint-box">
                <Info size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                <div>
                    <strong>
                        {lang === 'en'
                            ? 'List the names you wish to use to incorporate your corporation in order of preference.'
                            : 'Listar los nombres que desea utilizar para incorporar su compañía en orden de preferencia.'
                        }
                    </strong>
                    <div style={{ marginTop: '3px', fontSize: '11px', color: TEXT_MUTED }}>
                        {lang === 'en'
                            ? 'The name of the Company must be determined by one of the following terminations: Corporation, Incorporated, Société Anonyme, Sociedad Anónima, Corp., Inc., S.A., A/S, N.V., B.V., AG.'
                            : 'El nombre de la Compañía debe terminar con una de las siguientes terminaciones: Corporation, Incorporated, Société Anonyme, Sociedad Anónima, Corp., Inc., S.A., A/S, N.V., B.V., AG.'
                        }
                    </div>
                </div>
            </div>

            <div className="corp-grid">
                <div className="corp-field full-width">
                    <label>{lang === 'en' ? 'Commercial Name (S.A.) - 1st Choice' : 'Nombre Comercial (S.A.) - Opción 1'}</label>
                    <input className="corp-input" style={getErrorStyle('corpNameSA')} value={formData.corpNameSA} onChange={e => { setFormData({...formData, corpNameSA: e.target.value}); if (fieldErrors.corpNameSA) { const err = validateField('corpNameSA', e.target.value); if (!err) setFieldErrors(prev => { const next = { ...prev }; delete next.corpNameSA; return next; }); } }} onBlur={() => handleFieldBlur('corpNameSA')} placeholder="NEXUS SOLUTIONS S.A." />
                    <FieldError name="corpNameSA" />
                </div>
                <div className="corp-field">
                    <label>{lang === 'en' ? 'Optional Name (CORP.) - 2nd Choice' : 'Nombre Opcional (CORP.) - Opción 2'}</label>
                    <input className="corp-input" style={getErrorStyle('corpNameCorp')} value={formData.corpNameCorp} onChange={e => { setFormData({...formData, corpNameCorp: e.target.value}); if (fieldErrors.corpNameCorp) { const err = validateField('corpNameCorp', e.target.value); if (!err) setFieldErrors(prev => { const next = { ...prev }; delete next.corpNameCorp; return next; }); } }} onBlur={() => handleFieldBlur('corpNameCorp')} placeholder="NEXUS SOLUTIONS CORP." />
                    <FieldError name="corpNameCorp" />
                </div>
                <div className="corp-field">
                    <label>{lang === 'en' ? 'Optional Name (INC.) - 3rd Choice' : 'Nombre Opcional (INC.) - Opción 3'}</label>
                    <input className="corp-input" style={getErrorStyle('corpNameInc')} value={formData.corpNameInc} onChange={e => { setFormData({...formData, corpNameInc: e.target.value}); if (fieldErrors.corpNameInc) { const err = validateField('corpNameInc', e.target.value); if (!err) setFieldErrors(prev => { const next = { ...prev }; delete next.corpNameInc; return next; }); } }} onBlur={() => handleFieldBlur('corpNameInc')} placeholder="NEXUS SOLUTIONS INC." />
                    <FieldError name="corpNameInc" />
                </div>
                <div className="corp-field full-width">
                    <label>{lang === 'en' ? 'Authorized Capital (MIN $10,000)' : 'Capital Social Autorizado (MÍN $10,000)'}</label>
                    <div className="corp-hint">
                        {lang === 'en'
                            ? 'The minimum authorized capital of the company is US$10,000.00.'
                            : 'El capital mínimo autorizado de la sociedad es US$10,000.00.'
                        }
                    </div>
                    <input className="corp-input" style={getErrorStyle('capitalSocial')} value={formData.capitalSocial} onChange={e => { setFormData({...formData, capitalSocial: e.target.value}); if (fieldErrors.capitalSocial) { const err = validateField('capitalSocial', e.target.value); if (!err) setFieldErrors(prev => { const next = { ...prev }; delete next.capitalSocial; return next; }); } }} onBlur={() => handleFieldBlur('capitalSocial')} placeholder="$10,000.00" />
                    <FieldError name="capitalSocial" />
                </div>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="corp-step">
            <div className="corp-section-header">
                <h2 className="corp-section-title"><Users size={18} /> {t('corporacion.steps.directors')}</h2>
                <button onClick={addDirector} className="corp-btn-add"><Plus size={14} /> {t('corporacion.fields.addDirector')}</button>
            </div>
            <div className="corp-hint-box">
                <Info size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                    {lang === 'en'
                        ? 'In Panama, a minimum of 3 directors are required for the board of directors.'
                        : 'En Panamá se requieren mínimo 3 directores para la junta directiva.'
                    }
                </div>
            </div>
            {formData.directors.map((d, i) => (
                <div key={d._id || i} className="corp-card">
                    <div className="corp-card-label">DIRECTOR #{i+1}</div>
                    {formData.directors.length > 3 && <button onClick={() => removeDirector(i)} className="corp-btn-remove"><Trash2 size={14} /></button>}
                    <PersonSelector
                        people={registeredPeople}
                        onSelectPerson={(person) => handleAutoFillDirector(i, person)}
                        currentName={d.fullName}
                    />
                    <div className="corp-grid">
                        <div className="corp-field full-width" style={{ position: 'relative' }} ref={el => autocompleteRefs.current[`dir-name-${i}`] = el}>
                            <label>{d.entityType === "company" ? (lang === "en" ? "Company Name" : "Razón Social") : (lang === "en" ? "Full name" : "Nombre completo")}</label>
                            <input className="corp-input" style={getArrayErrorStyle('directors', i, 'fullName')} value={d.fullName} autoComplete="off" onChange={e => { updateDirector(i, 'fullName', e.target.value); searchPerson(e.target.value, i, 'director', 'name'); }} onFocus={() => { if (directorSuggestions[`${i}-name`]?.length) setActiveDirectorKey(`${i}-name`); }} onBlur={() => handleArrayFieldBlur('directors', i, 'fullName')} placeholder={d.entityType === "company" ? "EJ: EMPRESA S.A." : (lang === "en" ? "Full name as on Passport/ID" : "Nombre completo como aparece en pasaporte/cédula")} />
                            <ArrayFieldError array="directors" index={i} field="fullName" />
                            {activeDirectorKey === `${i}-name` && directorSuggestions[`${i}-name`]?.length > 0 && (
                                <div className="corp-autocomplete-dropdown">
                                    {directorSuggestions[`${i}-name`].map((p, j) => (
                                        <div key={j} className="corp-autocomplete-item" onMouseDown={(e) => { e.preventDefault(); selectDirectorSuggestion(i, p, 'name'); }}>
                                            <span className="corp-ac-name">{p.fullName || [p.firstName, p.secondName, p.lastName].filter(Boolean).join(' ') || ''}</span>
                                            <span className="corp-ac-detail">{p.passport || ''}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="corp-field">
                            <label>{lang === 'en' ? 'Marital Status' : 'Estado civil'}</label>
                            <select className="corp-input" value={d.maritalStatus} onChange={e => updateDirector(i, 'maritalStatus', e.target.value)}>
                                <option value="">{lang === 'en' ? 'Select...' : 'Seleccione...'}</option>
                                <option value="Soltero(a)">{lang === 'en' ? 'Single' : 'Soltero(a)'}</option>
                                <option value="Casado(a)">{lang === 'en' ? 'Married' : 'Casado(a)'}</option>
                                <option value="Divorciado(a)">{lang === 'en' ? 'Divorced' : 'Divorciado(a)'}</option>
                                <option value="Viudo(a)">{lang === 'en' ? 'Widowed' : 'Viudo(a)'}</option>
                            </select>
                        </div>
                        <div className="corp-field"><label>{lang === 'en' ? 'Citizenship' : 'Nacionalidad'}</label><input className="corp-input" style={getArrayErrorStyle('directors', i, 'nationality')} value={d.nationality} onChange={e => updateDirector(i, 'nationality', e.target.value)} onBlur={() => handleArrayFieldBlur('directors', i, 'nationality')} /><ArrayFieldError array="directors" index={i} field="nationality" /></div>
                        <div className="corp-field" style={{ position: 'relative' }} ref={el => autocompleteRefs.current[`dir-pass-${i}`] = el}>
                            <label>{d.entityType === "company" ? (lang === "en" ? "Registration Number / RUC" : "RUC / No. de Registro") : (lang === "en" ? "Passport / ID" : "Pasaporte / Cédula")}</label>
                            <input className="corp-input" style={getArrayErrorStyle('directors', i, 'passport')} value={d.passport} autoComplete="off" onChange={e => { updateDirector(i, 'passport', e.target.value); searchPerson(e.target.value, i, 'director', 'passport'); }} onFocus={() => { if (directorSuggestions[`${i}-passport`]?.length) setActiveDirectorKey(`${i}-passport`); }} onBlur={() => handleArrayFieldBlur('directors', i, 'passport')} />
                            <ArrayFieldError array="directors" index={i} field="passport" />
                            {activeDirectorKey === `${i}-passport` && directorSuggestions[`${i}-passport`]?.length > 0 && (
                                <div className="corp-autocomplete-dropdown">
                                    {directorSuggestions[`${i}-passport`].map((p, j) => (
                                        <div key={j} className="corp-autocomplete-item" onMouseDown={(e) => { e.preventDefault(); selectDirectorSuggestion(i, p, 'passport'); }}>
                                            <span className="corp-ac-passport">{p.passport}</span>
                                            <span className="corp-ac-name">{p.fullName || [p.firstName, p.secondName, p.lastName].filter(Boolean).join(' ') || ''}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="corp-field"><label>{lang === 'en' ? 'Date of birth' : 'Fecha de nacimiento'}</label><input type="date" className="corp-input" style={getArrayErrorStyle('directors', i, 'birthDate')} value={d.birthDate} onChange={e => updateDirector(i, 'birthDate', e.target.value)} onBlur={() => handleArrayFieldBlur('directors', i, 'birthDate')} /><ArrayFieldError array="directors" index={i} field="birthDate" /></div>
                        <div className="corp-field"><label>{lang === 'en' ? 'Phone' : 'Teléfono'}</label><input className="corp-input" style={getArrayErrorStyle('directors', i, 'phone')} value={d.phone} onChange={e => updateDirector(i, 'phone', e.target.value)} onBlur={() => handleArrayFieldBlur('directors', i, 'phone')} placeholder={lang === 'en' ? '+1-555-0100' : '+507-6000-0000'} /><ArrayFieldError array="directors" index={i} field="phone" /></div>
                        <div className="corp-field full-width"><label>{lang === 'en' ? 'Email' : 'Correo electrónico'}</label><input type="email" className="corp-input" style={getArrayErrorStyle('directors', i, 'email')} value={d.email} onChange={e => updateDirector(i, 'email', e.target.value)} onBlur={() => handleArrayFieldBlur('directors', i, 'email')} placeholder="name@example.com" /><ArrayFieldError array="directors" index={i} field="email" /></div>
                        <div className="corp-field full-width"><label>{lang === 'en' ? 'Residential Address' : 'Dirección completa'}</label><input className="corp-input" style={getArrayErrorStyle('directors', i, 'address')} value={d.address} onChange={e => updateDirector(i, 'address', e.target.value)} onBlur={() => handleArrayFieldBlur('directors', i, 'address')} /><ArrayFieldError array="directors" index={i} field="address" /></div>
                        <div className="corp-field"><label>{lang === 'en' ? 'City' : 'Ciudad'}</label><input className="corp-input" style={getArrayErrorStyle('directors', i, 'city')} value={d.city} onChange={e => updateDirector(i, 'city', e.target.value)} onBlur={() => handleArrayFieldBlur('directors', i, 'city')} /><ArrayFieldError array="directors" index={i} field="city" /></div>
                        <div className="corp-field"><label>{lang === 'en' ? 'Country' : 'País'}</label><input className="corp-input" style={getArrayErrorStyle('directors', i, 'country')} value={d.country} onChange={e => updateDirector(i, 'country', e.target.value)} onBlur={() => handleArrayFieldBlur('directors', i, 'country')} /><ArrayFieldError array="directors" index={i} field="country" /></div>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderStep3 = () => (
        <div className="corp-step">
            <div className="corp-section-header">
                <h2 className="corp-section-title"><UserCheck size={18} /> {t('corporacion.steps.dignitaries')}</h2>
                <button onClick={addDignitary} className="corp-btn-add"><Plus size={14} /> {t('corporacion.fields.addDignitary')}</button>
            </div>
            <div className="corp-hint-box">
                <Info size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                    {lang === 'en'
                        ? 'Dignitaries can be the directors themselves or third parties.'
                        : 'Los dignatarios pueden ser los mismos directores o terceras personas.'
                    }
                </div>
            </div>
            {formData.dignitaries.map((dig, i) => (
                <div key={dig._id || i} className="corp-card">
                    <div className="corp-card-label">{lang === 'en' ? 'DIGNITARY' : 'DIGNATARIO'} #{i+1}</div>
                    {formData.dignitaries.length > 3 && <button onClick={() => removeDignitary(i)} className="corp-btn-remove"><Trash2 size={14} /></button>}
                    <PersonSelector
                        people={registeredPeople}
                        onSelectPerson={(person) => handleAutoFillDignitary(i, person)}
                        currentName={dig.fullName}
                    />
                    <div className="corp-grid">
                        <div className="corp-field"><label>{lang === 'en' ? 'Position / Role' : 'Cargo (Presidente, Secretario, Tesorero...)'}</label><input className="corp-input" style={getArrayErrorStyle('dignitaries', i, 'role')} value={dig.role} onChange={e => updateDignitary(i, 'role', e.target.value.toUpperCase())} onBlur={() => handleArrayFieldBlur('dignitaries', i, 'role')} placeholder="EJ: PRESIDENTE" /><ArrayFieldError array="dignitaries" index={i} field="role" /></div>
                        <div className="corp-field full-width" style={{ position: 'relative' }} ref={el => autocompleteRefs.current[`dig-name-${i}`] = el}>
                            <label>{dig.entityType === "company" ? (lang === "en" ? "Company Name" : "Razón Social") : (lang === "en" ? "Full name" : "Nombre completo")}</label>
                            <input className="corp-input" style={getArrayErrorStyle('dignitaries', i, 'fullName')} value={dig.fullName} autoComplete="off" onChange={e => { updateDignitary(i, 'fullName', e.target.value); searchPerson(e.target.value, i, 'dignitary', 'name'); }} onFocus={() => { if (dignitarySuggestions[`${i}-name`]?.length) setActiveDignitaryKey(`${i}-name`); }} onBlur={() => handleArrayFieldBlur('dignitaries', i, 'fullName')} />
                            <ArrayFieldError array="dignitaries" index={i} field="fullName" />
                            {activeDignitaryKey === `${i}-name` && dignitarySuggestions[`${i}-name`]?.length > 0 && (
                                <div className="corp-autocomplete-dropdown">
                                    {dignitarySuggestions[`${i}-name`].map((p, j) => (
                                        <div key={j} className="corp-autocomplete-item" onMouseDown={(e) => { e.preventDefault(); selectDignitarySuggestion(i, p); }}>
                                            <span className="corp-ac-name">{p.fullName || [p.firstName, p.secondName, p.lastName].filter(Boolean).join(' ') || ''}</span>
                                            <span className="corp-ac-detail">{p.passport || ''}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="corp-field" style={{ position: 'relative' }} ref={el => autocompleteRefs.current[`dig-pass-${i}`] = el}>
                            <label>{lang === 'en' ? 'Passport / ID' : 'Pasaporte / Cédula'}</label>
                            <input className="corp-input" style={getArrayErrorStyle('dignitaries', i, 'passport')} value={dig.passport} autoComplete="off" onChange={e => { updateDignitary(i, 'passport', e.target.value); searchPerson(e.target.value, i, 'dignitary', 'passport'); }} onFocus={() => { if (dignitarySuggestions[`${i}-passport`]?.length) setActiveDignitaryKey(`${i}-passport`); }} onBlur={() => handleArrayFieldBlur('dignitaries', i, 'passport')} />
                            <ArrayFieldError array="dignitaries" index={i} field="passport" />
                            {activeDignitaryKey === `${i}-passport` && dignitarySuggestions[`${i}-passport`]?.length > 0 && (
                                <div className="corp-autocomplete-dropdown">
                                    {dignitarySuggestions[`${i}-passport`].map((p, j) => (
                                        <div key={j} className="corp-autocomplete-item" onMouseDown={(e) => { e.preventDefault(); selectDignitarySuggestion(i, p); }}>
                                            <span className="corp-ac-passport">{p.passport}</span>
                                            <span className="corp-ac-name">{p.fullName || [p.firstName, p.secondName, p.lastName].filter(Boolean).join(' ') || ''}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="corp-field"><label>{lang === 'en' ? 'Date of birth' : 'Fecha de nacimiento'}</label><input type="date" className="corp-input" style={getArrayErrorStyle('dignitaries', i, 'birthDate')} value={dig.birthDate} onChange={e => updateDignitary(i, 'birthDate', e.target.value)} onBlur={() => handleArrayFieldBlur('dignitaries', i, 'birthDate')} /><ArrayFieldError array="dignitaries" index={i} field="birthDate" /></div>
                        {dig.entityType !== "company" && <div className="corp-field"><label>{lang === 'en' ? 'Registration Number' : 'Número de Registro'}</label><input className="corp-input" style={getArrayErrorStyle('dignitaries', i, 'registrationNumber')} value={dig.registrationNumber || ''} onChange={e => updateDignitary(i, 'registrationNumber', e.target.value)} onBlur={() => handleArrayFieldBlur('dignitaries', i, 'registrationNumber')} placeholder={lang === 'en' ? 'Reg. number' : 'No. Registro'} /><ArrayFieldError array="dignitaries" index={i} field="registrationNumber" /></div>}
                    </div>
                </div>
            ))}
        </div>
    );

    const renderStep4 = () => (
        <div className="corp-step">
            <div className="corp-section-header">
                <h2 className="corp-section-title"><Award size={18} /> {t('corporacion.steps.shareholders')}</h2>
                <button onClick={addShareholder} className="corp-btn-add"><Plus size={14} /> {t('corporacion.fields.addShareholder')}</button>
            </div>
            <div className="corp-hint-box">
                <Info size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                    {lang === 'en'
                        ? "Indicate the distribution of the company's initial shares."
                        : 'Indicar la distribución de las acciones iniciales de la sociedad.'
                    }
                </div>
            </div>
            {formData.shareholders.map((s, i) => (
                <div key={s._id || i} className="corp-card">
                    <div className="corp-card-label">{lang === 'en' ? 'SHAREHOLDER' : 'ACCIONISTA'} #{i+1}</div>
                    {formData.shareholders.length > 1 && <button onClick={() => removeShareholder(i)} className="corp-btn-remove"><Trash2 size={14} /></button>}
                    <PersonSelector
                        people={registeredPeople}
                        onSelectPerson={(person) => handleAutoFillShareholder(i, person)}
                        currentName={s.name}
                    />
                    <div className="corp-grid">
                        <div className="corp-field"><label>{lang === 'en' ? 'Share Certificate Number' : 'No. de Certificado'}</label><input className="corp-input" style={getArrayErrorStyle('shareholders', i, 'certificate')} value={s.certificate} onChange={e => updateShareholder(i, 'certificate', e.target.value)} onBlur={() => handleArrayFieldBlur('shareholders', i, 'certificate')} /><ArrayFieldError array="shareholders" index={i} field="certificate" /></div>
                        <div className="corp-field"><label>{lang === 'en' ? "Share's value (USD)" : 'Valor por acción (USD)'}</label><input className="corp-input" style={getArrayErrorStyle('shareholders', i, 'value')} value={s.value} onChange={e => updateShareholder(i, 'value', e.target.value)} onBlur={() => handleArrayFieldBlur('shareholders', i, 'value')} /><ArrayFieldError array="shareholders" index={i} field="value" /></div>
                        <div className="corp-field"><label>{lang === 'en' ? 'Number of shares' : 'Cantidad de acciones'}</label><input className="corp-input" style={getArrayErrorStyle('shareholders', i, 'shares')} value={s.shares} onChange={e => updateShareholder(i, 'shares', e.target.value)} onBlur={() => handleArrayFieldBlur('shareholders', i, 'shares')} /><ArrayFieldError array="shareholders" index={i} field="shares" /></div>
                        <div className="corp-field full-width" style={{ position: 'relative' }} ref={el => autocompleteRefs.current[`sh-${i}`] = el}>
                            <label>{s.entityType === "company" ? (lang === "en" ? "Company Name" : "Razón Social") : (lang === "en" ? "Shareholder (Full name)" : "Accionista (Nombre completo)")}</label>
                            <input className="corp-input" style={getArrayErrorStyle('shareholders', i, 'name')} value={s.name} autoComplete="off" onChange={e => { updateShareholder(i, 'name', e.target.value); searchShareholder(e.target.value, i); }} onFocus={() => { if (shareholderSuggestions[i]?.length) setActiveShareholderIdx(i); }} onBlur={() => handleArrayFieldBlur('shareholders', i, 'name')} />
                            <ArrayFieldError array="shareholders" index={i} field="name" />
                            {activeShareholderIdx === i && shareholderSuggestions[i]?.length > 0 && (
                                <div className="corp-autocomplete-dropdown">
                                    {shareholderSuggestions[i].map((p, j) => (
                                        <div key={j} className="corp-autocomplete-item" onMouseDown={(e) => { e.preventDefault(); selectShareholderSuggestion(i, p); }}>
                                            <span className="corp-ac-name">{p.name}</span>
                                            {p.address && <span className="corp-ac-detail">{p.address}</span>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="corp-field full-width"><label>{s.entityType === "company" ? (lang === "en" ? "Registered Address" : "Dirección Registrada") : (lang === "en" ? "Residential Address" : "Dirección residencial")}</label><input className="corp-input" style={getArrayErrorStyle('shareholders', i, 'address')} value={s.address} onChange={e => updateShareholder(i, 'address', e.target.value)} onBlur={() => handleArrayFieldBlur('shareholders', i, 'address')} /><ArrayFieldError array="shareholders" index={i} field="address" /></div>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderStep5 = () => (
        <div className="corp-step">
            <h2 className="corp-section-title"><FileCheck size={18} /> {t('corporacion.steps.finalization')}</h2>
            <div className="corp-field full-width" style={{ marginBottom: '14px' }}>
                <label>{lang === 'en' ? 'Company Activities / Purpose' : 'Actividades y Objeto Social de la Compañía'}</label>
                <div className="corp-hint" style={{ marginBottom: '4px' }}>
                    {lang === 'en'
                        ? "Please provide an explanation of the corporation's activities."
                        : 'Favor provea una explicación de la actividad de la sociedad.'
                    }
                </div>
                <textarea className="corp-input" style={getErrorStyle('companyActivities')} rows={4} value={formData.companyActivities} onChange={e => { setFormData({...formData, companyActivities: e.target.value}); if (fieldErrors.companyActivities) { const err = validateField('companyActivities', e.target.value); if (!err) setFieldErrors(prev => { const next = { ...prev }; delete next.companyActivities; return next; }); } }} onBlur={() => handleFieldBlur('companyActivities')} placeholder={lang === 'en' ? 'Describe company activities...' : 'Describa las actividades...'} />
                <FieldError name="companyActivities" />
            </div>

            <div className="corp-declaration-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h3 style={{ fontSize: '12px', fontWeight: 700, color: TEXT_PRIMARY, margin: 0 }}>{lang === 'en' ? 'Declaration / Sworn Affidavit' : 'Declaración / Declaración Jurada'}</h3>
                    <button onClick={addSigner} className="corp-btn-add"><Plus size={14} /> {t('corporacion.fields.addSigner') || (lang === 'en' ? 'ADD SIGNER' : 'AGREGAR FIRMANTE')}</button>
                </div>
                <p className="corp-legal-text">
                    {lang === 'en'
                        ? 'I/We declare that the origin of funds and goods linked to the services provided by Panama Tax Lawyers and its associates derive from legitimate sources and without criminal origin.'
                        : 'Declaro que el origen de los fondos y bienes vinculados a los servicios prestados por Panama Tax Lawyers y sus asociados derivan de fuentes legítimas y sin origen delictivo.'
                    }
                </p>
                
                {formData.signers.map((s, i) => (
                    <div key={i} className="corp-signer-row">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '10px', fontWeight: 800, color: TEXT_SECONDARY, letterSpacing: '0.3px' }}>{lang === 'en' ? `SIGNER #${i+1}` : `FIRMANTE #${i+1}`}</span>
                            {formData.signers.length > 1 && (
                                <button onClick={() => removeSigner(i)} className="corp-btn-remove-inline">
                                    <Trash2 size={12} /> {lang === 'en' ? 'REMOVE' : 'ELIMINAR'}
                                </button>
                            )}
                        </div>
                        <PersonSelector
                            people={registeredPeople}
                            onSelectPerson={(person) => handleAutoFillSigner(i, person)}
                            currentName={s.name}
                        />
                        <div className="corp-grid">
                            <div className="corp-field full-width" style={{ position: 'relative' }} ref={el => autocompleteRefs.current[`signer-name-${i}`] = el}>
                                <label>{lang === 'en' ? 'Name of Signer' : 'Nombre del Firmante'}</label>
                                <input 
                                    className="corp-input" 
                                    style={getArrayErrorStyle('signers', i, 'name')} 
                                    value={s.name} 
                                    autoComplete="off"
                                    onChange={e => { updateSigner(i, 'name', e.target.value); searchSigner(e.target.value, i); }} 
                                    onFocus={() => { if (signerSuggestions[i]?.length) setActiveSignerIdx(i); }} 
                                    onBlur={() => handleArrayFieldBlur('signers', i, 'name')} 
                                    placeholder={lang === 'en' ? 'e.g. John Doe' : 'Ej: Pedro Roman Romano'} 
                                />
                                <ArrayFieldError array="signers" index={i} field="name" />
                                {activeSignerIdx === i && signerSuggestions[i]?.length > 0 && (
                                    <div className="corp-autocomplete-dropdown">
                                        {signerSuggestions[i].map((p, j) => (
                                            <div key={j} className="corp-autocomplete-item" onMouseDown={(e) => { e.preventDefault(); selectSignerSuggestion(i, p); }}>
                                                <span className="corp-ac-name">{p.fullName || p.name || ''}</span>
                                                {(p.passport || p.email) && <span className="corp-ac-detail">{[p.passport, p.email].filter(Boolean).join(' • ')}</span>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="corp-field full-width">
                                <label>{lang === 'en' ? 'Signature (Full name)' : 'Firma (Nombre completo)'}</label>
                                <input className="corp-input" style={getArrayErrorStyle('signers', i, 'signature')} value={s.signature} onChange={e => updateSigner(i, 'signature', e.target.value)} onBlur={() => handleArrayFieldBlur('signers', i, 'signature')} placeholder={lang === 'en' ? 'As it appears on ID...' : 'Como aparece en su identificación...'} />
                                <ArrayFieldError array="signers" index={i} field="signature" />
                            </div>
                        </div>
                    </div>
                ))}
                
                <div className="corp-field" style={{ marginTop: '12px' }}>
                    <label>{lang === 'en' ? 'Date of Declaration' : 'Fecha de Declaración'}</label>
                    <input type="date" className="corp-input" style={getErrorStyle('declarationDate')} value={formData.declarationDate} onChange={e => { setFormData({...formData, declarationDate: e.target.value}); if (fieldErrors.declarationDate) { const err = validateField('declarationDate', e.target.value); if (!err) setFieldErrors(prev => { const next = { ...prev }; delete next.declarationDate; return next; }); } }} onBlur={() => handleFieldBlur('declarationDate')} />
                    <FieldError name="declarationDate" />
                </div>
            </div>
        </div>
    );

    return (
        <div className="corp-container">
            <div className="corp-header">
                <div>
                    <h1 className="corp-title">{t('corporacion.title')}</h1>
                    <p className="corp-subtitle">{t('corporacion.subtitle')}</p>
                </div>
                <button onClick={() => onSave(formData)} disabled={saving} className="corp-btn-save">
                    <Save size={16} /> {saving ? t('corporacion.syncing') : t('corporacion.saveProgress')}
                </button>
            </div>

            <div className="standard-step-header">
                <span className="standard-step-title">
                    {step === 1 && `I. ${t('corporacion.steps.societyInfo') || 'Información de la Sociedad'}`}
                    {step === 2 && `II. ${t('corporacion.steps.directors') || 'Junta Directiva'}`}
                    {step === 3 && `III. ${t('corporacion.steps.dignitaries') || 'Dignatarios'}`}
                    {step === 4 && `IV. ${t('corporacion.steps.shareholders') || 'Accionistas'}`}
                    {step === 5 && `V. ${t('corporacion.steps.finalization') || 'Declaración Jurada'}`}
                </span>
                <span className="standard-step-badge">
                    {t('dashboard.stepOf', { step, total: 5 })}
                </span>
            </div>

            <div className="standard-progress-stepper">
                {[1, 2, 3, 4, 5].map(s => (
                    <div key={s} className={`standard-progress-bar ${step >= s ? 'active' : ''}`} />
                ))}
            </div>

            <div className="corp-main-panel">
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
                {step === 4 && renderStep4()}
                {step === 5 && renderStep5()}

                <div className="corp-nav-footer">
                    <button onClick={() => setStep(prev => prev - 1)} disabled={step === 1} className="corp-btn-nav-prev"><ChevronLeft size={16} /> {t('corporacion.previous')}</button>
                    {step < 5 ? (
                        <button onClick={() => setStep(prev => prev + 1)} className="corp-btn-nav-next">{t('corporacion.nextStep')} <ChevronRight size={16} /></button>
                    ) : (
                        <button onClick={handleFinalSave} disabled={saving} className="corp-btn-nav-finish"><CheckCircle2 size={16} /> {saving ? t('corporacion.finalizing') : t('corporacion.registerCorp')}</button>
                    )}
                </div>
            </div>

            <style>{`
                .corp-container { width: 100%; padding: 8px 0 24px; font-family: 'Inter', sans-serif; }
                .corp-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 10px; }
                .corp-title { font-size: 18px; font-weight: 800; color: ${TEXT_PRIMARY}; margin: 0; letter-spacing: -0.5px; }
                .corp-subtitle { font-size: 10px; color: ${TEXT_MUTED}; margin: 2px 0 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; }
                
                .corp-btn-save { padding: 5px 14px; background: white; color: ${ACCENT}; border: 1.5px solid ${ACCENT}; border-radius: 5px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 5px; transition: all 0.15s; font-size: 11px; }
                .corp-btn-save:hover { background: ${ACCENT}; color: white; }

                .standard-step-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; padding: 0 4px; }
                .standard-step-title { font-size: 11px; font-weight: 700; color: ${TEXT_PRIMARY}; text-transform: uppercase; letter-spacing: 0.5px; }
                .standard-step-badge { font-size: 9px; font-weight: 800; color: ${TEXT_MUTED}; background: #f1f5f9; padding: 2px 6px; border-radius: 3px; letter-spacing: 0.5px; }

                .standard-progress-stepper { display: flex; gap: 3px; margin-bottom: 10px; }
                .standard-progress-bar { flex: 1; height: 3px; background: ${BORDER}; border-radius: 3px; transition: all 0.3s ease; }
                .standard-progress-bar.active { background: ${ACCENT}; }

                .corp-main-panel { background: white; border-radius: 8px; padding: 16px 20px; border: 1px solid ${BORDER}; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
                .corp-section-title { font-size: 13px; font-weight: 700; color: ${TEXT_PRIMARY}; margin: 0 0 10px; display: flex; align-items: center; gap: 6px; padding-bottom: 8px; border-bottom: 1px solid ${BORDER}; }
                
                .corp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 10px; }
                .full-width { grid-column: span 2; }
                .corp-field { display: flex; flex-direction: column; gap: 2px; }
                .corp-field label { font-size: 10px; font-weight: 700; color: ${TEXT_MUTED}; letter-spacing: 0.3px; }
                
                .corp-input { width: 100%; padding: 5px 8px; border: 1px solid #cbd5e1; border-radius: 4px; outline: none; font-size: 13px; font-weight: 500; color: ${TEXT_PRIMARY}; transition: all 0.15s; background: ${BG_SUBTLE}; }
                .corp-input:focus { border-color: ${ACCENT}; background: white; box-shadow: 0 0 0 2px rgba(15,118,110,0.08); }

                .corp-hint { font-size: 10px; color: ${TEXT_MUTED}; font-style: italic; font-weight: 500; }
                .corp-hint-box { background: #f1f5f9; border: 1px solid ${BORDER}; color: ${TEXT_SECONDARY}; padding: 6px 10px; border-radius: 5px; font-size: 10px; font-weight: 600; display: flex; align-items: flex-start; gap: 6px; margin-bottom: 8px; line-height: 1.3; }

                .corp-section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
                .corp-btn-add { padding: 4px 10px; background: transparent; color: ${ACCENT}; border: 1px solid ${ACCENT}40; border-radius: 4px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 10px; transition: 0.15s; }
                .corp-btn-add:hover { background: ${ACCENT}; color: white; }

                .corp-card { background: ${BG_SUBTLE}; border: 1px solid ${BORDER}; border-radius: 6px; padding: 12px 12px 10px; position: relative; margin-bottom: 8px; }
                .corp-card-label { position: absolute; top: -7px; left: 12px; background: ${TEXT_SECONDARY}; color: white; font-size: 8px; font-weight: 800; padding: 1px 6px; border-radius: 3px; letter-spacing: 0.3px; }
                .corp-btn-remove { position: absolute; top: 6px; right: 6px; color: #ef4444; background: #fef2f2; border: none; padding: 4px; border-radius: 3px; cursor: pointer; transition: 0.15s; }
                .corp-btn-remove:hover { background: #fee2e2; }

                .corp-declaration-box { background: ${BG_SUBTLE}; border: 1px solid ${BORDER}; border-radius: 6px; padding: 12px; color: ${TEXT_PRIMARY}; margin-top: 10px; }
                .corp-legal-text { font-size: 11px; line-height: 1.4; color: ${TEXT_SECONDARY}; margin-bottom: 8px; font-style: italic; border-left: 3px solid ${BORDER}; padding: 6px 10px; background: #f1f5f9; border-radius: 4px; font-weight: 500; }
                .corp-signer-row { margin-top: 10px; padding: 14px; background: white; border: 1px solid ${BORDER}; border-radius: 6px; position: relative; }
                .corp-btn-remove-inline { color: #ef4444; background: #fef2f2; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 10px; font-weight: 700; display: flex; align-items: center; gap: 4px; }

                .corp-nav-footer { display: flex; justify-content: space-between; margin-top: 14px; padding-top: 10px; border-top: 1px solid ${BORDER}; }
                .corp-btn-nav-prev { padding: 7px 16px; background: ${BG_SUBTLE}; color: ${TEXT_MUTED}; border: 1px solid ${BORDER}; border-radius: 5px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 5px; transition: 0.15s; font-size: 12px; }
                .corp-btn-nav-prev:hover:not(:disabled) { background: #f1f5f9; }
                .corp-btn-nav-next { padding: 7px 16px; background: ${ACCENT}; color: white; border: none; border-radius: 5px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 5px; transition: 0.15s; font-size: 12px; }
                .corp-btn-nav-next:hover { opacity: 0.9; }
                .corp-btn-nav-finish { padding: 7px 16px; background: ${ACCENT}; color: white; border: none; border-radius: 5px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 5px; transition: 0.15s; font-size: 12px; }

                .corp-autocomplete-dropdown { position: absolute; top: 100%; left: 0; right: 0; z-index: 200; background: white; border: 1px solid ${BORDER}; border-radius: 5px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); max-height: 180px; overflow-y: auto; margin-top: 1px; }
                .corp-autocomplete-item { padding: 5px 8px; cursor: pointer; display: flex; flex-direction: column; gap: 1px; border-bottom: 1px solid #f1f5f9; transition: background 0.1s; }
                .corp-autocomplete-item:last-child { border-bottom: none; }
                .corp-autocomplete-item:hover { background: #f1f5f9; }
                .corp-ac-passport { font-size: 11px; font-weight: 700; color: ${TEXT_PRIMARY}; }
                .corp-ac-name { font-size: 10px; color: ${TEXT_MUTED}; font-weight: 500; }
                .corp-ac-detail { font-size: 9px; color: #94a3b8; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            `}</style>
        </div>
    );
};

export default CorporacionForm;
