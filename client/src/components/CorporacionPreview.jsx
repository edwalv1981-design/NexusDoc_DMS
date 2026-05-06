import React from 'react';

const CorporacionPreview = React.forwardRef(({ data }, ref) => {
    if (!data) return null;

    // --- ESPECIFICACIONES TÉCNICAS DE DISEÑO (IDENTIDAD 100%) ---
    const BLUE_PANAMA = '#0070c0';
    const BLUE_INSTRUCTION = '#a5d1e1';
    const BORDER = `1px solid ${BLUE_PANAMA}`;
    const FONT_FAMILY = '"Helvetica", Arial, sans-serif';

    const styles = {
        container: {
            width: '210mm',
            backgroundColor: 'white',
            margin: '0 auto',
            padding: '12mm 15mm',
            fontFamily: FONT_FAMILY,
            color: '#000',
            boxSizing: 'border-box',
            lineHeight: '1.1',
            position: 'relative'
        },
        headerArea: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px'
        },
        titleBox: {
            textAlign: 'right',
            color: BLUE_PANAMA
        },
        sectionBlue: {
            backgroundColor: BLUE_PANAMA,
            color: 'white',
            padding: '8px 10px',
            fontSize: '12px',
            fontWeight: 'bold',
            marginTop: '15px',
            border: BORDER
        },
        instructionBar: {
            backgroundColor: BLUE_INSTRUCTION,
            padding: '6px 10px',
            fontSize: '8.5px',
            fontWeight: 'bold',
            border: BORDER,
            borderTop: 0
        },
        table: {
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '10px'
        },
        tdLabel: {
            border: BORDER,
            padding: '5px 8px',
            fontSize: '9.5px',
            fontWeight: 'bold',
            width: '35%'
        },
        tdValue: {
            border: BORDER,
            padding: '5px 8px',
            fontSize: '10px',
            color: '#000',
            fontWeight: '500',
            minHeight: '20px'
        },
        terminationsBox: {
            border: BORDER,
            padding: '8px',
            fontSize: '8px',
            width: '45%',
            marginLeft: '10px',
            backgroundColor: 'white',
            lineHeight: '1.4'
        },
        capitalSocialContainer: {
            display: 'flex',
            marginTop: '15px',
            height: '35px'
        },
        capitalLabel: {
            backgroundColor: BLUE_PANAMA,
            color: 'white',
            padding: '0 12px',
            fontSize: '12px',
            fontWeight: 'bold',
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            border: BORDER
        },
        capitalValueBox: {
            width: '22%',
            border: BORDER,
            borderLeft: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '900',
            fontSize: '12px'
        },
        legalBox: {
            border: BORDER,
            borderTop: 0,
            padding: '6px 10px',
            fontSize: '8.5px',
            lineHeight: '1.4',
            backgroundColor: 'white'
        },
        directorBox: {
            border: BORDER,
            pageBreakInside: 'avoid'
        },
        directorHeader: {
            textAlign: 'center',
            fontSize: '11px',
            fontWeight: 'bold',
            padding: '4px',
            borderBottom: BORDER,
            backgroundColor: 'white'
        },
        signatureCellLabel: {
            border: BORDER,
            padding: '10px',
            fontSize: '11px',
            fontWeight: 'bold',
            width: '30%'
        },
        signatureCellValue: {
            border: BORDER,
            padding: '10px',
            fontSize: '12px',
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
        <div ref={ref} id="corp-document-preview" style={{ backgroundColor: '#f1f5f9', padding: '40px 0' }}>
            
            {/* --- PÁGINA 1 --- */}
            <div style={styles.container}>
                <div style={styles.headerArea}>
                    <img src="/logo_panama_tax.png" alt="Logo" style={{ height: '60px' }} />
                    <div style={styles.titleBox}>
                        <div style={{ fontSize: '18px', fontWeight: '900' }}>Incorporation Form</div>
                        <div style={{ fontSize: '16px', fontWeight: '900' }}>Formulario de Incorporación</div>
                    </div>
                </div>

                <div style={styles.sectionBlue}>Name of the corporation / Nombre de la compañía:</div>
                <div style={styles.instructionBar}>
                    List the names you wish to use to incorporate your corporation in order of preference<br/>
                    Listar los nombres que desea utilizar para incorporar su compañía en orden de preferencia:
                </div>

                <div style={{ display: 'flex', marginTop: '0' }}>
                    <table style={{ ...styles.table, width: '55%', marginBottom: 0 }}>
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
                    <div style={{ ...styles.capitalValueBox, color: '#000' }}>{data.capitalSocial} USD</div>
                </div>
                <div style={styles.legalBox}>
                    The minimum authorized capital of the company will be US$10,000.00 divided into 100 shares with a par value of US$100.00 each, the shares issued in nominative form.<br/>
                    El capital mínimo autorizado de la sociedad será de US$10,000.00 divididos en 100 acciones con un valor nominal de US$100.00 cada una, las acciones emitidas de forma nominativa.
                </div>

                <div style={styles.sectionBlue}>Directors / directores:</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '10px' }}>
                    {[0, 1].map(i => (
                        <div key={i} style={styles.directorBox}>
                            <div style={styles.directorHeader}>Director {i+1}</div>
                            <table style={{ ...styles.table, marginBottom: 0 }}>
                                <tbody>
                                    {renderRow('First name / Nombre', data.directors[i]?.firstName)}
                                    {renderRow('Middle name / Segundo nombre', data.directors[i]?.secondName)}
                                    {renderRow('Surname(s) / Apellidos', data.directors[i]?.lastName)}
                                    {renderRow('Date of birth/ Fecha de nacimiento', data.directors[i]?.birthDate)}
                                    {renderRow('Marital Status / Estado civil', data.directors[i]?.maritalStatus)}
                                    {renderRow('Citizenship / Nacionalidad', data.directors[i]?.nationality)}
                                    {renderRow('Passport/Pasaporte', data.directors[i]?.passport)}
                                    {renderRow('Phone/Teléfono', data.directors[i]?.phone)}
                                    {renderRow('Email', data.directors[i]?.email)}
                                    {renderRow('Address / Dirección', data.directors[i]?.address)}
                                    <tr><td style={{ ...styles.tdLabel, textAlign: 'right' }}>City / ciudad</td><td style={styles.tdValue}>{data.directors[i]?.city}</td></tr>
                                    <tr><td style={{ ...styles.tdLabel, textAlign: 'right' }}>Country / Pais</td><td style={styles.tdValue}>{data.directors[i]?.country}</td></tr>
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>

                <div style={{ ...styles.directorBox, marginTop: '10px' }}>
                    <div style={styles.directorHeader}>Director 3</div>
                    <div style={{ display: 'flex' }}>
                        <table style={{ ...styles.table, width: '50%', marginBottom: 0 }}>
                            <tbody>
                                {renderRow('First name / Nombre', data.directors[2]?.firstName)}
                                {renderRow('Middle name / Segundo nombre', data.directors[2]?.secondName)}
                                {renderRow('Surname(s) / Apellidos', data.directors[2]?.lastName)}
                                {renderRow('Date of birth/ Fecha de nacimiento', data.directors[2]?.birthDate)}
                                {renderRow('Marital Status / Estado civil', data.directors[2]?.maritalStatus)}
                                {renderRow('Citizenship / Nacionalidad', data.directors[2]?.nationality)}
                                {renderRow('Passport/Pasaporte', data.directors[2]?.passport)}
                                {renderRow('Phone/Teléfono', data.directors[2]?.phone)}
                                {renderRow('Email', data.directors[2]?.email)}
                            </tbody>
                        </table>
                        <div style={{ width: '50%', borderLeft: BORDER }}>
                            <table style={{ ...styles.table, marginBottom: 0 }}>
                                <tbody>
                                    {renderRow('Address / Dirección', data.directors[2]?.address)}
                                    <tr><td style={{ ...styles.tdLabel, textAlign: 'right' }}>City / ciudad</td><td style={styles.tdValue}>{data.directors[2]?.city}</td></tr>
                                    <tr><td style={{ ...styles.tdLabel, textAlign: 'right' }}>Country / Pais</td><td style={styles.tdValue}>{data.directors[2]?.country}</td></tr>
                                </tbody>
                            </table>
                            <div style={{ padding: '10px', fontSize: '8.5px', fontWeight: 'bold', lineHeight: '1.3' }}>
                                In PANAMA a minimum of 3 different Directors are required. Could be Individuals or legal entities from any other nationality. To add more directors request another page.<br/><br/>
                                En PANAMÁ se requiere un minimo de 3 diferentes directores.Pueden ser individuos o entidades legales de cualquier otra nacionalidad. Para incluir mas directores solicite otra pagina.
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- PÁGINA 2 --- */}
            <div style={{ ...styles.container, marginTop: '30px', pageBreakBefore: 'always' }}>
                <div style={styles.headerArea}>
                    <img src="/logo_panama_tax.png" alt="Logo" style={{ height: '60px' }} />
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
                <div style={{ ...styles.instructionBar, backgroundColor: '#a5d1e1' }}>
                    Please provide an explanation of the corporation's activities, how it will be carried out and in which countries it will be carried out.<br/>
                    Favor proveer una explicación de la actividad de la sociedad, como se realizará y en qué países se llevará a cabo.
                </div>
                <div style={{ border: BORDER, padding: '12px', minHeight: '80px', fontSize: '10px' }}>
                    {data.companyActivities}
                </div>

                <div style={{ marginTop: '25px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Declaration</div>
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
                            <td style={{ ...styles.signatureCellValue, fontWeight: 'normal' }}> / / 2025</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
});

export default CorporacionPreview;
