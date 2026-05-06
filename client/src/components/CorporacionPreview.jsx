import React from 'react';

const CorporacionPreview = React.forwardRef(({ data }, ref) => {
    if (!data) return null;

    // Constantes de Diseño Master (Extraídas de las imágenes originales)
    const BLUE_PANAMA = '#0070c0';
    const BLUE_LIGHT = '#e2e8f0';
    const BORDER_STYLE = `1px solid ${BLUE_PANAMA}`;
    const TEXT_COLOR = '#000';

    const styles = {
        container: {
            width: '210mm',
            backgroundColor: 'white',
            margin: '0 auto',
            padding: '10mm 12mm',
            fontFamily: '"Helvetica", Arial, sans-serif',
            color: TEXT_COLOR,
            boxSizing: 'border-box',
            lineHeight: '1.2'
        },
        headerArea: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px'
        },
        mainTitle: {
            textAlign: 'right',
            color: BLUE_PANAMA,
            margin: 0
        },
        sectionBlue: {
            backgroundColor: BLUE_PANAMA,
            color: 'white',
            padding: '7px 10px',
            fontSize: '12px',
            fontWeight: 'bold',
            marginTop: '15px'
        },
        instructionRow: {
            backgroundColor: '#a5d1e1',
            padding: '5px 10px',
            fontSize: '8.5px',
            fontWeight: 'bold',
            color: '#000'
        },
        table: {
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '10px'
        },
        cellLabel: {
            border: BORDER_STYLE,
            padding: '4px 8px',
            fontSize: '9px',
            fontWeight: 'bold',
            backgroundColor: 'white',
            width: '35%'
        },
        cellValue: {
            border: BORDER_STYLE,
            padding: '4px 8px',
            fontSize: '9.5px',
            color: '#000',
            minHeight: '18px'
        },
        terminationsBox: {
            border: BORDER_STYLE,
            padding: '6px',
            fontSize: '7.5px',
            width: '45%',
            marginLeft: '10px',
            backgroundColor: 'white',
            lineHeight: '1.3'
        },
        capitalGrid: {
            display: 'grid',
            gridTemplateColumns: '1.5fr 1fr 1fr',
            border: BORDER_STYLE,
            marginTop: '0'
        },
        capitalCell: {
            padding: '6px 10px',
            fontSize: '11px',
            fontWeight: '900',
            borderRight: BORDER_STYLE,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        },
        directorGrid: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '15px',
            marginTop: '10px'
        },
        signatureTable: {
            width: '100%',
            borderCollapse: 'collapse',
            marginTop: '20px'
        },
        signatureRow: {
            height: '35px',
            border: BORDER_STYLE
        }
    };

    const renderRow = (label, value) => (
        <tr>
            <td style={styles.cellLabel}>{label}</td>
            <td style={styles.cellValue}>{value || ''}</td>
        </tr>
    );

    return (
        <div ref={ref} id="corp-document-preview" style={{ backgroundColor: '#f1f5f9', padding: '40px 0' }}>
            
            {/* PÁGINA 1 */}
            <div style={styles.container}>
                <div style={styles.headerArea}>
                    <img src="/logo_panama_tax.png" alt="Logo" style={{ height: '55px' }} />
                    <div style={styles.mainTitle}>
                        <div style={{ fontSize: '18px', fontWeight: '900' }}>Incorporation Form</div>
                        <div style={{ fontSize: '16px', fontWeight: '900' }}>Formulario de Incorporación</div>
                    </div>
                </div>

                <div style={styles.sectionBlue}>Name of the corporation / Nombre de la compañía:</div>
                <div style={styles.instructionRow}>
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

                <div style={{ ...styles.sectionBlue, marginBottom: 0 }}>Authorized Capital / Capital Social Autorizado:</div>
                <div style={styles.capitalGrid}>
                    <div style={{ ...styles.capitalCell, backgroundColor: 'white', borderRight: 0 }}></div>
                    <div style={{ ...styles.capitalCell, backgroundColor: 'white', borderLeft: BORDER_STYLE }}>10.000 USD</div>
                    <div style={{ ...styles.capitalCell, backgroundColor: 'white', borderLeft: BORDER_STYLE }}>{data.capitalSocial} USD</div>
                </div>
                <div style={{ fontSize: '8px', padding: '5px', border: BORDER_STYLE, borderTop: 0 }}>
                    The minimum authorized capital of the company will be US$10,000.00 divided into 100 shares with a par value of US$100.00 each, the shares issued in nominative form.<br/>
                    El capital mínimo autorizado de la sociedad será de US$10,000.00 divididos en 100 acciones con un valor nominal de US$100.00 cada una, las acciones emitidas de forma nominativa.
                </div>

                <div style={styles.sectionBlue}>Directors / directores:</div>
                <div style={styles.directorGrid}>
                    {[0, 1].map(i => (
                        <div key={i} style={{ border: BORDER_STYLE }}>
                            <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: 'bold', padding: '3px', borderBottom: BORDER_STYLE }}>Director {i+1}</div>
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
                                    <tr><td style={{ ...styles.cellLabel, textAlign: 'right' }}>City / ciudad</td><td style={styles.cellValue}>{data.directors[i]?.city}</td></tr>
                                    <tr><td style={{ ...styles.cellLabel, textAlign: 'right' }}>Country / Pais</td><td style={styles.cellValue}>{data.directors[i]?.country}</td></tr>
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>

                <div style={{ border: BORDER_STYLE, marginTop: '10px' }}>
                    <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: 'bold', padding: '3px', borderBottom: BORDER_STYLE }}>Director 3</div>
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
                        <div style={{ width: '50%', borderLeft: BORDER_STYLE }}>
                            <table style={{ ...styles.table, marginBottom: 0 }}>
                                <tbody>
                                    {renderRow('Address / Dirección', data.directors[2]?.address)}
                                    <tr><td style={{ ...styles.cellLabel, textAlign: 'right' }}>City / ciudad</td><td style={styles.cellValue}>{data.directors[2]?.city}</td></tr>
                                    <tr><td style={{ ...styles.cellLabel, textAlign: 'right' }}>Country / Pais</td><td style={styles.cellValue}>{data.directors[2]?.country}</td></tr>
                                </tbody>
                            </table>
                            <div style={{ padding: '8px', fontSize: '8.5px', fontWeight: 'bold' }}>
                                In PANAMA a minimum of 3 different Directors are required. Could be Individuals or legal entities from any other nationality. To add more directors request another page.<br/><br/>
                                En PANAMÁ se requiere un minimo de 3 diferentes directores.Pueden ser individuos o entidades legales de cualquier otra nacionalidad. Para incluir mas directores solicite otra pagina.
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* PÁGINA 2 */}
            <div style={{ ...styles.container, marginTop: '20px' }}>
                <div style={styles.headerArea}>
                    <img src="/logo_panama_tax.png" alt="Logo" style={{ height: '55px' }} />
                </div>

                <div style={styles.sectionBlue}>Officers / dignatarios:</div>
                <table style={styles.table}>
                    <thead style={{ backgroundColor: 'white', fontSize: '8px' }}>
                        <tr>
                            <th style={{ ...styles.cellLabel, width: '25%' }}></th>
                            <th style={styles.cellLabel}>Full name / Nombre completo</th>
                            <th style={styles.cellLabel}>Date of birth / fecha de nacimiento</th>
                            <th style={styles.cellLabel}>Passport/ Pasaporte</th>
                            <th style={styles.cellLabel}>Registration number (if company) / Numero de Registro si es empresa</th>
                        </tr>
                    </thead>
                    <tbody>
                        {['PRESIDENT /Presidente', 'SECRETARY / Secretario', 'TREASURER / Tesorero'].map((role, idx) => {
                            const key = role.split(' ')[0].toLowerCase();
                            const d = data.dignitaries[key] || {};
                            return (
                                <tr key={idx}>
                                    <td style={{ ...styles.cellLabel, fontSize: '9px' }}>{role}</td>
                                    <td style={styles.cellValue}>{d.fullName}</td>
                                    <td style={styles.cellValue}>{d.birthDate}</td>
                                    <td style={styles.cellValue}>{d.passport}</td>
                                    <td style={styles.cellValue}>{d.registrationNumber}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                <div style={styles.sectionBlue}>Shareholders / Accionistas:</div>
                <table style={styles.table}>
                    <thead style={{ fontSize: '7.5px' }}>
                        <tr>
                            <th style={styles.cellLabel}>Share Certificate Number / Numero de certificado</th>
                            <th style={styles.cellLabel}>Share's value / valor por acción</th>
                            <th style={styles.cellLabel}>Number of Shares / Numero de acciones</th>
                            <th style={styles.cellLabel}>Shareholder / Accionista</th>
                            <th style={styles.cellLabel}>Address / dirección</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.shareholders.map((s, i) => (
                            <tr key={i}>
                                <td style={styles.cellValue}>{s.certificate}</td>
                                <td style={styles.cellValue}>{s.value}</td>
                                <td style={styles.cellValue}>{s.shares}</td>
                                <td style={styles.cellValue}>{s.name}</td>
                                <td style={styles.cellValue}>{s.address}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div style={styles.sectionBlue}>Company Activities / Actividades de la Compañía</div>
                <div style={{ ...styles.instructionRow, backgroundColor: '#a5d1e1' }}>
                    Please provide an explanation of the corporation's activities, how it will be carried out and in which countries it will be carried out.<br/>
                    Favor proveer una explicación de la actividad de la sociedad, como se realizará y en qué países se llevará a cabo.
                </div>
                <div style={{ border: BORDER_STYLE, padding: '10px', minHeight: '60px', fontSize: '9.5px' }}>
                    {data.companyActivities}
                </div>

                <div style={{ marginTop: '20px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold' }}>Declaration</div>
                    <div style={{ fontSize: '10px', fontStyle: 'italic', fontWeight: 'bold', marginTop: '5px' }}>
                        I hereby affirm that information given on this application is complete and accurate. I understand that any falsification or ommission will carry legal effects and penalties. I authorize the company to investigate the authenticity of above-mentioned information.
                    </div>
                </div>

                <table style={styles.signatureTable}>
                    <tbody>
                        <tr>
                            <td style={{ ...styles.cellLabel, width: '30%' }}>Signature // Firma</td>
                            <td style={styles.cellValue}></td>
                        </tr>
                        <tr>
                            <td style={styles.cellLabel}>Name // Nombre:</td>
                            <td style={{ ...styles.cellValue, fontWeight: 'bold' }}>{data.declarationName}</td>
                        </tr>
                        <tr>
                            <td style={styles.cellLabel}>Date // Fecha:</td>
                            <td style={styles.cellValue}> / / 2025</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
});

export default CorporacionPreview;
