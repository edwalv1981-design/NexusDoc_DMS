import React from 'react';
import logo from '../assets/logo_real.png';

const CorporacionPreview = ({ data }) => {
    if (!data) return null;

    const PRIMARY_BLUE = '#4098ad'; // El azul de las cabeceras según captura
    const LIGHT_BLUE = '#f1f5f9';
    const BORDER_COLOR = '#4098ad';

    const directors = data.directors || [];
    const shareholders = data.shareholders || [];
    const dignitaries = data.dignitaries || {};

    const renderDirectorTable = (d, title, isHalf = false) => (
        <div style={{ 
            width: isHalf ? '49%' : '100%', 
            marginBottom: '15px',
            display: 'inline-block',
            verticalAlign: 'top'
        }}>
            <div style={{ background: 'white', border: `1px solid ${BORDER_COLOR}`, borderRadius: '2px' }}>
                <div style={{ textAlign: 'center', padding: '4px', fontWeight: '800', fontSize: '12px', borderBottom: `1px solid ${BORDER_COLOR}` }}>
                    {title}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                    <tbody>
                        {[
                            ['First name / Nombre', d.firstName],
                            ['Middle name / Segundo nombre', d.secondName],
                            ['Surname(s) / Apellidos', d.lastName],
                            ['Date of birth / Fecha de nacimiento', d.birthDate],
                            ['Marital Status / Estado civil', d.maritalStatus],
                            ['Citizenship / Nacionalidad', d.nationality],
                            ['Passport/Pasaporte', d.passport],
                            ['Phone / Teléfono', d.phone],
                            ['Email', d.email],
                            ['Address / Dirección', d.address],
                            ['City / ciudad', d.city],
                            ['Country / País', d.country],
                        ].map(([label, val], idx) => (
                            <tr key={idx} style={{ borderBottom: idx === 11 ? 'none' : `1px solid ${BORDER_COLOR}` }}>
                                <td style={{ width: '40%', padding: '4px', borderRight: `1px solid ${BORDER_COLOR}`, background: 'white', fontWeight: '600' }}>{label}</td>
                                <td style={{ width: '60%', padding: '4px' }}>{val || ''}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div id="corporacion-preview-content" style={{
            width: '794px', // ANCHO A4 FIJO PARA EVITAR DISTORSIÓN
            background: 'white',
            margin: '0 auto',
            padding: '40px',
            fontFamily: 'Arial, sans-serif',
            color: '#333',
            boxSizing: 'border-box',
            position: 'relative',
            minHeight: '1123px' // ALTO A4
        }}>
            {/* ENCABEZADO FIEL AL ORIGINAL */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
                <img src={logo} alt="Logo" style={{ width: '140px', objectFit: 'contain' }} />
                <div style={{ textAlign: 'right' }}>
                    <h1 style={{ margin: 0, fontSize: '24px', color: '#335e8d', fontWeight: '700' }}>Incorporation Form</h1>
                    <h2 style={{ margin: 0, fontSize: '20px', color: '#335e8d', fontWeight: '700' }}>Formulario de Incorporación</h2>
                </div>
            </div>

            {/* SECCIÓN NOMBRE DE COMPAÑÍA */}
            <div style={{ background: PRIMARY_BLUE, color: 'white', padding: '10px 15px', fontWeight: '700', fontSize: '14px', marginBottom: '1px' }}>
                Name of the corporation / Nombre de la compañía:
            </div>
            <div style={{ background: LIGHT_BLUE, padding: '8px 15px', fontSize: '9px', fontWeight: '700', borderBottom: `2px solid ${PRIMARY_BLUE}` }}>
                List the names you wish to use to incorporate your corporation in order of preference / 
                Listar los nombres que desea utilizar para incorporar su compañía en orden de preferencia
            </div>

            <div style={{ display: 'flex', border: `1px solid ${BORDER_COLOR}`, borderTop: 'none', marginBottom: '20px' }}>
                <div style={{ width: '60%' }}>
                    {['1st choice', '2nd choice', '3rd choice'].map((choice, i) => (
                        <div key={choice} style={{ display: 'flex', borderBottom: i === 2 ? 'none' : `1px solid ${BORDER_COLOR}` }}>
                            <div style={{ width: '150px', padding: '10px', fontWeight: '800', fontSize: '12px', textAlign: 'center', borderRight: `1px solid ${BORDER_COLOR}` }}>{choice}</div>
                            <div style={{ flex: 1, padding: '10px', fontSize: '12px' }}>{data[i === 0 ? 'corpNameSA' : (i === 1 ? 'corpNameCorp' : 'corpNameInc')] || ''}</div>
                        </div>
                    ))}
                </div>
                <div style={{ width: '40%', padding: '10px', fontSize: '8px', borderLeft: `1px solid ${BORDER_COLOR}`, lineHeight: '1.4' }}>
                    The name of the Company must be determined by one of the following terminations: Corporation, Incorporated, Société Anonyme, Sociedad Anónima, Corp., Inc., S.A., A/S, N.V., B.V., AG.<br/><br/>
                    El nombre de la Compañía debe terminar con una de las siguientes terminaciones: Corporation, Incorporated, Société Anonyme, Sociedad Anónima, Corp., Inc., S.A., A/S, N.V., B.V., AG.
                </div>
            </div>

            {/* CAPITAL SOCIAL */}
            <div style={{ display: 'flex', alignItems: 'stretch', marginBottom: '20px' }}>
                <div style={{ flex: 1.5, background: PRIMARY_BLUE, color: 'white', padding: '10px 15px', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center' }}>
                    Authorized Capital / Capital Social Autorizado:
                </div>
                <div style={{ flex: 1, border: `1px solid ${BORDER_COLOR}`, borderLeft: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '14px' }}>
                    {data.capitalSocial || '10,000.00'} USD
                </div>
            </div>

            {/* DIRECTORES - LAYOUT GEOMÉTRICO FIEL */}
            <div style={{ background: PRIMARY_BLUE, color: 'white', padding: '10px 15px', fontWeight: '700', fontSize: '14px', marginBottom: '15px' }}>
                Directors / directores:
            </div>

            {/* Director 1: Ancho Completo */}
            {directors[0] && renderDirectorTable(directors[0], "Director 1")}

            {/* Director 2 y 3: Dos Columnas */}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {directors[1] && renderDirectorTable(directors[1], "Director 2", true)}
                {directors[2] && renderDirectorTable(directors[2], "Director 3", true)}
            </div>

            {/* Director 4+: Ancho Completo (o saltar a nueva página si es necesario) */}
            {directors.slice(3).map((d, i) => renderDirectorTable(d, `Director ${i + 4}`))}

            {/* OFFICERS TABLE */}
            <div style={{ background: PRIMARY_BLUE, color: 'white', padding: '10px 15px', fontWeight: '700', fontSize: '14px', marginBottom: '15px', marginTop: '30px' }}>
                Officers / dignatarios:
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', border: `1px solid ${BORDER_COLOR}`, marginBottom: '20px' }}>
                <thead>
                    <tr style={{ background: LIGHT_BLUE }}>
                        <th style={{ border: `1px solid ${BORDER_COLOR}`, padding: '8px' }}></th>
                        <th style={{ border: `1px solid ${BORDER_COLOR}`, padding: '8px' }}>Full name / Nombre completo</th>
                        <th style={{ border: `1px solid ${BORDER_COLOR}`, padding: '8px' }}>Date of birth / Fecha de nacimiento</th>
                        <th style={{ border: `1px solid ${BORDER_COLOR}`, padding: '8px' }}>Passport / Pasaporte</th>
                        <th style={{ border: `1px solid ${BORDER_COLOR}`, padding: '8px' }}>Registration number (if company) / Número de Registro si es empresa</th>
                    </tr>
                </thead>
                <tbody>
                    {['presidente', 'secretario', 'tesorero'].map(role => (
                        <tr key={role}>
                            <td style={{ border: `1px solid ${BORDER_COLOR}`, padding: '8px', fontWeight: '700', textTransform: 'uppercase' }}>{role}</td>
                            <td style={{ border: `1px solid ${BORDER_COLOR}`, padding: '8px' }}>{dignitaries[role]?.fullName || ''}</td>
                            <td style={{ border: `1px solid ${BORDER_COLOR}`, padding: '8px' }}>{dignitaries[role]?.birthDate || ''}</td>
                            <td style={{ border: `1px solid ${BORDER_COLOR}`, padding: '8px' }}>{dignitaries[role]?.passport || ''}</td>
                            <td style={{ border: `1px solid ${BORDER_COLOR}`, padding: '8px' }}>{dignitaries[role]?.registrationNum || ''}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* SHAREHOLDERS TABLE */}
            <div style={{ background: PRIMARY_BLUE, color: 'white', padding: '10px 15px', fontWeight: '700', fontSize: '14px', marginBottom: '15px' }}>
                Shareholders / Accionistas :
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', border: `1px solid ${BORDER_COLOR}`, marginBottom: '20px' }}>
                <thead>
                    <tr style={{ background: LIGHT_BLUE }}>
                        <th style={{ border: `1px solid ${BORDER_COLOR}`, padding: '8px' }}>Share Certificate Number</th>
                        <th style={{ border: `1px solid ${BORDER_COLOR}`, padding: '8px' }}>Share's value / valor por acción</th>
                        <th style={{ border: `1px solid ${BORDER_COLOR}`, padding: '8px' }}>Number of Shares</th>
                        <th style={{ border: `1px solid ${BORDER_COLOR}`, padding: '8px' }}>Shareholder / Accionista</th>
                        <th style={{ border: `1px solid ${BORDER_COLOR}`, padding: '8px' }}>Address / dirección</th>
                    </tr>
                </thead>
                <tbody>
                    {shareholders.map((s, i) => (
                        <tr key={i}>
                            <td style={{ border: `1px solid ${BORDER_COLOR}`, padding: '8px' }}>{s.certificate || ''}</td>
                            <td style={{ border: `1px solid ${BORDER_COLOR}`, padding: '8px' }}>{s.value || ''}</td>
                            <td style={{ border: `1px solid ${BORDER_COLOR}`, padding: '8px' }}>{s.shares || ''}</td>
                            <td style={{ border: `1px solid ${BORDER_COLOR}`, padding: '8px' }}>{s.name || ''}</td>
                            <td style={{ border: `1px solid ${BORDER_COLOR}`, padding: '8px' }}>{s.address || ''}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* DECLARATION SECTION (3px ADJUSTED) */}
            <div style={{ marginTop: '40px', fontSize: '11px', lineHeight: '1.6' }}>
                <p style={{ fontWeight: '700', fontStyle: 'italic' }}>
                    I/We declare that the origin of funds and goods linked to the services provided by Panama Tax Lawyers and its associates derive from legitimate sources and without criminal origin...
                </p>
                <div style={{ marginTop: '30px' }}>
                    <div style={{ display: 'flex', borderBottom: '1px solid #333', marginBottom: '20px', paddingBottom: '3px' }}>
                        <span style={{ fontWeight: '700', width: '120px' }}>Name // Nombre:</span>
                        <span style={{ fontSize: '13px', paddingLeft: '10px' }}>{data.declarationName || ''}</span>
                    </div>
                    <div style={{ display: 'flex', borderBottom: '1px solid #333', paddingBottom: '3px' }}>
                        <span style={{ fontWeight: '700', width: '120px' }}>Date // Fecha:</span>
                        <span style={{ fontSize: '13px', paddingLeft: '10px' }}>{data.declarationDate || ''}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CorporacionPreview;
