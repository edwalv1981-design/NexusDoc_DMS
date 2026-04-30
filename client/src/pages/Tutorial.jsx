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
                
                {/* Paso 1: Registro */}
                <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)', overflow: 'hidden', display: 'flex', border: '1px solid #e2e8f0' }}>
                    <div style={{ flex: 1, padding: '40px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                            <div style={{ background: '#f5f3ff', color: '#8b5cf6', width: '50px', height: '50px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 900 }}>1</div>
                            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>Registro de Nuevo Usuario</h2>
                        </div>
                        <p style={{ color: '#475569', fontSize: '15px', lineHeight: '1.8', marginBottom: '20px' }}>
                            Crear una cuenta desde cero en NexusDoc es rápido y está diseñado para garantizar la autenticidad corporativa.
                        </p>
                        <ol style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.8', paddingLeft: '20px' }}>
                            <li>En la pantalla inicial de la plataforma, haga clic en la opción <strong>"Registrarse"</strong>.</li>
                            <li>Deberá proporcionar sus datos empresariales (Nombre, Correo y su Código Único Corporativo si aplica).</li>
                            <li>La plataforma le enviará inmediatamente una <strong>Clave Temporal</strong> a su correo para verificar su identidad y activar la cuenta de forma segura.</li>
                        </ol>
                    </div>
                    {/* Gráfico Paso 1 */}
                    <div style={{ flex: 1, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', borderLeft: '1px solid #e2e8f0' }}>
                        <div style={{ width: '100%', background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                                <div style={{ background: '#8b5cf6', color: 'white', padding: '6px', borderRadius: '6px' }}><Shield size={16} /></div>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>CREAR CUENTA</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ height: '30px', background: '#f1f5f9', borderRadius: '6px', display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: '10px', color: '#94a3b8' }}>Nombre Completo</div>
                                <div style={{ height: '30px', background: '#f1f5f9', borderRadius: '6px', display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: '10px', color: '#94a3b8' }}>Correo Electrónico Corporativo</div>
                                <div style={{ height: '35px', background: '#8b5cf6', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px', fontWeight: 700, marginTop: '5px' }}>REGISTRARSE</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Paso 2: Login */}
                <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)', overflow: 'hidden', display: 'flex', border: '1px solid #e2e8f0', flexDirection: 'row-reverse' }}>
                    <div style={{ flex: 1, padding: '40px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                            <div style={{ background: '#eff6ff', color: '#0078d4', width: '50px', height: '50px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 900 }}>2</div>
                            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>Acceso y Recuperación de Clave</h2>
                        </div>
                        <p style={{ color: '#475569', fontSize: '15px', lineHeight: '1.8', marginBottom: '20px' }}>
                            Puede ingresar a su cuenta usando su clave personal. Si alguna vez la olvida o necesita <strong>cambiar su clave</strong>, el proceso es muy sencillo:
                        </p>
                        <ul style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.8', paddingLeft: '20px' }}>
                            <li>En la pantalla de inicio, haga clic en <strong style={{ color: '#0078d4' }}>"¿Olvidaste tu contraseña?"</strong>.</li>
                            <li>Ingrese su correo y reciba un código de seguridad.</li>
                            <li>Valide el código y el sistema le permitirá crear una <strong>Nueva Contraseña</strong> inmediatamente.</li>
                        </ul>
                    </div>
                    {/* Gráfico Paso 2 */}
                    <div style={{ flex: 1, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', borderRight: '1px solid #e2e8f0' }}>
                        <div style={{ width: '100%', background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', justifyContent: 'center' }}>
                                <div style={{ background: '#0078d4', color: 'white', padding: '6px', borderRadius: '6px' }}><Lock size={16} /></div>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>CAMBIAR CONTRASEÑA</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ height: '30px', background: '#f1f5f9', borderRadius: '6px', display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: '10px', color: '#94a3b8' }}>Nueva Contraseña (••••••••)</div>
                                <div style={{ height: '30px', background: '#f1f5f9', borderRadius: '6px', display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: '10px', color: '#94a3b8' }}>Confirmar Contraseña (••••••••)</div>
                                <div style={{ height: '35px', background: '#0078d4', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px', fontWeight: 700, marginTop: '5px' }}>GUARDAR NUEVA CLAVE</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Paso 3: Tramites */}
                <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)', overflow: 'hidden', display: 'flex', border: '1px solid #e2e8f0' }}>
                    <div style={{ flex: 1, padding: '40px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                            <div style={{ background: '#f0fdf4', color: '#16a34a', width: '50px', height: '50px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 900 }}>3</div>
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
                    {/* Gráfico Paso 3 */}
                    <div style={{ flex: 1, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', borderLeft: '1px solid #e2e8f0' }}>
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

                {/* Paso 4: Descarga */}
                <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)', overflow: 'hidden', display: 'flex', border: '1px solid #e2e8f0', flexDirection: 'row-reverse' }}>
                    <div style={{ flex: 1, padding: '40px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                            <div style={{ background: '#fef3c7', color: '#d97706', width: '50px', height: '50px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 900 }}>4</div>
                            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>Descargar Documento PDF</h2>
                        </div>
                        <p style={{ color: '#475569', fontSize: '15px', lineHeight: '1.8', marginBottom: '20px' }}>
                            Una vez que guarde un trámite, regresará a su Escritorio. Allí verá una tabla con todos sus trámites.
                        </p>
                        <ul style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.8', paddingLeft: '20px' }}>
                            <li>Presione la <strong style={{ color: '#16a34a' }}>Flecha Verde</strong> para generar y descargar instantáneamente el PDF oficial con todos sus datos.</li>
                            <li>Haga clic en el <strong style={{ color: '#0078d4' }}>Lápiz Azul</strong> si necesita corregir algún dato.</li>
                        </ul>
                    </div>
                    {/* Gráfico Paso 4 */}
                    <div style={{ flex: 1, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', borderRight: '1px solid #e2e8f0' }}>
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
