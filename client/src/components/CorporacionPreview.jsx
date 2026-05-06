import React from 'react';

const CorporacionPreview = React.forwardRef(({ data }, ref) => {
    if (!data) return null;

    const PRIMARY = '#0070c0';
    const SECONDARY = '#1e293b';

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
            position: 'relative'
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            borderBottom: `2px solid ${PRIMARY}`
        },
        logoArea: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
        },
        titleArea: {
            textAlign: 'right'
        },
        sectionHeader: {
            backgroundColor: PRIMARY,
            color: 'white',
            padding: '8px 12px',
            fontSize: '14px',
            fontWeight: 'bold',
            marginTop: '20px',
            marginBottom: '10px',
            textTransform: 'uppercase'
        },
        subHeader: {
            fontSize: '11px',
            color: '#666',
            marginBottom: '10px',
            fontStyle: 'italic'
        },
        table: {
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '15px',
            fontSize: '10px'
        },
        cellLabel: {
            border: '1px solid #cbd5e1',
            padding: '6px',
            backgroundColor: '#f8fafc',
            width: '30%',
            fontWeight: 'bold'
        },
        cellValue: {
            border: '1px solid #cbd5e1',
            padding: '6px',
            width: '70%'
        },
        grid2: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '15px'
        },
        directorCard: {
            border: '1px solid #e2e8f0',
            borderRadius: '4px',
            overflow: 'hidden'
        }
    };

    const renderDirector = (d, index) => (
        <div key={index} style={styles.directorCard}>
            <div style={{ backgroundColor: '#f1f5f9', padding: '5px 10px', fontSize: '11px', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0' }}>
                DIRECTOR #{index + 1}
            </div>
            <table style={styles.table}>
                <tbody>
                    <tr><td style={styles.cellLabel}>Nombre</td><td style={styles.cellValue}>{d.firstName} {d.secondName}</td></tr>
                    <tr><td style={styles.cellLabel}>Apellidos</td><td style={styles.cellValue}>{d.lastName}</td></tr>
                    <tr><td style={styles.cellLabel}>Nacionalidad</td><td style={styles.cellValue}>{d.nationality}</td></tr>
                    <tr><td style={styles.cellLabel}>Pasaporte/ID</td><td style={styles.cellValue}>{d.passport}</td></tr>
                    <tr><td style={styles.cellLabel}>Estado Civil</td><td style={styles.cellValue}>{d.maritalStatus}</td></tr>
                    <tr><td style={styles.cellLabel}>Ciudad/País</td><td style={styles.cellValue}>{d.city}, {d.country}</td></tr>
                </tbody>
            </table>
        </div>
    );

    return (
        <div ref={ref} id="corp-document-preview">
            <div style={styles.page}>
                {/* HEADER */}
                <div style={styles.header}>
                    <div style={styles.logoArea}>
                        <img src="/logo_panama_tax.png" alt="Logo" style={{ height: '60px' }} />
                    </div>
                    <div style={styles.titleArea}>
                        <h1 style={{ margin: 0, fontSize: '18px', color: PRIMARY }}>Incorporation Form</h1>
                        <h2 style={{ margin: 0, fontSize: '16px', color: '#666' }}>Formulario de Incorporación</h2>
                    </div>
                </div>

                {/* SECTION 1: IDENTITY */}
                <div style={styles.sectionHeader}>Name of the corporation / Nombre de la compañía</div>
                <div style={styles.subHeader}>List the names you wish to use to incorporate your corporation in order of preference</div>
                <table style={styles.table}>
                    <tbody>
                        <tr><td style={styles.cellLabel}>1st Choice (S.A.)</td><td style={styles.cellValue}>{data.corpNameSA}</td></tr>
                        <tr><td style={styles.cellLabel}>2nd Choice (Corp.)</td><td style={styles.cellValue}>{data.corpNameCorp}</td></tr>
                        <tr><td style={styles.cellLabel}>3rd Choice (Inc.)</td><td style={styles.cellValue}>{data.corpNameInc}</td></tr>
                    </tbody>
                </table>

                {/* CAPITAL */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: PRIMARY, color: 'white', padding: '8px 12px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 'bold' }}>AUTHORIZED CAPITAL / CAPITAL SOCIAL AUTORIZADO</span>
                    <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{data.capitalSocial} USD</span>
                </div>

                {/* DIRECTORS */}
                <div style={styles.sectionHeader}>Directors / Directores</div>
                <div style={styles.grid2}>
                    {data.directors.slice(0, 2).map((d, i) => renderDirector(d, i))}
                </div>

                {/* DIRECTOR 3 */}
                {data.directors.length >= 3 && (
                    <div style={{ marginTop: '15px' }}>
                        {renderDirector(data.directors[2], 2)}
                    </div>
                )}

                {/* FOOTER PAGE 1 */}
                <div style={{ position: 'absolute', bottom: '15mm', left: '15mm', right: '15mm', textAlign: 'center', fontSize: '10px', color: '#94a3b8' }}>
                    Página 1 de {data.directors.length > 3 || data.shareholders.length > 4 ? '2+' : '2'}
                </div>
            </div>

            {/* PAGE 2: DIGNITARIES & SHAREHOLDERS */}
            <div style={{ ...styles.page, marginTop: '20px', borderTop: '1px dashed #ccc' }}>
                <div style={styles.sectionHeader}>Dignitaries / Dignatarios</div>
                <table style={styles.table}>
                    <thead>
                        <tr style={{ backgroundColor: '#f1f5f9' }}>
                            <th style={styles.cellLabel}>Cargo</th>
                            <th style={styles.cellLabel}>Nombre Completo</th>
                            <th style={styles.cellLabel}>F. Nacimiento</th>
                            <th style={styles.cellLabel}>Pasaporte</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(data.dignitaries).map(([role, d]) => (
                            <tr key={role}>
                                <td style={{ ...styles.cellValue, textTransform: 'capitalize', fontWeight: 'bold' }}>{role}</td>
                                <td style={styles.cellValue}>{d.fullName}</td>
                                <td style={styles.cellValue}>{d.birthDate}</td>
                                <td style={styles.cellValue}>{d.passport}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div style={styles.sectionHeader}>Shareholders / Accionistas</div>
                <table style={styles.table}>
                    <thead>
                        <tr style={{ backgroundColor: '#f1f5f9' }}>
                            <th style={styles.cellLabel}>Cert.</th>
                            <th style={styles.cellLabel}>Valor</th>
                            <th style={styles.cellLabel}>Acciones</th>
                            <th style={styles.cellLabel}>Nombre</th>
                            <th style={styles.cellLabel}>Dirección</th>
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

                <div style={styles.sectionHeader}>Signature / Firma</div>
                <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ width: '60%', borderTop: '1px solid black', paddingTop: '5px' }}>
                        <div style={{ fontSize: '10px', fontWeight: 'bold' }}>{data.declarationName || '_________________________________'}</div>
                        <div style={{ fontSize: '9px', color: '#666' }}>Signature of applicant / Firma del solicitante</div>
                    </div>
                    <div style={{ width: '30%', borderTop: '1px solid black', paddingTop: '5px' }}>
                        <div style={{ fontSize: '10px' }}>{data.declarationDate}</div>
                        <div style={{ fontSize: '9px', color: '#666' }}>Date / Fecha</div>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default CorporacionPreview;
