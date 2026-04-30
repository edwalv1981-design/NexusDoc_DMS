import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ArrowLeft, Shield, FileText, Download, Mail, LayoutGrid, CheckCircle, Edit, FileUp, Lock } from 'lucide-react';

const Tutorial = () => {
    const navigate = useNavigate();

    // Determinar rol
    const userString = localStorage.getItem('user');
    let role = 'client';
    try {
        if (userString) {
            const userObj = JSON.parse(userString);
            role = userObj.role || 'client';
        }
    } catch (e) {
        console.error(e);
    }

    const handleBack = () => {
        if (role === 'admin') navigate('/admin');
        else navigate('/dashboard');
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif", paddingBottom: '60px' }}>
            
            {/* Cabecera Hero */}
            <div style={{ background: 'linear-gradient(135deg, #0078d4 0%, #0369a1 100%)', color: 'white', padding: '50px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', opacity: 0.1, right: '-5%', top: '-20%' }}>
                    <BookOpen size={400} />
                </div>
                
                <button 
                    onClick={handleBack}
                    style={{ position: 'absolute', left: '40px', top: '30px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '10px 20px', borderRadius: '50px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s', zIndex: 10 }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                >
                    <ArrowLeft size={16} /> Volver a mi panel
                </button>

                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '15px', borderRadius: '20px', marginBottom: '20px', zIndex: 10 }}>
                    <BookOpen size={40} color="white" />
                </div>
                <h1 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '15px', textAlign: 'center', zIndex: 10 }}>Guía Visual de NexusDoc</h1>
                <p style={{ fontSize: '18px', opacity: 0.9, maxWidth: '650px', textAlign: 'center', lineHeight: 1.6, zIndex: 10 }}>
                    Descubra cómo generar sus trámites corporativos y descargar documentos oficiales en 3 sencillos pasos.
                </p>
            </div>

            {/* Contenido Visual */}
            <div style={{ maxWidth: '1000px', margin: '-30px auto 0', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '40px', position: 'relative', zIndex: 20 }}>
                
                {/* Paso 1 */}
                <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)', overflow: 'hidden', display: 'flex', border: '1px solid #e2e8f0' }}>
                    <div style={{ flex: 1, padding: '40px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                            <div style={{ background: '#eff6ff', color: '#0078d4', width: '50px', height: '50px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 900 }}>1</div>
                            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>Acceso Seguro (Sin Contraseñas)</h2>
                        </div>
                        <p style={{ color: '#475569', fontSize: '15px', lineHeight: '1.8', marginBottom: '20px' }}>
                            Olvídese de recordar contraseñas complicadas. En NexusDoc su correo es su única llave. Cada vez que inicie sesión, le enviaremos un <strong>código de 6 dígitos</strong> a su bandeja de entrada.
                        </p>
                        <ul style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.8', paddingLeft: '20px' }}>
                            <li>El código tiene una caducidad de <strong>3 minutos</strong> exactos.</li>
                            <li>Si se demora, simplemente presione <span style={{ color: '#f59e0b', fontWeight: 700 }}>Generar nuevo código</span>.</li>
                            <li>Si deja su computadora sola por 1 minuto, la sesión se cerrará automáticamente para proteger su información.</li>
                        </ul>
                    </div>
                    {/* Gráfico Paso 1 */}
                    <div style={{ flex: 1, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', borderLeft: '1px solid #e2e8f0' }}>
                        <div style={{ width: '100%', background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', textAlign: 'center' }}>
                            <Mail size={40} color="#0078d4" style={{ marginBottom: '15px' }} />
                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, marginBottom: '10px' }}>CÓDIGO RECIBIDO EN SU CORREO</div>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
                                {[7, 2, 9, 4, 1, 5].map((num, i) => (
                                    <div key={i} style={{ width: '40px', height: '50px', background: '#eff6ff', border: '2px solid #bfdbfe', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 800, color: '#1e3a8a' }}>{num}</div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', color: '#f59e0b', fontSize: '12px', fontWeight: 700 }}>
                                <Lock size={14} /> CADUCA EN 02:59
                            </div>
                        </div>
                    </div>
                </div>

                {/* Paso 2 */}
                <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)', overflow: 'hidden', display: 'flex', border: '1px solid #e2e8f0', flexDirection: 'row-reverse' }}>
                    <div style={{ flex: 1, padding: '40px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                            <div style={{ background: '#f0fdf4', color: '#16a34a', width: '50px', height: '50px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 900 }}>2</div>
                            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>Crear un Nuevo Trámite</h2>
                        </div>
                        <p style={{ color: '#475569', fontSize: '15px', lineHeight: '1.8', marginBottom: '20px' }}>
                            Dentro de su panel de control (Escritorio), usted tiene el poder de iniciar nuevos trámites legales y corporativos al instante.
                        </p>
                        <ol style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.8', paddingLeft: '20px' }}>
                            <li>Haga clic en la opción <strong>"NUEVO TRÁMITE"</strong> en el menú lateral izquierdo.</li>
                            <li>Verá unas grandes tarjetas visuales para elegir el tipo de documento (Ej. Corporación, Fundaciones).</li>
                            <li>Llene el formulario paso a paso. Cuando termine, haga clic en "Guardar Trámite".</li>
                        </ol>
                    </div>
                    {/* Gráfico Paso 2 */}
                    <div style={{ flex: 1, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', borderRight: '1px solid #e2e8f0' }}>
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ background: '#0078d4', color: 'white', padding: '15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', width: '60%', fontWeight: 700, fontSize: '14px', boxShadow: '0 4px 10px rgba(0,120,212,0.3)' }}>
                                <LayoutGrid size={18} /> ESCRITORIO
                            </div>
                            <div style={{ background: 'rgba(0,120,212,0.1)', color: '#0078d4', padding: '15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', width: '70%', fontWeight: 700, fontSize: '14px', border: '1px solid #bfdbfe' }}>
                                <div style={{ background: '#0078d4', color: 'white', borderRadius: '50%', padding: '2px' }}><CheckCircle size={14} /></div> NUEVO TRÁMITE
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                                <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '2px solid #e2e8f0', textAlign: 'center' }}><FileText size={24} color="#6366f1" /> <div style={{ fontSize: '10px', marginTop: '5px', fontWeight: 700 }}>Fondos</div></div>
                                <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '2px solid #e2e8f0', textAlign: 'center' }}><Shield size={24} color="#10b981" /> <div style={{ fontSize: '10px', marginTop: '5px', fontWeight: 700 }}>Corporación</div></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Paso 3 */}
                <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)', overflow: 'hidden', display: 'flex', border: '1px solid #e2e8f0' }}>
                    <div style={{ flex: 1, padding: '40px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                            <div style={{ background: '#fef3c7', color: '#d97706', width: '50px', height: '50px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 900 }}>3</div>
                            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>Descargar Documento PDF</h2>
                        </div>
                        <p style={{ color: '#475569', fontSize: '15px', lineHeight: '1.8', marginBottom: '20px' }}>
                            Una vez que guarde un trámite, regresará automáticamente a su Escritorio. Allí verá una tabla con todos sus trámites activos.
                        </p>
                        <ul style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.8', paddingLeft: '20px' }}>
                            <li>Haga clic en el botón de la <strong style={{ color: '#16a34a' }}>Flecha Verde</strong> para generar y descargar instantáneamente el PDF oficial con todos sus datos.</li>
                            <li>Haga clic en el <strong style={{ color: '#0078d4' }}>Lápiz Azul</strong> si necesita corregir algún dato.</li>
                        </ul>
                    </div>
                    {/* Gráfico Paso 3 */}
                    <div style={{ flex: 1, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', borderLeft: '1px solid #e2e8f0' }}>
                        <div style={{ width: '100%', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                            <div style={{ background: '#f1f5f9', padding: '12px 15px', borderBottom: '1px solid #e2e8f0', fontSize: '10px', fontWeight: 800, color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                                <span>TRÁMITE</span> <span>ACCIONES</span>
                            </div>
                            <div style={{ padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>Corporación Alpha</div>
                                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Actualizado hoy</div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 5px rgba(22,163,74,0.2)' }}><Download size={16} /></div>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: '#eff6ff', color: '#0078d4', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Edit size={16} /></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {role === 'admin' && (
                    <div style={{ background: '#e0e7ff', padding: '40px', borderRadius: '16px', border: '2px dashed #6366f1', textAlign: 'center', marginTop: '20px' }}>
                        <div style={{ background: 'white', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 4px 10px rgba(79, 70, 229, 0.2)' }}>
                            <FileUp size={30} color="#4f46e5" />
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#3730a3', marginBottom: '15px' }}>Opciones de Administrador: Inyección de Plantillas</h2>
                        <p style={{ color: '#4338ca', fontSize: '15px', maxWidth: '600px', margin: '0 auto' }}>
                            Al ser usted el Administrador Master, dispone del botón exclusivo <strong>"PLANTILLAS PDF"</strong> en su panel. Úselo para subir archivos PDF en blanco desde su computadora hacia la base de datos (Ej. Sube un PDF nuevo para "Fundaciones"). El motor lo utilizará automáticamente para las próximas descargas de los clientes.
                        </p>
                    </div>
                )}

            </div>
            
            <div style={{ textAlign: 'center', padding: '40px 20px 0', color: '#94a3b8', fontSize: '13px', fontWeight: 600 }}>
                &copy; {new Date().getFullYear()} NexusDoc DMS. Sistema desarrollado con tecnología de vanguardia.
            </div>
        </div>
    );
};

export default Tutorial;
