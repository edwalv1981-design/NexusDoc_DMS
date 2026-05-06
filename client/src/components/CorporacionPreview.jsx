import React from 'react';

const CorporacionPreview = React.forwardRef(({ data }, ref) => {
    if (!data) return null;

    const PRIMARY = '#0070c0';
    
    const styles = {
        container: {
            width: '210mm',
            backgroundColor: 'white',
            margin: '0 auto',
            fontFamily: '"Helvetica", Arial, sans-serif',
            color: '#333',
            boxSizing: 'border-box',
            padding: '10mm 15mm'
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            borderBottom: `3px solid ${PRIMARY}`,
            paddingBottom: '10px'
        },
        sectionHeader: {
            backgroundColor: PRIMARY,
            color: 'white',
            padding: '8px 12px',
            fontSize: '13px',
            fontWeight: 'bold',
            marginTop: '25px',
            marginBottom: '10px',
            textTransform: 'uppercase',
            borderRadius: '2px'
        },
        table: {
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '15px',
            fontSize: '10px'
        },
        cellLabel: {
            border: '1px solid #cbd5e1',
            padding: '7px',
            backgroundColor: '#f8fafc',
            width: '30%',
            fontWeight: 'bold',
            color: '#475569'
        },
        cellValue: {
            border: '1px solid #cbd5e1',
            padding: '7px',
            width: '70%',
            color: '#1e293b'
        },
        // Regla crítica: evita que un bloque se corte entre dos páginas de PDF
        breakableBlock: {
            pageBreakInside: 'avoid',
            breakInside: 'avoid',
            marginBottom: '15px'
        },
        directorGrid: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '15px',
            marginBottom: '15px'
        }
    };

    const renderDirectorBox = (d, index) => (
        <div key={index} style={{ ...styles.breakableBlock, border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ backgroundColor: '#f1f5f9', padding: '6px 12px', fontSize: '10px', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0', color: PRIMARY }}>
                DIRECTOR #{index + 1}
            </div>
            <table style={{ ...styles.table, marginBottom: 0 }}>
                <tbody>
                    <tr><td style={styles.cellLabel}>Nombre(s)</td><td style={styles.cellValue}>{d.firstName} {d.secondName}</td></tr>
                    <tr><td style={styles.cellLabel}>Apellidos</td><td style={styles.cellValue}>{d.lastName}</td></tr>
                    <tr><td style={styles.cellLabel}>Estado Civil</td><td style={styles.cellValue}>{d.maritalStatus}</td></tr>
                    <tr><td style={styles.cellLabel}>Nacionalidad</td><td style={styles.cellValue}>{d.nationality}</td></tr>
                    <tr><td style={styles.cellLabel}>Pasaporte/ID</td><td style={styles.cellValue}>{d.passport}</td></tr>
                    <tr><td style={styles.cellLabel}>Ciudad/País</td><td style={styles.cellValue}>{d.city}, {d.country}</td></tr>
                    <tr><td style={styles.cellLabel}>Dirección</td><td style={styles.cellValue}>{d.address}</td></tr>
                </tbody>
            </table>
        </div>
    );

    return (
        <div ref={ref} id="corp-document-preview" style={{ backgroundColor: '#f8fafc', padding: '20px 0' }}>
            <div style={styles.container}>
                
                {/* --- ENCABEZADO --- */}
                <div style={styles.header}>
                    <img src="/logo_panama_tax.png" alt="Logo" style={{ height: '60px' }} />
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: '900', color: PRIMARY, fontSize: '20px', letterSpacing: '-0.5px' }}>Incorporation Form</div>
                        <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 'bold' }}>Formulario de Incorporación</div>
                    </div>
                </div>

                {/* --- SECCIÓN 1: IDENTIDAD (ESTÁTICA) --- */}
                <div style={styles.breakableBlock}>
                    <div style={styles.sectionHeader}>1. COMPANY IDENTITY / IDENTIDAD DE LA COMPAÑÍA</div>
                    <table style={styles.table}>
                        <tbody>
                            <tr><td style={styles.cellLabel}>1st Choice (S.A.)</td><td style={styles.cellValue}>{data.corpNameSA}</td></tr>
                            <tr><td style={styles.cellLabel}>2nd Choice (Corp.)</td><td style={styles.cellValue}>{data.corpNameCorp}</td></tr>
                            <tr><td style={styles.cellLabel}>3rd Choice (Inc.)</td><td style={styles.cellValue}>{data.corpNameInc}</td></tr>
                        </tbody>
                    </table>

                    <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: PRIMARY, color: 'white', padding: '8px 15px', fontSize: '13px', fontWeight: 'bold', borderRadius: '2px' }}>
                        <span>CAPITAL SOCIAL AUTORIZADO (AUTHORIZED CAPITAL)</span>
                        <span>$ {data.capitalSocial} USD</span>
                    </div>
                </div>

                {/* --- SECCIÓN 2: DIRECTORES (FLUJO CONTINUO) --- */}
                <div style={styles.sectionHeader}>2. BOARD OF DIRECTORS / JUNTA DIRECTIVA</div>
                
                {/* Los directores se renderizan en pares mientras quepan, luego en lista continua */}
                <div style={styles.directorGrid}>
                    {data.directors.map((d, i) => renderDirectorBox(d, i))}
                </div>

                {/* --- SECCIÓN 3: DIGNATARIOS (SE EMPUJA HACIA ABAJO) --- */}
                <div style={styles.breakableBlock}>
                    <div style={styles.sectionHeader}>3. DIGNITARIES / DIGNATARIOS</div>
                    <table style={styles.table}>
                        <thead style={{ backgroundColor: '#f1f5f9' }}>
                            <tr>
                                <th style={{ ...styles.cellLabel, width: '20%' }}>CARGO</th>
                                <th style={styles.cellLabel}>NOMBRE COMPLETO</th>
                                <th style={{ ...styles.cellLabel, width: '15%' }}>F. NAC.</th>
                                <th style={{ ...styles.cellLabel, width: '15%' }}>PASAPORTE</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(data.dignitaries).map(([role, d]) => (
                                <tr key={role}>
                                    <td style={{ ...styles.cellValue, fontWeight: 'bold', textTransform: 'uppercase', color: PRIMARY }}>{role}</td>
                                    <td style={styles.cellValue}>{d.fullName}</td>
                                    <td style={styles.cellValue}>{d.birthDate}</td>
                                    <td style={styles.cellValue}>{d.passport}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* --- SECCIÓN 4: ACCIONISTAS (FLUJO CONTINUO) --- */}
                <div style={styles.breakableBlock}>
                    <div style={styles.sectionHeader}>4. SHAREHOLDERS / ACCIONISTAS</div>
                    <table style={styles.table}>
                        <thead style={{ backgroundColor: '#f1f5f9' }}>
                            <tr>
                                <th style={{ ...styles.cellLabel, width: '10%' }}>CERT.</th>
                                <th style={{ ...styles.cellLabel, width: '12%' }}>VALOR</th>
                                <th style={{ ...styles.cellLabel, width: '10%' }}>ACC.</th>
                                <th style={styles.cellLabel}>NOMBRE COMPLETO</th>
                                <th style={styles.cellLabel}>DIRECCIÓN</th>
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
                </div>

                {/* --- SECCIÓN 5: DECLARACIÓN Y FIRMA (SIEMPRE AL FINAL) --- */}
                <div style={styles.breakableBlock}>
                    <div style={styles.sectionHeader}>5. DECLARATION & SIGNATURE / DECLARACIÓN Y FIRMA</div>
                    <div style={{ fontSize: '11px', lineHeight: '1.6', marginBottom: '30px', color: '#475569', textAlign: 'justify', padding: '0 10px' }}>
                        {data.companyActivities || 'No se especificaron actividades adicionales.'}
                    </div>

                    <div style={{ marginTop: '60px', display: 'flex', justifyContent: 'space-between', padding: '0 10px' }}>
                        <div style={{ width: '55%', borderTop: '1.5px solid #1e293b', paddingTop: '8px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e293b' }}>{data.declarationName || '_________________________________'}</div>
                            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>Signature of applicant / Firma del solicitante</div>
                        </div>
                        <div style={{ width: '35%', borderTop: '1.5px solid #1e293b', paddingTop: '8px' }}>
                            <div style={{ fontSize: '12px', color: '#1e293b' }}>{data.declarationDate}</div>
                            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>Date / Fecha</div>
                        </div>
                    </div>
                </div>

                {/* PIE DE PÁGINA INFORMATIVO */}
                <div style={{ marginTop: '50px', borderTop: '1px solid #e2e8f0', paddingTop: '10px', textAlign: 'center', fontSize: '9px', color: '#94a3b8' }}>
                    Documento generado dinámicamente por NexusDoc DMS - Panama Tax Lawyers © 2026
                </div>
            </div>
        </div>
    );
});

export default CorporacionPreview;
