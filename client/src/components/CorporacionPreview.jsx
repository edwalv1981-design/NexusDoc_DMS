import React from 'react';

const CorporacionPreview = React.forwardRef(({ data }, ref) => {
    if (!data) return null;

    // --- CÓDIGOS DE COLOR EXTRAÍDOS POR CROMATOGRAFÍA DEL ORIGINAL ---
    const PTL_TEAL = '#46a1ba';    // Turquesa de los encabezados
    const PTL_BLUE = '#1d4e89';    // Azul de los títulos
    const PTL_LIGHT = '#e7f3f6';   // Fondo de instrucciones
    const BORDER = `1px solid ${PTL_TEAL}`;

    const styles = {
        page: {
            width: '210mm',
            minHeight: '297mm',
            backgroundColor: 'white',
            margin: '0 auto',
            padding: '10mm 12mm',
            fontFamily: 'Arial, Helvetica, sans-serif',
            boxSizing: 'border-box',
            color: '#000',
            position: 'relative'
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: '15px'
        },
        titleArea: {
            textAlign: 'right',
            color: PTL_BLUE,
            lineHeight: '1.1'
        },
        sectionHeader: {
            backgroundColor: PTL_TEAL,
            color: 'white',
            padding: '5px 12px',
            fontSize: '13px',
            fontWeight: 'bold',
            marginTop: '12px',
            border: BORDER
        },
        instructionBar: {
            backgroundColor: PTL_LIGHT,
            padding: '5px 12px',
            fontSize: '9px',
            fontWeight: 'bold',
            border: BORDER,
            borderTop: 0,
            lineHeight: '1.2'
        },
        nameTableContainer: {
            display: 'flex',
            alignItems: 'stretch',
            border: BORDER,
            borderTop: 0
        },
        nameTable: {
            width: '58%',
            borderCollapse: 'collapse'
        },
        nameTdLabel: {
            border: `1px solid ${PTL_TEAL}`,
            padding: '4px 10px',
            fontSize: '10px',
            fontWeight: 'bold',
            width: '35%',
            textAlign: 'center'
        },
        nameTdValue: {
            border: `1px solid ${PTL_TEAL}`,
            padding: '4px 10px',
            fontSize: '11px',
            fontWeight: '500'
        },
        terminationsBox: {
            width: '42%',
            padding: '8px',
            fontSize: '8px',
            fontWeight: 'bold',
            borderLeft: BORDER,
            lineHeight: '1.3'
        },
        capitalSocialGrid: {
            display: 'flex',
            height: '35px',
            border: BORDER,
            borderTop: 0
        },
        capitalLabel: {
            backgroundColor: PTL_TEAL,
            color: 'white',
            width: '50%',
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            fontSize: '13px',
            fontWeight: 'bold'
        },
        capitalFixed: {
            width: '25%',
            borderLeft: BORDER,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            fontWeight: 'bold'
        },
        capitalValue: {
            width: '25%',
            borderLeft: BORDER,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            fontWeight: 'bold'
        },
        legalFooter: {
            border: BORDER,
            borderTop: 0,
            padding: '5px 12px',
            fontSize: '8px',
            fontWeight: 'bold',
            lineHeight: '1.2'
        },
        directorTable: {
            width: '100%',
            borderCollapse: 'collapse',
            marginTop: '12px',
            border: BORDER
        },
        directorHeader: {
            textAlign: 'center',
            fontSize: '12px',
            fontWeight: 'bold',
            padding: '3px',
            borderBottom: BORDER
        },
        directorRow: {
            borderBottom: `1px solid ${PTL_TEAL}`
        },
        directorLabel: {
            padding: '3px 10px',
            fontSize: '9.5px',
            fontWeight: 'bold',
            width: '40%',
            borderRight: `1px solid ${PTL_TEAL}`
        },
        directorValue: {
            padding: '3px 10px',
            fontSize: '10.5px'
        },
        directorSplitCell: {
            width: '50%',
            verticalAlign: 'top'
        },
        signatureArea: {
            marginTop: '30px'
        },
        signatureRow: {
            display: 'flex',
            border: BORDER,
            borderTop: 0,
            height: '35px'
        },
        signatureLabel: {
            width: '25%',
            borderRight: BORDER,
            padding: '0 12px',
            display: 'flex',
            alignItems: 'center',
            fontSize: '13px',
            fontWeight: 'bold',
            color: PTL_BLUE
        },
        signatureValue: {
            flex: 1,
            padding: '0 12px',
            display: 'flex',
            alignItems: 'center',
            fontSize: '14px',
            fontWeight: 'bold'
        }
    };

    return (
        <div ref={ref} id="corp-document-preview" style={{ backgroundColor: '#f1f5f9', padding: '40px 0' }}>
            
            {/* PÁGINA 1 */}
            <div style={styles.page}>
                <div style={styles.header}>
                    <img src="/logo_panama_tax.png" alt="Logo" style={{ height: '75px' }} />
                    <div style={styles.titleArea}>
                        <div style={{ fontSize: '20px', fontWeight: 'bold' }}>Incorporation Form</div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>Formulario de Incorporación</div>
                    </div>
                </div>

                <div style={styles.sectionHeader}>Name of the corporation / Nombre de la compañía:</div>
                <div style={styles.instructionBar}>
                    List the names you wish to use to incorporate your corporation in order of preference<br/>
                    Listar los nombres que desea utilizar para incorporar su compañía en orden de preferencia:
                </div>
                
                <div style={styles.nameTableContainer}>
                    <table style={styles.nameTable}>
                        <tbody>
                            <tr>
                                <td style={styles.nameTdLabel}>1<sup>st</sup> choice</td>
                                <td style={styles.nameTdValue}>{data.corpNameSA}</td>
                            </tr>
                            <tr>
                                <td style={styles.nameTdLabel}>2<sup>nd</sup> choice</td>
                                <td style={styles.nameTdValue}>{data.corpNameCorp}</td>
                            </tr>
                            <tr>
                                <td style={styles.nameTdLabel}>3<sup>rd</sup> choice</td>
                                <td style={styles.nameTdValue}>{data.corpNameInc}</td>
                            </tr>
                        </tbody>
                    </table>
                    <div style={styles.terminationsBox}>
                        The name of the Company must be determined by one of the following terminations: Corporation, Incorporated, Société Anonyme, Sociedad Anónima, Corp., Inc., S.A., A/S, N.V., B.V., AG.<br/><br/>
                        El nombre de la Compañía debe terminar con una de las siguientes terminaciones: Corporation, Incorporated, Société Anonyme, Sociedad Anónima, Corp., Inc., o S.A., A/S, N.V., B.V., AG.
                    </div>
                </div>

                <div style={styles.capitalSocialGrid}>
                    <div style={styles.capitalLabel}>Authorized Capital / Capital Social Autorizado:</div>
                    <div style={styles.capitalFixed}>10.000 USD</div>
                    <div style={styles.capitalValue}>{data.capitalSocial} USD</div>
                </div>
                <div style={styles.legalFooter}>
                    The minimum authorized capital of the company will be US$10,000.00 divided into 100 shares with a par value of US$100.00 each, the shares issued in nominative form.<br/>
                    El capital mínimo autorizado de la sociedad será de US$10,000.00 divididos en 100 acciones con un valor nominal de US$100.00 cada una, las acciones emitidas de forma nominativa.
                </div>

                <div style={styles.sectionHeader}>Directors / directores:</div>
                
                <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                    {[0, 1].map(i => (
                        <div key={i} style={{ width: 'calc(50% - 7.5px)', border: BORDER }}>
                            <div style={styles.directorHeader}>Director {i + 1}</div>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <tbody>
                                    {['First name / Nombre', 'Middle name / Segundo nombre', 'Surname(s) / Apellidos', 'Date of birth/ Fecha de nacimiento', 'Marital Status / Estado civil', 'Citizenship / Nacionalidad', 'Passport/Pasaporte', 'Phone/Teléfono', 'Email', 'Address / Dirección', 'City / ciudad', 'Country / Pais'].map((field, idx) => {
                                        const keys = ['firstName', 'secondName', 'lastName', 'birthDate', 'maritalStatus', 'nationality', 'passport', 'phone', 'email', 'address', 'city', 'country'];
                                        return (
                                            <tr key={idx} style={{ borderBottom: idx === 11 ? '0' : `1px solid ${PTL_TEAL}` }}>
                                                <td style={{ ...styles.directorLabel, width: '45%' }}>{field}</td>
                                                <td style={styles.directorValue}>{data.directors[i]?.[keys[idx]] || ''}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>

                {data.directors.length >= 3 && (
                    <div style={{ border: BORDER, marginTop: '15px' }}>
                        <div style={styles.directorHeader}>Director 3</div>
                        <div style={{ display: 'flex' }}>
                            <table style={{ width: '50%', borderCollapse: 'collapse', borderRight: BORDER }}>
                                <tbody>
                                    {['First name / Nombre', 'Middle name / Segundo nombre', 'Surname(s) / Apellidos', 'Date of birth/ Fecha de nacimiento', 'Marital Status / Estado civil', 'Citizenship / Nacionalidad', 'Passport/Pasaporte', 'Phone/Teléfono', 'Email'].map((field, idx) => {
                                        const keys = ['firstName', 'secondName', 'lastName', 'birthDate', 'maritalStatus', 'nationality', 'passport', 'phone', 'email'];
                                        return (
                                            <tr key={idx} style={{ borderBottom: idx === 8 ? '0' : `1px solid ${PTL_TEAL}` }}>
                                                <td style={styles.directorLabel}>{field}</td>
                                                <td style={styles.directorValue}>{data.directors[2]?.[keys[idx]] || ''}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            <div style={{ width: '50%' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <tbody>
                                        {['Address / Dirección', 'City / ciudad', 'Country / Pais'].map((field, idx) => {
                                            const keys = ['address', 'city', 'country'];
                                            return (
                                                <tr key={idx} style={{ borderBottom: `1px solid ${PTL_TEAL}` }}>
                                                    <td style={{ ...styles.directorLabel, width: '40%' }}>{field}</td>
                                                    <td style={styles.directorValue}>{data.directors[2]?.[keys[idx]] || ''}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                <div style={{ padding: '8px', fontSize: '7.5px', fontWeight: 'bold', lineHeight: '1.2' }}>
                                    In PANAMA a minimum of 3 different Directors are required. Could be Individuals or legal entities from any other nationality. To add more directors request another page.<br/><br/>
                                    En PANAMÁ se requiere un minimo de 3 diferentes directores.Pueden ser individuos o entidades legales de cualquier otra nacionalidad. Para incluir mas directores solicite otra pagina.
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* PÁGINA 2 */}
            <div style={{ ...styles.page, marginTop: '30px', pageBreakBefore: 'always' }}>
                <img src="/logo_panama_tax.png" alt="Logo" style={{ height: '75px', marginBottom: '15px' }} />
                
                <div style={styles.sectionHeader}>Officers / dignatarios:</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: BORDER, fontSize: '8px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#fff' }}>
                            <th style={styles.nameTdLabel}></th>
                            <th style={styles.nameTdLabel}>Full name / Nombre completo</th>
                            <th style={styles.nameTdLabel}>Date of birth / fecha de nacimiento</th>
                            <th style={styles.nameTdLabel}>Passport/ Pasaporte</th>
                            <th style={styles.nameTdLabel}>Registration number (if company) / Numero de Registro si es empresa</th>
                        </tr>
                    </thead>
                    <tbody>
                        {['presidente', 'secretario', 'tesorero'].map((role, idx) => (
                            <tr key={idx} style={{ borderTop: `1px solid ${PTL_TEAL}` }}>
                                <td style={{ ...styles.nameTdLabel, fontSize: '9px', textAlign: 'left' }}>{role.toUpperCase()} / {role === 'presidente' ? 'Presidente' : role === 'secretario' ? 'Secretario' : 'Tesorero'}</td>
                                <td style={styles.nameTdValue}>{data.dignitaries[role]?.fullName}</td>
                                <td style={styles.nameTdValue}>{data.dignitaries[role]?.birthDate}</td>
                                <td style={styles.nameTdValue}>{data.dignitaries[role]?.passport}</td>
                                <td style={styles.nameTdValue}>{data.dignitaries[role]?.registrationNumber}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div style={styles.sectionHeader}>Shareholders / Accionistas:</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: BORDER, fontSize: '8px' }}>
                    <thead>
                        <tr>
                            <th style={styles.nameTdLabel}>Share Certificate Number</th>
                            <th style={styles.nameTdLabel}>Share's value / valor por acción</th>
                            <th style={styles.nameTdLabel}>Number of Shares</th>
                            <th style={styles.nameTdLabel}>Shareholder / Accionista</th>
                            <th style={styles.nameTdLabel}>Address / dirección</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.shareholders.map((s, i) => (
                            <tr key={i} style={{ borderTop: `1px solid ${PTL_TEAL}` }}>
                                <td style={styles.nameTdValue}>{s.certificate}</td>
                                <td style={styles.nameTdValue}>{s.value}</td>
                                <td style={styles.nameTdValue}>{s.shares}</td>
                                <td style={styles.nameTdValue}>{s.name}</td>
                                <td style={styles.nameTdValue}>{s.address}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div style={styles.sectionHeader}>Company Activities / Actividades de la Compañía</div>
                <div style={styles.instructionBar}>
                    Please provide an explanation of the corporation's activities, how it will be carried out and in which countries it will be carried out.<br/>
                    Favor proveer una explicación de la actividad de la sociedad, como se realizará y en qué países se llevará a cabo.
                </div>
                <div style={{ border: BORDER, borderTop: 0, padding: '10px', minHeight: '80px', fontSize: '11px' }}>
                    {data.companyActivities}
                </div>

                <div style={{ marginTop: '25px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>Declaration</div>
                    <div style={{ fontSize: '10px', fontStyle: 'italic', fontWeight: 'bold', marginTop: '5px' }}>
                        I hereby affirm that information given on this application is complete and accurate. I understand that any falsification or ommission will carry legal effects and penalties. I authorize the company to investigate the authenticity of above-mentioned information.
                    </div>
                </div>

                <div style={{ ...styles.signatureArea, borderTop: BORDER }}>
                    <div style={styles.signatureRow}>
                        <div style={styles.signatureLabel}>Signature // Firma</div>
                        <div style={styles.signatureValue}></div>
                    </div>
                    <div style={styles.signatureRow}>
                        <div style={styles.signatureLabel}>Name // Nombre:</div>
                        <div style={styles.signatureValue}>{data.declarationName}</div>
                    </div>
                    <div style={styles.signatureRow}>
                        <div style={styles.signatureLabel}>Date // Fecha:</div>
                        <div style={styles.signatureValue}> / / 2025</div>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default CorporacionPreview;
