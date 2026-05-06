import React from 'react';

const CorporacionPreview = React.forwardRef(({ data }, ref) => {
    if (!data) return null;

    // Colores y Constantes de Diseño Master
    const BLUE_MAIN = '#0070c0'; // Azul Corporativo Panama Tax
    const LIGHT_GREY = '#f1f5f9';
    const BORDER_COLOR = '#cbd5e1';

    const styles = {
        container: {
            width: '210mm',
            backgroundColor: 'white',
            margin: '0 auto',
            padding: '12mm 15mm',
            fontFamily: '"Helvetica", Arial, sans-serif',
            color: '#1e293b',
            boxSizing: 'border-box',
            lineHeight: '1.2',
            fontSize: '10px'
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '15px',
            borderBottom: `2.5px solid ${BLUE_MAIN}`,
            paddingBottom: '10px'
        },
        blueHeader: {
            backgroundColor: BLUE_MAIN,
            color: 'white',
            padding: '8px 12px',
            fontSize: '13px',
            fontWeight: '900',
            marginTop: '20px',
            textTransform: 'uppercase',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        },
        table: {
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '12px'
        },
        labelCell: {
            border: `1px solid ${BORDER_COLOR}`,
            padding: '5px 8px',
            backgroundColor: '#f8fafc',
            width: '35%',
            fontWeight: 'bold',
            fontSize: '9.5px',
            color: '#475569'
        },
        valueCell: {
            border: `1px solid ${BORDER_COLOR}`,
            padding: '5px 8px',
            fontSize: '10px',
            color: '#000',
            fontWeight: '500'
        },
        instructionText: {
            fontSize: '9.5px',
            color: '#64748b',
            fontStyle: 'italic',
            marginBottom: '8px',
            marginTop: '5px'
        },
        infoBox: {
            backgroundColor: '#e2e8f0',
            padding: '8px',
            fontSize: '8px',
            color: '#334155',
            lineHeight: '1.3',
            border: `1px solid ${BORDER_COLOR}`,
            width: '40%',
            marginLeft: '15px'
        },
        legalPara: {
            fontSize: '8.5px',
            color: '#475569',
            lineHeight: '1.4',
            padding: '8px 0',
            borderBottom: `1px solid ${BORDER_COLOR}`
        },
        directorBox: {
            border: `1.5px solid ${BORDER_COLOR}`,
            marginBottom: '10px',
            pageBreakInside: 'avoid'
        },
        directorTitle: {
            textAlign: 'center',
            fontWeight: 'bold',
            padding: '4px',
            fontSize: '11px',
            borderBottom: `1px solid ${BORDER_COLOR}`,
            backgroundColor: 'white'
        },
        noticeBox: {
            fontSize: '9px',
            color: '#334155',
            lineHeight: '1.4',
            padding: '10px',
            backgroundColor: '#f8fafc',
            border: `1px dashed ${BLUE_MAIN}`
        }
    };

    const renderRow = (label, value) => (
        <tr>
            <td style={styles.labelCell}>{label}</td>
            <td style={styles.valueCell}>{value || ''}</td>
        </tr>
    );

    return (
        <div ref={ref} id="corp-document-preview" style={{ backgroundColor: '#f1f5f9', padding: '50px 0' }}>
            <div style={styles.container}>
                
                {/* --- HEADER --- */}
                <div style={styles.header}>
                    <img src="/logo_panama_tax.png" alt="Logo" style={{ height: '60px' }} />
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '20px', fontWeight: '900', color: BLUE_MAIN }}>Incorporation Form</div>
                        <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#64748b' }}>Formulario de Incorporación</div>
                    </div>
                </div>

                {/* --- SECCIÓN 1: NOMBRE --- */}
                <div style={styles.blueHeader}>Name of the corporation / Nombre de la compañía:</div>
                <div style={styles.instructionText}>
                    List the names you wish to use to incorporate your corporation in order of preference<br/>
                    Listar los nombres que desea utilizar para incorporar su compañía en orden de preferencia:
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <table style={{ ...styles.table, width: '60%', marginBottom: 0 }}>
                        <tbody>
                            {renderRow('1st choice / Primera opción', data.corpNameSA)}
                            {renderRow('2nd choice / Segunda opción', data.corpNameCorp)}
                            {renderRow('3rd choice / Tercera opción', data.corpNameInc)}
                        </tbody>
                    </table>
                    <div style={styles.infoBox}>
                        The name of the Company must be determined by one of the following terminations: Corporation, Incorporated, Société Anonyme, Sociedad Anónima, Corp., Inc., S.A., A/S, N.V., B.V., AG.<br/><br/>
                        El nombre de la Compañía debe terminar con una de las siguientes terminaciones: Corp., Inc., o S.A., A/S, N.V., B.V., AG.
                    </div>
                </div>

                {/* --- SECCIÓN 2: CAPITAL SOCIAL --- */}
                <div style={{ ...styles.blueHeader, marginTop: '25px', display: 'grid', gridTemplateColumns: '1fr auto', padding: 0 }}>
                    <div style={{ padding: '8px 12px' }}>Authorized Capital / Capital Social Autorizado:</div>
                    <div style={{ backgroundColor: 'white', color: 'black', padding: '8px 40px', fontWeight: '900', fontSize: '15px' }}>
                        {data.capitalSocial || '10.000'} USD
                    </div>
                </div>
                <div style={styles.legalPara}>
                    The minimum authorized capital of the company will be US$10,000.00 divided into 100 shares with a par value of US$100.00 each, the shares issued in nominative form.<br/>
                    El capital mínimo autorizado de la sociedad será de US$10,000.00 divididos en 100 acciones con un valor nominal de US$100.00 cada una, las acciones emitidas de forma nominativa.
                </div>

                {/* --- SECCIÓN 3: DIRECTORES (GRID 1 y 2) --- */}
                <div style={styles.blueHeader}>Directors / directores:</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '10px' }}>
                    {[0, 1].map(idx => {
                        const d = data.directors[idx] || {};
                        return (
                            <div key={idx} style={styles.directorBox}>
                                <div style={styles.directorTitle}>Director {idx + 1}</div>
                                <table style={{ ...styles.table, marginBottom: 0 }}>
                                    <tbody>
                                        {renderRow('First name / Nombre', d.firstName)}
                                        {renderRow('Middle name / Segundo nombre', d.secondName)}
                                        {renderRow('Surname(s) / Apellidos', d.lastName)}
                                        {renderRow('Date of birth / Fecha de nacimiento', d.birthDate)}
                                        {renderRow('Marital Status / Estado civil', d.maritalStatus)}
                                        {renderRow('Citizenship / Nacionalidad', d.nationality)}
                                        {renderRow('Passport/Pasaporte', d.passport)}
                                        {renderRow('Phone/Teléfono', d.phone)}
                                        {renderRow('Email', d.email)}
                                        {renderRow('Address / Dirección', d.address)}
                                        {renderRow('City / ciudad', d.city)}
                                        {renderRow('Country / País', d.country)}
                                    </tbody>
                                </table>
                            </div>
                        );
                    })}
                </div>

                {/* --- DIRECTOR 3 (ESPECIAL) --- */}
                {data.directors[2] && (
                    <div style={{ ...styles.directorBox, marginTop: '10px' }}>
                        <div style={styles.directorTitle}>Director 3</div>
                        <div style={{ display: 'flex' }}>
                            <table style={{ ...styles.table, width: '50%', marginBottom: 0 }}>
                                <tbody>
                                    {renderRow('First name / Nombre', data.directors[2].firstName)}
                                    {renderRow('Middle name / Segundo nombre', data.directors[2].secondName)}
                                    {renderRow('Surname(s) / Apellidos', data.directors[2].lastName)}
                                    {renderRow('Date of birth / Fecha de nacimiento', data.directors[2].birthDate)}
                                    {renderRow('Marital Status / Estado civil', data.directors[2].maritalStatus)}
                                    {renderRow('Citizenship / Nacionalidad', data.directors[2].nationality)}
                                    {renderRow('Passport/Pasaporte', data.directors[2].passport)}
                                    {renderRow('Phone/Teléfono', data.directors[2].phone)}
                                    {renderRow('Email', data.directors[2].email)}
                                </tbody>
                            </table>
                            <div style={{ width: '50%', borderLeft: `1px solid ${BORDER_COLOR}` }}>
                                <table style={{ ...styles.table, marginBottom: 0 }}>
                                    <tbody>
                                        {renderRow('Address / Dirección', data.directors[2].address)}
                                        {renderRow('City / ciudad', data.directors[2].city)}
                                        {renderRow('Country / País', data.directors[2].country)}
                                    </tbody>
                                </table>
                                <div style={styles.noticeBox}>
                                    In PANAMA a <b>minimum of 3 different Directors</b> are required. Could be Individuals or legal entities from any other nationality. To add more directors request another page.<br/><br/>
                                    En PANAMÁ se requiere un <b>mínimo de 3 diferentes directores</b>. Pueden ser individuos o entidades legales de cualquier otra nacionalidad. Para incluir más directores solicite otra página.
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- PÁGINA 2: DIGNATARIOS Y ACCIONISTAS --- */}
                <div style={{ pageBreakBefore: 'always', marginTop: '30px' }}>
                    <div style={styles.blueHeader}>Dignitaries / Dignatarios</div>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.labelCell}>Role / Cargo</th>
                                <th style={styles.labelCell}>Full Name / Nombre Completo</th>
                                <th style={styles.labelCell}>Birth Date / F. Nac.</th>
                                <th style={styles.labelCell}>Passport / Pasaporte</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(data.dignitaries).map(([role, d]) => (
                                <tr key={role}>
                                    <td style={{ ...styles.valueCell, fontWeight: 'bold', textTransform: 'uppercase' }}>{role}</td>
                                    <td style={styles.valueCell}>{d.fullName}</td>
                                    <td style={styles.valueCell}>{d.birthDate}</td>
                                    <td style={styles.valueCell}>{d.passport}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div style={styles.blueHeader}>Shareholders / Accionistas</div>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={{ ...styles.labelCell, width: '10%' }}>Cert.</th>
                                <th style={{ ...styles.labelCell, width: '12%' }}>Value/Valor</th>
                                <th style={{ ...styles.labelCell, width: '10%' }}>Shares</th>
                                <th style={styles.labelCell}>Full Name / Nombre</th>
                                <th style={styles.labelCell}>Address / Dirección</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.shareholders.map((s, i) => (
                                <tr key={i}>
                                    <td style={styles.valueCell}>{s.certificate}</td>
                                    <td style={styles.valueCell}>{s.value}</td>
                                    <td style={styles.valueCell}>{s.shares}</td>
                                    <td style={styles.valueCell}>{s.name}</td>
                                    <td style={styles.valueCell}>{s.address}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div style={styles.blueHeader}>Declaration / Declaración Jurada</div>
                    <div style={{ ...styles.legalPara, padding: '15px', border: `1px solid ${BORDER_COLOR}`, minHeight: '60px' }}>
                        {data.companyActivities || 'No especificado.'}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '60px' }}>
                        <div style={{ width: '60%', borderTop: '2px solid black', paddingTop: '5px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{data.declarationName || '_________________________________'}</div>
                            <div style={{ fontSize: '10px', color: '#64748b' }}>Signature of applicant / Firma del solicitante</div>
                        </div>
                        <div style={{ width: '30%', borderTop: '2px solid black', paddingTop: '5px' }}>
                            <div style={{ fontSize: '12px' }}>{data.declarationDate}</div>
                            <div style={{ fontSize: '10px', color: '#64748b' }}>Date / Fecha</div>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '50px', textAlign: 'center', fontSize: '8px', color: '#94a3b8', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                    Document generated by NexusDoc DMS for Panama Tax Lawyers. All rights reserved.
                </div>
            </div>
        </div>
    );
});

export default CorporacionPreview;
