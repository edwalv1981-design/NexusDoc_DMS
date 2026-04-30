import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ArrowLeft, Shield, FileText, UserPlus, FileUp, Download } from 'lucide-react';

const Tutorial = () => {
    const navigate = useNavigate();

    // Determinar si es admin para el botón de regreso
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
        if (role === 'admin') {
            navigate('/admin');
        } else {
            navigate('/dashboard');
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif" }}>
            {/* Header */}
            <div style={{ background: '#0078d4', color: 'white', padding: '30px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                <button 
                    onClick={handleBack}
                    style={{ position: 'absolute', left: '40px', top: '30px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                >
                    <ArrowLeft size={16} /> Volver
                </button>

                <BookOpen size={48} style={{ marginBottom: '15px' }} />
                <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '10px' }}>Manual de Usuario NexusDoc</h1>
                <p style={{ fontSize: '16px', opacity: 0.9, maxWidth: '600px', textAlign: 'center' }}>
                    Bienvenido al sistema inteligente de gestión documental. A continuación, le explicamos paso a paso cómo utilizar nuestra plataforma para maximizar su eficiencia.
                </p>
            </div>

            {/* Content */}
            <div style={{ maxWidth: '900px', margin: '40px auto', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
                
                {/* Section 1: Concepto */}
                <div style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '8px', color: '#0078d4' }}>
                            <Shield size={24} />
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>1. Seguridad y Acceso</h2>
                    </div>
                    <div style={{ color: '#475569', lineHeight: '1.7', fontSize: '14px' }}>
                        <p style={{ marginBottom: '10px' }}>NexusDoc utiliza un sistema de <strong>Seguridad de Doble Capa sin contraseñas estáticas</strong> para los usuarios estándar.</p>
                        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <li><strong>Ingreso:</strong> Usted ingresa usando su correo electrónico.</li>
                            <li><strong>Código Temporal (OTP):</strong> El sistema le enviará un código de 6 dígitos a su correo.</li>
                            <li><strong>Ventana de 3 Minutos:</strong> Por seguridad, este código caduca en 3 minutos. Si se excede, el sistema le permitirá generar un código nuevo en color naranja.</li>
                            <li><strong>Inactividad:</strong> Si deja la plataforma inactiva por más de 1 minuto, el sistema bloqueará la pantalla para proteger su información.</li>
                        </ul>
                    </div>
                </div>

                {/* Section 2: Tramites */}
                <div style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <div style={{ background: '#f0fdf4', padding: '10px', borderRadius: '8px', color: '#16a34a' }}>
                            <FileText size={24} />
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>2. Creación de Trámites Dinámicos</h2>
                    </div>
                    <div style={{ color: '#475569', lineHeight: '1.7', fontSize: '14px' }}>
                        <p style={{ marginBottom: '10px' }}>Nuestra plataforma le permite rellenar formularios corporativos complejos de forma sencilla, dividida en pasos lógicos.</p>
                        <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <li>En su <strong>Dashboard</strong>, haga clic en el botón verde <strong>"NUEVO TRÁMITE"</strong>.</li>
                            <li>Seleccione el tipo de documento que desea crear (Ej. <em>Fondos Registros Contables, Corporación, Fundaciones</em>, etc.).</li>
                            <li>Aparecerá un <strong>formulario dinámico por pasos</strong>. Complete la información de la entidad corporativa, seleccione el origen de los fondos mediante las casillas de verificación, y finalmente ingrese los datos de custodia.</li>
                            <li>Al guardar, su documento quedará almacenado de forma segura en la base de datos de NexusDoc.</li>
                        </ol>
                    </div>
                </div>

                {/* Section 3: Gestion */}
                <div style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <div style={{ background: '#fef3c7', padding: '10px', borderRadius: '8px', color: '#d97706' }}>
                            <Download size={24} />
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>3. Gestión y Generación de PDF</h2>
                    </div>
                    <div style={{ color: '#475569', lineHeight: '1.7', fontSize: '14px' }}>
                        <p style={{ marginBottom: '10px' }}>Una vez guardados sus trámites, estos aparecerán en la tabla principal de su Panel de Control.</p>
                        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <li>
                                <strong>Descarga Directa Inteligente:</strong> Al presionar el ícono de descarga (flecha verde), el motor de inteligencia de Nexus inyectará sus respuestas guardadas en la <strong>plantilla PDF oficial</strong> de la corporación correspondiente, entregándole un documento final listo para imprimir o firmar.
                            </li>
                            <li>
                                <strong>Edición Continua:</strong> Puede utilizar el botón del "Lápiz" azul para modificar los datos de un trámite en caso de haber cometido algún error, sin tener que empezar desde cero.
                            </li>
                            <li>
                                <strong>Eliminación Segura:</strong> Puede borrar sus borradores con el ícono rojo del "Basurero". Se requerirá una confirmación para evitar borrados accidentales.
                            </li>
                        </ul>
                    </div>
                </div>

                {role === 'admin' && (
                    /* Section 4: Admin Only */
                    <div style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #6366f1' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                            <div style={{ background: '#e0e7ff', padding: '10px', borderRadius: '8px', color: '#4f46e5' }}>
                                <FileUp size={24} />
                            </div>
                            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#3730a3' }}>4. Exclusivo para Administrador: Plantillas PDF</h2>
                        </div>
                        <div style={{ color: '#475569', lineHeight: '1.7', fontSize: '14px' }}>
                            <p style={{ marginBottom: '10px' }}>Como administrador master, usted tiene el control de las estructuras base del sistema.</p>
                            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <li>Ingrese a la pestaña <strong>"PLANTILLAS PDF"</strong> en su panel lateral.</li>
                                <li>En esa sección podrá ver las plantillas vigentes alojadas directamente en el motor de base de datos (BYTEA).</li>
                                <li>Para actualizar un formato legal, seleccione el tipo de trámite en el menú desplegable y adjunte el nuevo archivo PDF. El sistema se encargará automáticamente de mapear las variables en el nuevo formato la próxima vez que un usuario solicite una descarga.</li>
                            </ul>
                        </div>
                    </div>
                )}

                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '12px', marginTop: '20px' }}>
                    &copy; {new Date().getFullYear()} NexusDoc DMS. Sistema desarrollado con tecnología de vanguardia.
                </div>
            </div>
        </div>
    );
};

export default Tutorial;
