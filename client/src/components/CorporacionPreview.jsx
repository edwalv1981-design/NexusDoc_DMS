import React from 'react';

const CorporacionPreview = React.forwardRef(({ data }, ref) => {
    if (!data) return null;

    // Colores Exactos de la Identidad Visual
    const COLOR_PRIMARY = '#0070c0'; // Azul Institucional
    const COLOR_TEXT = '#1e293b';
    const COLOR_LABEL = '#475569';
    const COLOR_BG_CELL = '#f8fafc';
    const COLOR_BORDER = '#cbd5e1';

    const styles = {
        container: {
            width: '210mm',
            backgroundColor: 'white',
            margin: '0 auto',
            padding: '12mm 15mm',
            fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
            color: COLOR_TEXT,
            boxSizing: 'border-box',
            lineHeight: '1.4'
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            borderBottom: `2.5px solid ${COLOR_PRIMARY}`,
            paddingBottom: '12px'
        },
        titleMain: {
            margin: 0,
            fontSize: '22px',
            fontWeight: '900',
            color: COLOR_PRIMARY,
            textAlign: 'right',
            textTransform: 'uppercase'
        },
        titleSub: {
            margin: 0,
            fontSize: '15px',
            color: '#64748b',
            textAlign: 'right',
            fontWeight: 'bold'
        },
        sectionTitle: {
            backgroundColor: COLOR_PRIMARY,
            color: 'white',
            padding: '10px 14px',
            fontSize: '14px',
            fontWeight: '900',
            marginTop: '25px',
            marginBottom: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
        },
        subInstructions: {
            fontSize: '11px',
            color: '#64748b',
            fontStyle: 'italic',
            marginBottom: '10px',
            paddingLeft: '5px'
        },
        table: {
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '15px'
        },
        th: {
            border: `1px solid ${COLOR_BORDER}`,
            padding: '8px',
            backgroundColor: '#f1f5f9',
            fontSize: '10px',
            fontWeight: 'bold',
            textAlign: 'left',
            color: COLOR_LABEL
        },
        tdLabel: {
            border: `1px solid ${COLOR_BORDER}`,
            padding: '8px',
            backgroundColor: COLOR_BG_CELL,
            width: '32%',
            fontSize: '11px',
            fontWeight: 'bold',
            color: COLOR_LABEL
        },
        tdValue: {
            border: `1px solid ${COLOR_BORDER}`,
            padding: '8px',
            fontSize: '11px',
            color: COLOR_TEXT,
            fontWeight: '500'
        },
        // Bloque dinámico de Director
        directorBox: {
            pageBreakInside: 'avoid',
            breakInside: 'avoid',
            marginBottom: '15px',
            border: `1.5px solid ${COLOR_BORDER}`,
            borderRadius: '2px'
        },
        directorHeader: {
            backgroundColor: '#f1f5f9',
            padding: '6px 12px',
            fontSize: '11px',
            fontWeight: 'bold',
            color: COLOR_PRIMARY,
            borderBottom: `1px solid ${COLOR_BORDER}`
        },
        capitalRow: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: COLOR_PRIMARY,
            color: 'white',
            padding: '10px 15px',
            fontSize: '14px',
            fontWeight: 'bold',
            marginTop: '10px',
            borderRadius: '2px'
        },
        signatureArea: {
            marginTop: '60px',
            display: 'flex',
            justifyContent: 'space-between',
            pageBreakInside: 'avoid'
        },
        footerText: {
            marginTop: '40px',
            textAlign: 'center',
            fontSize: '9px',
            color: '#94a3b8',
            borderTop: '1px solid #e2e8f0',
            paddingTop: '15px'
        }
    };

    const renderField = (label, value) => (
        <tr>
            <td style={styles.tdLabel}>{label}</td>
            <td style={styles.tdValue}>{value || ''}</td>
        </tr>
    );

    return (
        <div ref={ref} id="corp-document-preview" style={{ backgroundColor: '#f1f5f9', padding: '40px 0' }}>
            <div style={styles.container}>
                
                {/* --- HEADER --- */}
                <div style={styles.header}>
                    <img src="/logo_panama_tax.png" alt="Logo" style={{ height: '65px' }} />
                    <div>
                        <h1 style={styles.titleMain}>Incorporation Form</h1>
                        <h2 style={styles.titleSub}>Formulario de Incorporación</h2>
                    </div>
                </div>

                {/* --- SECCIÓN 1: NOMBRE --- */}
                <div style={styles.sectionTitle}>Name of the corporation / Nombre de la compañía</div>
                <div style={styles.subInstructions}>List the names you wish to use to incorporate your corporation in order of preference</div>
                <table style={styles.table}>
                    <tbody>
                        {renderField('1st choice / Primera opción (S.A.)', data.corpNameSA)}
                        {renderField('2nd choice / Segunda opción (Corp.)', data.corpNameCorp)}
                        {renderField('3rd choice / Tercera opción (Inc.)', data.corpNameInc)}
                    </tbody>
                </table>

                {/* --- CAPITAL SOCIAL --- */}
                <div style={styles.capitalRow}>
                    <span>AUTHORIZED CAPITAL / CAPITAL SOCIAL AUTORIZADO:</span>
                    <span>$ {data.capitalSocial || '10,000.00'} USD</span>
                </div>

                {/* --- SECCIÓN 2: DIRECTORES (CRECIMIENTO DINÁMICO) --- */}
                <div style={styles.sectionTitle}>Directors / Directores</div>
                <div style={styles.subInstructions}>A minimum of 3 different Directors are required. Puede incluir más directores si es necesario.</div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    {data.directors.map((d, i) => (
                        <div key={i} style={styles.directorBox}>
                            <div style={styles.directorHeader}>DIRECTOR #{i + 1}</div>
                            <table style={{ ...styles.table, marginBottom: 0 }}>
                                <tbody>
                                    {renderField('First name / Nombre', d.firstName)}
                                    {renderField('Middle name / Segundo nombre', d.secondName)}
                                    {renderField('Surname(s) / Apellidos', d.lastName)}
                                    {renderField('Date of birth / Fecha de nacimiento', d.birthDate)}
                                    {renderField('Marital Status / Estado civil', d.maritalStatus)}
                                    {renderField('Citizenship / Nacionalidad', d.nationality)}
                                    {renderField('Passport / Pasaporte', d.passport)}
                                    {renderField('City / Ciudad', d.city)}
                                    {renderField('Country / País', d.country)}
                                    {renderField('Address / Dirección', d.address)}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>

                {/* --- SECCIÓN 3: DIGNATARIOS --- */}
                <div style={{ ...styles.breakableBlock, marginTop: '20px' }}>
                    <div style={styles.sectionTitle}>Dignitaries / Dignatarios</div>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>CARGO (ROLE)</th>
                                <th style={styles.th}>NOMBRE COMPLETO (FULL NAME)</th>
                                <th style={styles.th}>F. NACIMIENTO</th>
                                <th style={styles.th}>PASAPORTE</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(data.dignitaries).map(([role, d]) => (
                                <tr key={role}>
                                    <td style={{ ...styles.tdValue, fontWeight: 'bold', textTransform: 'uppercase', backgroundColor: '#f8fafc', color: COLOR_PRIMARY }}>{role}</td>
                                    <td style={styles.tdValue}>{d.fullName}</td>
                                    <td style={styles.tdValue}>{d.birthDate}</td>
                                    <td style={styles.tdValue}>{d.passport}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* --- SECCIÓN 4: ACCIONISTAS --- */}
                <div style={styles.breakableBlock}>
                    <div style={styles.sectionTitle}>Shareholders / Accionistas</div>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={{ ...styles.th, width: '8%' }}>CERT.</th>
                                <th style={{ ...styles.th, width: '12%' }}>VALOR</th>
                                <th style={{ ...styles.th, width: '10%' }}>ACC.</th>
                                <th style={styles.th}>NOMBRE COMPLETO</th>
                                <th style={styles.th}>DIRECCIÓN RESIDENCIAL</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.shareholders.map((s, i) => (
                                <tr key={i}>
                                    <td style={styles.tdValue}>{s.certificate}</td>
                                    <td style={styles.tdValue}>{s.value}</td>
                                    <td style={styles.tdValue}>{s.shares}</td>
                                    <td style={styles.tdValue}>{s.name}</td>
                                    <td style={styles.tdValue}>{s.address}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* --- SECCIÓN 5: ACTIVIDADES Y FIRMA --- */}
                <div style={styles.breakableBlock}>
                    <div style={styles.sectionTitle}>Company Activities / Actividades de la Compañía</div>
                    <div style={{ padding: '10px', fontSize: '11px', color: COLOR_TEXT, border: `1px solid ${COLOR_BORDER}`, minHeight: '60px', marginBottom: '20px', textAlign: 'justify' }}>
                        {data.companyActivities || 'No especificado.'}
                    </div>

                    <div style={styles.signatureArea}>
                        <div style={{ width: '55%', borderTop: '2px solid black', paddingTop: '10px' }}>
                            <div style={{ fontSize: '12px', fontWeight: '900' }}>{data.declarationName || '_________________________________'}</div>
                            <div style={{ fontSize: '10px', color: COLOR_LABEL }}>Signature of applicant / Firma del solicitante</div>
                        </div>
                        <div style={{ width: '35%', borderTop: '2px solid black', paddingTop: '10px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{data.declarationDate}</div>
                            <div style={{ fontSize: '10px', color: COLOR_LABEL }}>Date / Fecha</div>
                        </div>
                    </div>
                </div>

                <div style={styles.footerText}>
                    Panama Tax Lawyers - Experts in Corporate and Legal Solutions. 
                    This document is a faithful replica generated by NexusDoc DMS.
                </div>
            </div>
        </div>
    );
});

export default CorporacionPreview;
