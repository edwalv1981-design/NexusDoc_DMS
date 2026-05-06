import React from 'react';

const CorporacionPreview = React.forwardRef(({ data }, ref) => {
    if (!data) return null;

    // --- ESPECIFICACIONES TÉCNICAS DE DISEÑO (CALIBRACIÓN 100% ORIGINAL) ---
    const TEAL_PANAMA = '#46a1ba'; // Color exacto del formato original
    const BLUE_LIGHT = '#e7f3f6';  // Azul muy pálido para fondos secundarios
    const BORDER = `1.5px solid ${TEAL_PANAMA}`; // Grosor exacto de líneas
    const FONT_FAMILY = '"Helvetica", Arial, sans-serif';

    const styles = {
        container: {
            width: '210mm',
            backgroundColor: 'white',
            margin: '0 auto',
            padding: '10mm 12mm',
            fontFamily: FONT_FAMILY,
            color: '#000',
            boxSizing: 'border-box',
            lineHeight: '1.2',
            position: 'relative'
        },
        headerArea: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: '15px'
        },
        titleBox: {
            textAlign: 'right',
            color: '#1d4e89', // Color de los títulos en el original
            lineHeight: '1'
        },
        sectionBlue: {
            backgroundColor: TEAL_PANAMA,
            color: 'white',
            padding: '6px 10px',
            fontSize: '13px',
            fontWeight: 'bold',
            marginTop: '12px',
            border: BORDER
        },
        instructionBar: {
            backgroundColor: '#e7f3f6',
            padding: '5px 10px',
            fontSize: '9px',
            fontWeight: 'bold',
            border: BORDER,
            borderTop: 0
        },
        table: {
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '0'
        },
        tdLabel: {
            border: BORDER,
            padding: '3px 8px',
            fontSize: '9.5px',
            fontWeight: 'bold',
            width: '40%',
            backgroundColor: 'white'
        },
        tdValue: {
            border: BORDER,
            padding: '3px 8px',
            fontSize: '10.5px',
            color: '#000',
            fontWeight: '500',
            minHeight: '18px'
        },
        terminationsBox: {
            border: BORDER,
            padding: '6px',
            fontSize: '8px',
            width: '45%',
            marginLeft: '10px',
            backgroundColor: 'white',
            lineHeight: '1.3'
        },
        capitalSocialContainer: {
            display: 'flex',
            marginTop: '12px',
            height: '32px'
        },
        capitalLabel: {
            backgroundColor: TEAL_PANAMA,
            color: 'white',
            padding: '0 12px',
            fontSize: '13px',
            fontWeight: 'bold',
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            border: BORDER
        },
        capitalValueBox: {
            width: '25%',
            border: BORDER,
            borderLeft: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '900',
            fontSize: '13px'
        },
        legalBox: {
            border: BORDER,
            borderTop: 0,
            padding: '5px 10px',
            fontSize: '8px',
            lineHeight: '1.2',
            backgroundColor: 'white',
            fontWeight: 'bold'
        },
        directorBox: {
            border: BORDER,
            pageBreakInside: 'avoid'
        },
        directorHeader: {
            textAlign: 'center',
            fontSize: '12px',
            fontWeight: 'bold',
            padding: '3px',
            borderBottom: BORDER,
            backgroundColor: 'white'
        },
        signatureCellLabel: {
            border: BORDER,
            padding: '8px 12px',
            fontSize: '13px',
            fontWeight: 'bold',
            width: '25%',
            color: '#1d4e89'
        },
        signatureCellValue: {
            border: BORDER,
            padding: '8px 12px',
            fontSize: '14px',
            fontWeight: 'bold'
        }
    };

    const renderRow = (label, value) => (
        <tr>
            <td style={styles.tdLabel}>{label}</td>
            <td style={styles.tdValue}>{value || ''}</td>
        </tr>
    );

    return (
        <div ref={ref} id="corp-document-preview" style={{ backgroundColor: '#f8fafc', padding: '40px 0' }}>
            
            {/* --- PÁGINA 1 --- */}
            <div style={styles.container}>
                <div style={styles.headerArea}>
                    <img src="/logo_panama_tax.png" alt="Logo" style={{ height: '70px' }} />
                    <div style={styles.titleBox}>
                        <div style={{ fontSize: '20px', fontWeight: '800' }}>Incorporation Form</div>
                        <div style={{ fontSize: '18px', fontWeight: '800' }}>Formulario de Incorporación</div>
                    </div>
                </div>

                <div style={styles.sectionBlue}>Name of the corporation / Nombre de la compañía:</div>
                <div style={styles.instructionBar}>
                    List the names you wish to use to incorporate your corporation in order of preference<br/>
                    Listar los nombres que desea utilizar para incorporar su compañía en orden de preferencia:
                </div>

                <div style={{ display: 'flex' }}>
                    <table style={{ ...styles.table, width: '55%' }}>
                        <tbody>
                            {renderRow('1st choice', data.corpNameSA)}
                            {renderRow('2nd choice', data.corpNameCorp)}
                            {renderRow('3rd choice', data.corpNameInc)}
                        </tbody>
                    </table>
                    <div style={styles.terminationsBox}>
                        The name of the Company must be determined by one of the following terminations: Corporation, Incorporated, Société Anonyme, Sociedad Anónima, Corp., Inc., S.A., A/S, N.V., B.V., AG.<br/><br/>
                        El nombre de la Compañía debe terminar con una de las siguientes terminaciones: Corporation, Incorporated, Société Anonyme, Sociedad Anónima, Corp., Inc., o S.A., A/S, N.V., B.V., AG.
                    </div>
                </div>

                <div style={styles.capitalSocialContainer}>
                    <div style={styles.capitalLabel}>Authorized Capital / Capital Social Autorizado:</div>
                    <div style={styles.capitalValueBox}>10.000 USD</div>
                    <div style={{ ...styles.capitalValueBox, color: '#000', backgroundColor: 'white' }}>{data.capitalSocial} USD</div>
                </div>
                <div style={styles.legalBox}>
                    The minimum authorized capital of the company will be US$10,000.00 divided into 100 shares with a par value of US$100.00 each, the shares issued in nominative form.<br/>
                    El capital mínimo autorizado de la sociedad será de US$10,000.00 divididos en 100 acciones con un valor nominal de US$100.00 cada una, las acciones emitidas de forma nominativa.
                </div>

                <div style={styles.sectionBlue}>Directors / directores:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginTop: '10px' }}>
                    {data.directors.map((director, i) => {
                        const isFullWidth = data.directors.length === 1 || (i === 2) || (i > 2 && i % 2 === 0);
                        
                        if (isFullWidth) {
                            return (
                                <div key={i} style={{ ...styles.directorBox, width: '100%', pageBreakInside: 'avoid' }}>
                                    <div style={styles.directorHeader}>Director {i + 1}</div>
                                    <div style={{ display: 'flex' }}>
                                        <table style={{ ...styles.table, width: '50%' }}>
                                            <tbody>
                                                {renderRow('First name / Nombre', director.firstName)}
                                                {renderRow('Middle name / Segundo nombre', director.secondName)}
                                                {renderRow('Surname(s) / Apellidos', director.lastName)}
                                                {renderRow('Date of birth/ Fecha de nacimiento', director.birthDate)}
                                                {renderRow('Marital Status / Estado civil', director.maritalStatus)}
                                                {renderRow('Citizenship / Nacionalidad', director.nationality)}
                                                {renderRow('Passport/Pasaporte', director.passport)}
                                                {renderRow('Phone/Teléfono', director.phone)}
                                                {renderRow('Email', director.email)}
                                            </tbody>
                                        </table>
                                        <div style={{ width: '50%', borderLeft: BORDER }}>
                                            <table style={styles.table}>
                                                <tbody>
                                                    {renderRow('Address / Dirección', director.address)}
                                                    <tr><td style={{ ...styles.tdLabel, textAlign: 'right' }}>City / ciudad</td><td style={styles.tdValue}>{director.city}</td></tr>
                                                    <tr><td style={{ ...styles.tdLabel, textAlign: 'right' }}>Country / Pais</td><td style={styles.tdValue}>{director.country}</td></tr>
                                                </tbody>
                                            </table>
                                            {i === 2 && (
                                                <div style={{ padding: '8px', fontSize: '8px', fontWeight: 'bold', lineHeight: '1.2' }}>
                                                    In PANAMA a minimum of 3 different Directors are required. Could be Individuals or legal entities from any other nationality.<br/><br/>
                                                    En PANAMÁ se requiere un minimo de 3 diferentes directores.Pueden ser individuos o entidades legales de cualquier otra nacionalidad.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div key={i} style={{ ...styles.directorBox, width: 'calc(50% - 8px)', pageBreakInside: 'avoid' }}>
                                <div style={styles.directorHeader}>Director {i + 1}</div>
                                <table style={styles.table}>
                                    <tbody>
                                        {renderRow('First name / Nombre', director.firstName)}
                                        {renderRow('Middle name / Segundo nombre', director.secondName)}
                                        {renderRow('Surname(s) / Apellidos', director.lastName)}
                                        {renderRow('Date of birth/ Fecha de nacimiento', director.birthDate)}
                                        {renderRow('Marital Status / Estado civil', director.maritalStatus)}
                                        {renderRow('Citizenship / Nacionalidad', director.nationality)}
                                        {renderRow('Passport/Pasaporte', director.passport)}
                                        {renderRow('Phone/Teléfono', director.phone)}
                                        {renderRow('Email', director.email)}
                                        {renderRow('Address / Dirección', director.address)}
                                        <tr><td style={{ ...styles.tdLabel, textAlign: 'right', width: '45%' }}>City / ciudad</td><td style={styles.tdValue}>{director.city}</td></tr>
                                        <tr><td style={{ ...styles.tdLabel, textAlign: 'right', width: '45%' }}>Country / Pais</td><td style={styles.tdValue}>{director.country}</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* --- PÁGINA 2 --- */}
            <div style={{ ...styles.container, marginTop: '30px', pageBreakBefore: 'always' }}>
                <div style={styles.headerArea}>
                    <img src="/logo_panama_tax.png" alt="Logo" style={{ height: '70px' }} />
                </div>

                <div style={styles.sectionBlue}>Officers / dignatarios:</div>
                <table style={styles.table}>
                    <thead style={{ fontSize: '8px' }}>
                        <tr>
                            <th style={styles.tdLabel}></th>
                            <th style={styles.tdLabel}>Full name / Nombre completo</th>
                            <th style={styles.tdLabel}>Date of birth / fecha de nacimiento</th>
                            <th style={styles.tdLabel}>Passport/ Pasaporte</th>
                            <th style={styles.tdLabel}>Registration number (if company) / Numero de Registro si es empresa</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[
                            { label: 'PRESIDENT /Presidente', key: 'presidente' },
                            { label: 'SECRETARY / Secretario', key: 'secretario' },
                            { label: 'TREASURER / Tesorero', key: 'tesorero' }
                        ].map((role, idx) => {
                            const d = data.dignitaries[role.key] || {};
                            return (
                                <tr key={idx}>
                                    <td style={{ ...styles.tdLabel, fontSize: '9px' }}>{role.label}</td>
                                    <td style={styles.tdValue}>{d.fullName}</td>
                                    <td style={styles.tdValue}>{d.birthDate}</td>
                                    <td style={styles.tdValue}>{d.passport}</td>
                                    <td style={styles.tdValue}>{d.registrationNumber}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                <div style={styles.sectionBlue}>Shareholders / Accionistas:</div>
                <table style={styles.table}>
                    <thead style={{ fontSize: '7.5px' }}>
                        <tr>
                            <th style={styles.tdLabel}>Share Certificate Number / Numero de certificado</th>
                            <th style={styles.tdLabel}>Share's value / valor por acción</th>
                            <th style={styles.tdLabel}>Number of Shares / Numero de acciones</th>
                            <th style={styles.tdLabel}>Shareholder / Accionista</th>
                            <th style={styles.tdLabel}>Address / dirección</th>
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

                <div style={styles.sectionBlue}>Company Activities / Actividades de la Compañía</div>
                <div style={{ ...styles.instructionBar }}>
                    Please provide an explanation of the corporation's activities, how it will be carried out and in which countries it will be carried out.<br/>
                    Favor proveer una explicación de la actividad de la sociedad, como se realizará y en qué países se llevará a cabo.
                </div>
                <div style={{ border: BORDER, padding: '12px', minHeight: '60px', fontSize: '10.5px', borderTop: 0 }}>
                    {data.companyActivities}
                </div>

                <div style={{ marginTop: '25px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>Declaration</div>
                    <div style={{ fontSize: '10px', fontStyle: 'italic', fontWeight: 'bold', lineHeight: '1.4' }}>
                        I hereby affirm that information given on this application is complete and accurate. I understand that any falsification or ommission will carry legal effects and penalties. I authorize the company to investigate the authenticity of above-mentioned information.
                    </div>
                </div>

                <table style={{ ...styles.table, marginTop: '30px' }}>
                    <tbody>
                        <tr>
                            <td style={styles.signatureCellLabel}>Signature // Firma</td>
                            <td style={styles.signatureCellValue}></td>
                        </tr>
                        <tr>
                            <td style={styles.signatureCellLabel}>Name // Nombre:</td>
                            <td style={styles.signatureCellValue}>{data.declarationName}</td>
                        </tr>
                        <tr>
                            <td style={styles.signatureCellLabel}>Date // Fecha:</td>
                            <td style={{ ...styles.signatureCellValue, fontWeight: 'bold', fontSize: '13px' }}> / / 2025</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
});

export default CorporacionPreview;
