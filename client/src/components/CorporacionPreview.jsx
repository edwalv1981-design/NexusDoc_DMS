import React from 'react';

const CorporacionPreview = React.forwardRef(({ data }, ref) => {
    if (!data) return null;

    // --- CALIBRACIÓN DE GRADO LEGAL (100% FIDELIDAD) ---
    const DARK_TEAL = '#1a6881';   // Color exacto del encabezado original
    const LIGHT_TEAL = '#e7f3f6';  // Color de fondo de instrucciones
    const TEXT_BLUE = '#1d4e89';   // Color de títulos y firmas
    const BORDER_COLOR = '#1a6881';
    const BORDER = `1px solid ${BORDER_COLOR}`; 
    const FONT_FAMILY = '"Helvetica", "Arial", sans-serif';

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
            position: 'relative',
            boxShadow: '0 0 10px rgba(0,0,0,0.1)'
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '15px'
        },
        titleArea: {
            textAlign: 'right',
            color: TEXT_BLUE,
            lineHeight: '1.1'
        },
        sectionHeader: {
            backgroundColor: DARK_TEAL,
            color: 'white',
            padding: '6px 10px',
            fontSize: '13px',
            fontWeight: 'bold',
            marginTop: '12px',
            border: BORDER
        },
        instructionBar: {
            backgroundColor: LIGHT_TEAL,
            padding: '5px 10px',
            fontSize: '9.5px',
            fontWeight: 'bold',
            border: BORDER,
            borderTop: 0,
            lineHeight: '1.3'
        },
        table: {
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '0'
        },
        tdLabel: {
            border: BORDER,
            padding: '3px 8px',
            fontSize: '10px',
            fontWeight: 'bold',
            width: '40%',
            backgroundColor: 'white',
            textAlign: 'left'
        },
        tdValue: {
            border: BORDER,
            padding: '3px 8px',
            fontSize: '11px',
            color: '#000',
            fontWeight: '500',
            minHeight: '20px',
            backgroundColor: 'white'
        },
        terminationsBox: {
            border: BORDER,
            padding: '8px',
            fontSize: '8.5px',
            width: '42%',
            marginLeft: '10px',
            backgroundColor: 'white',
            lineHeight: '1.3',
            fontWeight: 'bold'
        },
        capitalRow: {
            display: 'flex',
            marginTop: '15px',
            height: '35px',
            alignItems: 'stretch'
        },
        capitalLabel: {
            backgroundColor: DARK_TEAL,
            color: 'white',
            padding: '0 12px',
            fontSize: '13px',
            fontWeight: 'bold',
            flex: 2,
            display: 'flex',
            alignItems: 'center',
            border: BORDER
        },
        capitalFixed: {
            width: '20%',
            border: BORDER,
            borderLeft: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '14px',
            backgroundColor: 'white'
        },
        capitalDynamic: {
            width: '25%',
            border: BORDER,
            borderLeft: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '14px',
            backgroundColor: 'white'
        },
        legalBox: {
            border: BORDER,
            borderTop: 0,
            padding: '6px 10px',
            fontSize: '8.5px',
            lineHeight: '1.3',
            backgroundColor: 'white',
            fontWeight: 'bold'
        },
        directorBox: {
            border: BORDER,
            pageBreakInside: 'avoid'
        },
        directorHeader: {
            textAlign: 'center',
            fontSize: '12.5px',
            fontWeight: 'bold',
            padding: '4px',
            borderBottom: BORDER,
            backgroundColor: 'white'
        },
        pageTwoHeader: {
            display: 'flex',
            justifyContent: 'flex-start',
            marginBottom: '20px'
        },
        declarationTitle: {
            fontSize: '15px',
            fontWeight: 'bold',
            color: '#000',
            marginTop: '30px',
            marginBottom: '5px'
        },
        declarationText: {
            fontSize: '10.5px',
            fontStyle: 'italic',
            fontWeight: 'bold',
            lineHeight: '1.4',
            color: '#000'
        },
        signatureTable: {
            width: '100%',
            marginTop: '35px',
            borderCollapse: 'collapse'
        },
        signatureLabel: {
            border: BORDER,
            padding: '10px 15px',
            fontSize: '14px',
            fontWeight: 'bold',
            width: '28%',
            color: TEXT_BLUE,
            backgroundColor: 'white'
        },
        signatureValue: {
            border: BORDER,
            padding: '10px 15px',
            fontSize: '15px',
            fontWeight: 'bold',
            backgroundColor: 'white'
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
                <div style={styles.header}>
                    <img src="/logo_panama_tax.png" alt="Logo" style={{ height: '85px', objectFit: 'contain' }} />
                    <div style={styles.titleArea}>
                        <div style={{ fontSize: '22px', fontWeight: '800' }}>Incorporation Form</div>
                        <div style={{ fontSize: '20px', fontWeight: '800' }}>Formulario de Incorporación</div>
                    </div>
                </div>

                <div style={styles.sectionHeader}>Name of the corporation / Nombre de la compañía:</div>
                <div style={styles.instructionBar}>
                    List the names you wish to use to incorporate your corporation in order of preference<br/>
                    Listar los nombres que desea utilizar para incorporar su compañía en orden de preferencia:
                </div>

                <div style={{ display: 'flex', alignItems: 'stretch' }}>
                    <table style={{ ...styles.table, width: '58%' }}>
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

                <div style={styles.capitalRow}>
                    <div style={styles.capitalLabel}>Authorized Capital / Capital Social Autorizado:</div>
                    <div style={styles.capitalFixed}>10.000 USD</div>
                    <div style={styles.capitalDynamic}>{data.capitalSocial} USD</div>
                </div>
                <div style={styles.legalBox}>
                    The minimum authorized capital of the company will be US$10,000.00 divided into 100 shares with a par value of US$100.00 each, the shares issued in nominative form.<br/>
                    El capital mínimo autorizado de la sociedad será de US$10,000.00 divididos en 100 acciones con un valor nominal de US$100.00 cada una, las acciones emitidas de forma nominativa.
                </div>

                <div style={styles.sectionHeader}>Directors / directores:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginTop: '12px' }}>
                    {data.directors.map((director, i) => {
                        const isSplitLayout = data.directors.length === 1 || (i === 2) || (i > 2 && i % 2 === 0);
                        
                        if (isSplitLayout) {
                            return (
                                <div key={i} style={{ ...styles.directorBox, width: '100%' }}>
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
                                                    <tr><td style={styles.tdLabel}>City / ciudad</td><td style={styles.tdValue}>{director.city}</td></tr>
                                                    <tr><td style={styles.tdLabel}>Country / Pais</td><td style={styles.tdValue}>{director.country}</td></tr>
                                                </tbody>
                                            </table>
                                            {i === 2 && (
                                                <div style={{ padding: '10px', fontSize: '8.5px', fontWeight: 'bold', lineHeight: '1.3' }}>
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
                            <div key={i} style={{ ...styles.directorBox, width: 'calc(50% - 8px)' }}>
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
                                        {renderRow('City / ciudad', director.city)}
                                        {renderRow('Country / Pais', director.country)}
                                    </tbody>
                                </table>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* --- PÁGINA 2 --- */}
            <div style={{ ...styles.container, marginTop: '30px', pageBreakBefore: 'always' }}>
                <div style={styles.pageTwoHeader}>
                    <img src="/logo_panama_tax.png" alt="Logo" style={{ height: '85px', objectFit: 'contain' }} />
                </div>

                <div style={styles.sectionHeader}>Officers / dignatarios:</div>
                <table style={styles.table}>
                    <thead style={{ fontSize: '8.5px' }}>
                        <tr>
                            <th style={{ ...styles.tdLabel, width: '20%' }}></th>
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

                <div style={styles.sectionHeader}>Shareholders / Accionistas:</div>
                <table style={styles.table}>
                    <thead style={{ fontSize: '8px' }}>
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

                <div style={styles.sectionHeader}>Company Activities / Actividades de la Compañía</div>
                <div style={styles.instructionBar}>
                    Please provide an explanation of the corporation's activities, how it will be carried out and in which countries it will be carried out.<br/>
                    Favor proveer una explicación de la actividad de la sociedad, como se realizará y en qué países se llevará a cabo.
                </div>
                <div style={{ border: BORDER, padding: '12px', minHeight: '80px', fontSize: '11px', borderTop: 0, backgroundColor: 'white' }}>
                    {data.companyActivities}
                </div>

                <div style={styles.declarationTitle}>Declaration</div>
                <div style={styles.declarationText}>
                    I hereby affirm that information given on this application is complete and accurate. I understand that any falsification or ommission will carry legal effects and penalties. I authorize the company to investigate the authenticity of above-mentioned information.
                </div>

                <table style={styles.signatureTable}>
                    <tbody>
                        <tr>
                            <td style={styles.signatureLabel}>Signature // Firma</td>
                            <td style={styles.signatureValue}></td>
                        </tr>
                        <tr>
                            <td style={styles.signatureLabel}>Name // Nombre:</td>
                            <td style={styles.signatureValue}>{data.declarationName}</td>
                        </tr>
                        <tr>
                            <td style={styles.signatureLabel}>Date // Fecha:</td>
                            <td style={{ ...styles.signatureValue, fontSize: '14px' }}> / / 2025</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
});

export default CorporacionPreview;
