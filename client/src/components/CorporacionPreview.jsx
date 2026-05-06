import React from 'react';

const CorporacionPreview = React.forwardRef(({ data }, ref) => {
    if (!data) return null;

    const PRIMARY = '#0070c0';
    
    // Configuración de estilos base
    const styles = {
        page: {
            width: '210mm',
            minHeight: '297mm',
            padding: '15mm',
            backgroundColor: 'white',
            margin: '0 auto',
            fontFamily: '"Helvetica", Arial, sans-serif',
            color: '#333',
            boxSizing: 'border-box',
            position: 'relative',
            pageBreakAfter: 'always', // Fuerza el salto de página en el PDF
            borderBottom: '1px solid #f1f5f9'
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '15px',
            borderBottom: `2px solid ${PRIMARY}`,
            paddingBottom: '10px'
        },
        sectionHeader: {
            backgroundColor: PRIMARY,
            color: 'white',
            padding: '6px 10px',
            fontSize: '12px',
            fontWeight: 'bold',
            marginTop: '15px',
            marginBottom: '8px',
            textTransform: 'uppercase'
        },
        table: {
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '10px',
            fontSize: '9px'
        },
        cellLabel: {
            border: '1px solid #cbd5e1',
            padding: '5px',
            backgroundColor: '#f8fafc',
            width: '35%',
            fontWeight: 'bold'
        },
        cellValue: {
            border: '1px solid #cbd5e1',
            padding: '5px',
            width: '65%'
        },
        directorGrid: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px'
        }
    };

    // Función auxiliar para dividir arreglos en trozos (chunks)
    const chunkArray = (arr, size) => {
        const chunks = [];
        for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
        }
        return chunks;
    };

    const renderDirectorRow = (label, value) => (
        <tr style={{ height: '22px' }}>
            <td style={styles.cellLabel}>{label}</td>
            <td style={styles.cellValue}>{value || '-'}</td>
        </tr>
    );

    const renderDirectorBox = (d, index) => (
        <div key={index} style={{ border: '1px solid #e2e8f0', borderRadius: '4px', marginBottom: '10px' }}>
            <div style={{ backgroundColor: '#f1f5f9', padding: '4px 10px', fontSize: '9px', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0' }}>
                DIRECTOR #{index + 1}
            </div>
            <table style={styles.table}>
                <tbody>
                    {renderDirectorRow('Nombre(s)', `${d.firstName} ${d.secondName}`)}
                    {renderDirectorRow('Apellidos', d.lastName)}
                    {renderDirectorRow('Estado Civil', d.maritalStatus)}
                    {renderDirectorRow('Nacionalidad', d.nationality)}
                    {renderDirectorRow('Pasaporte/ID', d.passport)}
                    {renderDirectorRow('Ciudad/País', `${d.city || ''}, ${d.country || ''}`)}
                    {renderDirectorRow('Dirección', d.address)}
                </tbody>
            </table>
        </div>
    );

    // Lógica de Paginación
    const firstPageDirectors = data.directors.slice(0, 3);
    const extraDirectorsChunks = chunkArray(data.directors.slice(3), 4); // 4 directores por página de anexo
    
    const firstPageShareholders = data.shareholders.slice(0, 5);
    const extraShareholdersChunks = chunkArray(data.shareholders.slice(5), 15); // 15 accionistas por página de anexo

    return (
        <div ref={ref} id="corp-document-preview">
            
            {/* --- PÁGINA 1: IDENTIDAD Y DIRECTORES PRINCIPALES --- */}
            <div style={styles.page}>
                <div style={styles.header}>
                    <img src="/logo_panama_tax.png" alt="Logo" style={{ height: '50px' }} />
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 'bold', color: PRIMARY, fontSize: '16px' }}>Incorporation Form</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>Formulario de Incorporación</div>
                    </div>
                </div>

                <div style={styles.sectionHeader}>1. COMPANY IDENTITY / IDENTIDAD DE LA COMPAÑÍA</div>
                <table style={styles.table}>
                    <tbody>
                        <tr><td style={styles.cellLabel}>1st Choice (S.A.)</td><td style={styles.cellValue}>{data.corpNameSA}</td></tr>
                        <tr><td style={styles.cellLabel}>2nd Choice (Corp.)</td><td style={styles.cellValue}>{data.corpNameCorp}</td></tr>
                        <tr><td style={styles.cellLabel}>3rd Choice (Inc.)</td><td style={styles.cellValue}>{data.corpNameInc}</td></tr>
                    </tbody>
                </table>

                <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: PRIMARY, color: 'white', padding: '6px 10px', fontSize: '11px', fontWeight: 'bold' }}>
                    <span>CAPITAL SOCIAL AUTORIZADO (AUTHORIZED CAPITAL)</span>
                    <span>$ {data.capitalSocial} USD</span>
                </div>

                <div style={styles.sectionHeader}>2. BOARD OF DIRECTORS / JUNTA DIRECTIVA</div>
                <div style={styles.directorGrid}>
                    {firstPageDirectors.slice(0, 2).map((d, i) => renderDirectorBox(d, i))}
                </div>
                {firstPageDirectors[2] && renderDirectorBox(firstPageDirectors[2], 2)}

                <div style={{ position: 'absolute', bottom: '10mm', left: '0', right: '0', textAlign: 'center', fontSize: '9px', color: '#94a3b8' }}>
                    PÁGINA 1
                </div>
            </div>

            {/* --- PÁGINAS DE ANEXO: DIRECTORES ADICIONALES (SI EXISTEN) --- */}
            {extraDirectorsChunks.map((chunk, pIdx) => (
                <div key={`annex-dir-${pIdx}`} style={styles.page}>
                    <div style={styles.sectionHeader}>ANEXO: DIRECTORES ADICIONALES (CONTINUACIÓN)</div>
                    <div style={styles.directorGrid}>
                        {chunk.map((d, i) => renderDirectorBox(d, 3 + (pIdx * 4) + i))}
                    </div>
                    <div style={{ position: 'absolute', bottom: '10mm', left: '0', right: '0', textAlign: 'center', fontSize: '9px', color: '#94a3b8' }}>
                        ANEXO DIRECTORES - PÁG {pIdx + 1}
                    </div>
                </div>
            ))}

            {/* --- PÁGINA FINAL: DIGNATARIOS Y ACCIONISTAS --- */}
            <div style={styles.page}>
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
                                <td style={{ ...styles.cellValue, fontWeight: 'bold', textTransform: 'uppercase' }}>{role}</td>
                                <td style={styles.cellValue}>{d.fullName}</td>
                                <td style={styles.cellValue}>{d.birthDate}</td>
                                <td style={styles.cellValue}>{d.passport}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div style={styles.sectionHeader}>4. SHAREHOLDERS / ACCIONISTAS</div>
                <table style={styles.table}>
                    <thead style={{ backgroundColor: '#f1f5f9' }}>
                        <tr>
                            <th style={{ ...styles.cellLabel, width: '10%' }}>CERT.</th>
                            <th style={{ ...styles.cellLabel, width: '12%' }}>VALOR</th>
                            <th style={{ ...styles.cellLabel, width: '10%' }}>ACC.</th>
                            <th style={styles.cellLabel}>NOMBRE</th>
                            <th style={styles.cellLabel}>DIRECCIÓN</th>
                        </tr>
                    </thead>
                    <tbody>
                        {firstPageShareholders.map((s, i) => (
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

                <div style={styles.sectionHeader}>5. DECLARATION & SIGNATURE / DECLARACIÓN Y FIRMA</div>
                <div style={{ fontSize: '10px', lineHeight: '1.5', marginBottom: '20px', color: '#475569' }}>
                    {data.companyActivities || 'No se especificaron actividades.'}
                </div>

                <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ width: '60%', borderTop: '1px solid black', paddingTop: '5px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 'bold' }}>{data.declarationName || '_________________________________'}</div>
                        <div style={{ fontSize: '9px', color: '#64748b' }}>Signature of applicant / Firma del solicitante</div>
                    </div>
                    <div style={{ width: '30%', borderTop: '1px solid black', paddingTop: '5px' }}>
                        <div style={{ fontSize: '11px' }}>{data.declarationDate}</div>
                        <div style={{ fontSize: '9px', color: '#64748b' }}>Date / Fecha</div>
                    </div>
                </div>

                <div style={{ position: 'absolute', bottom: '10mm', left: '0', right: '0', textAlign: 'center', fontSize: '9px', color: '#94a3b8' }}>
                    PÁGINA FINAL
                </div>
            </div>

            {/* --- ANEXOS DE ACCIONISTAS (SI EXISTEN MÁS DE 5) --- */}
            {extraShareholdersChunks.map((chunk, pIdx) => (
                <div key={`annex-sh-${pIdx}`} style={styles.page}>
                    <div style={styles.sectionHeader}>ANEXO: ACCIONISTAS ADICIONALES</div>
                    <table style={styles.table}>
                        <thead style={{ backgroundColor: '#f1f5f9' }}>
                            <tr>
                                <th style={{ ...styles.cellLabel, width: '10%' }}>CERT.</th>
                                <th style={{ ...styles.cellLabel, width: '12%' }}>VALOR</th>
                                <th style={{ ...styles.cellLabel, width: '10%' }}>ACC.</th>
                                <th style={styles.cellLabel}>NOMBRE</th>
                                <th style={styles.cellLabel}>DIRECCIÓN</th>
                            </tr>
                        </thead>
                        <tbody>
                            {chunk.map((s, i) => (
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
                    <div style={{ position: 'absolute', bottom: '10mm', left: '0', right: '0', textAlign: 'center', fontSize: '9px', color: '#94a3b8' }}>
                        ANEXO ACCIONISTAS - PÁG {pIdx + 1}
                    </div>
                </div>
            ))}

        </div>
    );
});

export default CorporacionPreview;
