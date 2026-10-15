// import React from "react";
// import { useNavigate } from "react-router-dom";

// export default function UnderConstruction() {
//   const navigate = useNavigate();

//   return (
//     <div style={{ 
//       display: 'flex', 
//       justifyContent: 'center', 
//       alignItems: 'center', 
//       minHeight: '80vh', 
//       padding: '20px' 
//     }}>
//       <div style={{
//         background: '#ffffff',
//         padding: '40px',
//         borderRadius: '20px',
//         textAlign: 'center',
//         boxShadow: '0 10px 25px rgba(0,0,0,0.1)', // Estilo similar ao box-atendente
//         maxWidth: '500px',
//         width: '100%'
//       }}>
//         <i className="bx bx-cone" style={{ fontSize: '80px', color: '#3b82f6', marginBottom: '20px', display: 'block' }}></i>
//         <h1 style={{ color: '#1a2b45', marginBottom: '15px', fontSize: '1.8rem' }}>Página em Desenvolvimento</h1>
//         <p style={{ color: '#64748b', lineHeight: '1.6', marginBottom: '30px' }}>
//           O módulo de <strong>Gestão de Hotelaria</strong> para esta seção está sendo preparado.
//         </p>
//         <button 
//           onClick={() => navigate("/dashboard")} 
//           style={{
//             background: '#3b82f6',
//             color: 'white',
//             padding: '12px 24px',
//             borderRadius: '8px',
//             border: 'none',
//             fontWeight: '600',
//             cursor: 'pointer'
//           }}
//         >
//           Voltar ao Início
//         </button>
//       </div>
//     </div>
//   );
// }