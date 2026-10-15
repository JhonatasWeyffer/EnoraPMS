import { useEffect, useState, useCallback } from "react";
import toast from 'react-hot-toast';
import api from "../services/api";
import "../styles/guests.css";
import Modal from "../components/Modal";

// ============================================
// UTILITÁRIOS
// ============================================

// Gerador progressivo de CPF que busca o maior número já existente (evita conflito)
const generateTestCPF = (guestsList) => {
  let maxFakeNumber = 0;

  guestsList.forEach(guest => {
    // 1. Pega o documento e remove qualquer ponto/traço que possa (ou não) ter
    const docLimpo = (guest.numeroDocumento || '').replace(/\D/g, '');
    
    // 2. Verifica se começa com 8 zeros (nosso padrão de teste limpo)
    if (docLimpo.startsWith('00000000')) {
      const numPuro = parseInt(docLimpo, 10);
      if (numPuro > maxFakeNumber) {
        maxFakeNumber = numPuro;
      }
    }
  });

  // 3. O próximo CPF será sempre maior que o maior já existente
  const nextNum = maxFakeNumber + 1;

  // 4. Formata bonitinho novamente
  const blocoPrincipal = Math.floor((nextNum - 1) / 99);
  const sequenciaFinal = ((nextNum - 1) % 99) + 1;

  const parte1 = String(blocoPrincipal).padStart(3, '0');
  const parte2 = '000';
  const parte3 = '000';
  const parte4 = String(sequenciaFinal).padStart(2, '0');

  return `${parte1}.${parte2}.${parte3}-${parte4}`;
};

// Validadores
const validators = {
  cpf: (cpf) => {
    cpf = cpf.replace(/[^\d]/g, '');
    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;
    
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(cpf.charAt(i)) * (10 - i);
    let digit = 11 - (sum % 11);
    if (digit > 9) digit = 0;
    if (digit !== parseInt(cpf.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(cpf.charAt(i)) * (11 - i);
    digit = 11 - (sum % 11);
    if (digit > 9) digit = 0;
    if (digit !== parseInt(cpf.charAt(10))) return false;
    
    return true;
  },
  email: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  phone: (phone) => /^\d{10,11}$/.test(phone.replace(/[^\d]/g, '')),
  required: (value) => value !== null && value !== undefined && value.toString().trim() !== ''
};

// Máscaras
const masks = {
  cpf: (value) => value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1'),
    
  cep: (value) => value
    .replace(/\D/g, '')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{3})\d+?$/, '$1'),
    
  phone: (value) => value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{4,5})(\d{4})/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1'),
    
  removeMask: (value) => value?.replace(/\D/g, '') || ''
};

// ============================================
// MAPEAMENTO API ↔ FORMULÁRIO
// ============================================

const mapearParaAPI = (formData) => {
  const removeMask = masks.removeMask;
  
  const higienizarCampo = (valor) => {
    if (valor === "" || valor === null || valor === undefined) return undefined;
    return valor;
  };
  
  return {
    pessoa: {
      nome: formData.name,
      nome_social: higienizarCampo(formData.social_name),
      PaisNacionalidade_id: formData.nationality_country || "BR",
      genero_id: formData.gender,
      genero_descricao: formData.gender === "OUTRO" ? higienizarCampo(formData.gender_description) : undefined,
      data_nascimento: formData.birth_date,
      raca_id: higienizarCampo(formData.race),
      deficiencia_id: formData.disability || "NAO",
      tipo_deficiencia_id: formData.disability === "SIM" ? higienizarCampo(formData.disability_type) : undefined,
      documento_id: {
        numero_documento: removeMask(formData.doc_number),
        tipo_documento_id: formData.doc_type
      },
      contato: {
        email: higienizarCampo(formData.email),
        telefone: higienizarCampo(removeMask(formData.phone)),
        PaisResidencia_id: formData.residence_country || "BR",
        cep: higienizarCampo(removeMask(formData.zip)),
        logradouro: higienizarCampo(formData.address),
        numero: higienizarCampo(formData.number),
        complemento: higienizarCampo(formData.complemento),
        bairro: higienizarCampo(formData.neighborhood),
        cidade_id: higienizarCampo(removeMask(formData.city_ibge)),
        cidade_nome: higienizarCampo(formData.city_name),
        estado_id: higienizarCampo(formData.state)
      }
    }
  };
};

const mapearDoAPI = (hospede) => ({
  name: hospede.nome || "",
  social_name: hospede.nomeSocial || "",
  nationality_country: hospede.paisNacionalidade || "BR",
  gender: hospede.genero || "",
  gender_description: hospede.generoDescricao || "",
  birth_date: hospede.dataNascimento ? hospede.dataNascimento.split("T")[0] : "",
  race: hospede.raca || "",
  disability: hospede.possuiDeficiencia || "NAO",
  disability_type: hospede.tipoDeficiencia || "",
  doc_type: hospede.tipoDocumento || "CPF",
  doc_number: hospede.tipoDocumento === "CPF" ? masks.cpf(hospede.numeroDocumento || '') : (hospede.numeroDocumento || ''),
  email: hospede.email || "",
  phone: hospede.telefone ? masks.phone(hospede.telefone) : "",
  residence_country: hospede.paisResidencia || "BR",
  zip: hospede.cep || "",
  address: hospede.logradouro || "",
  number: hospede.numeroEndereco || "",
  complement: hospede.complemento || "",
  neighborhood: hospede.bairro || "",
  city_ibge: hospede.codigoIbgeCidade || "",
  city_name: hospede.nomeCidade || "",
  state: hospede.estado || "",
});

// ============================================
// CONSTANTES - Domínios Oficiais FNRH
// ============================================
const DOMAINS = {
  genders: [
    { code: "", name: "Selecione..." },
    { code: "HOMEM", name: "Homem" },
    { code: "MULHER", name: "Mulher" },
    { code: "OUTRO", name: "Outro" },
    { code: "NAOINFORMADO", name: "Não Informado" }
  ],
  races: [
    { code: "", name: "Selecione..." },
    { code: "AMARELA", name: "Amarela" },
    { code: "BRANCA", name: "Branca" },
    { code: "INDIGENA", name: "Indígena" },
    { code: "PARDA", name: "Parda" },
    { code: "PRETA", name: "Preta" },
    { code: "NAOINFORMADO", name: "Não Informado" }
  ],
  disabilities: [
    { code: "", name: "Selecione..." },
    { code: "NAO", name: "Não" },
    { code: "SIM", name: "Sim" },
    { code: "NAOINFORMADO", name: "Não Informado" }
  ],
  disabilityTypes: [
    { code: "", name: "Selecione..." },
    { code: "FISICA", name: "Física" },
    { code: "AUDITIVA_SURDEZ", name: "Auditiva/Surdez" },
    { code: "VISUAL", name: "Visual" },
    { code: "INTELECTUAL", name: "Intelectual" },
    { code: "MULTIPLA", name: "Múltipla" }
  ],
  documentTypes: [
    { code: "CPF", name: "CPF" },
    { code: "PASSAPORTE", name: "Passaporte" }
  ],
  countries: [
    { code: "BR", name: "Brasil" },
    { code: "AR", name: "Argentina" },
    { code: "US", name: "Estados Unidos" },
    { code: "VE", name: "Venezuela" },
    { code: "PT", name: "Portugal" },
    { code: "ES", name: "Espanha" },
    { code: "FR", name: "França" },
    { code: "DE", name: "Alemanha" },
    { code: "IT", name: "Itália" },
    { code: "UK", name: "Reino Unido" },
    { code: "JP", name: "Japão" },
    { code: "CN", name: "China" },
    { code: "PY", name: "Paraguai" },
    { code: "UY", name: "Uruguai" },
    { code: "CL", name: "Chile" },
    { code: "CO", name: "Colômbia" }
  ]
};

const INITIAL_FORM_STATE = {
  name: "",
  social_name: "",
  nationality_country: "BR",
  gender: "",
  gender_description: "",
  birth_date: "",
  race: "",
  disability: "NAO",
  disability_type: "",
  doc_type: "CPF",
  doc_number: "",
  email: "",
  phone: "",
  residence_country: "BR",
  zip: "",
  address: "",
  number: "",
  complement: "",
  neighborhood: "",
  city_ibge: "",
  city_name: "",
  state: "",
};

export default function Guests() {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const obterNomeOperadorLogado = () => {
    return localStorage.getItem("usuario_nome") || "Usuario Desconhecido";
  };

  const loadGuests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/guests");
      const data = response.data || [];
      setGuests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao carregar hóspedes:", error);
      toast.error('Erro ao carregar lista de hóspedes');
      setGuests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGuests();
  }, [loadGuests]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  }, [errors]);

  const handleDocumentTypeChange = useCallback((e) => {
    setFormData(prev => ({
      ...prev,
      doc_type: e.target.value,
      doc_number: ""
    }));
    setErrors(prev => ({ ...prev, doc_number: undefined }));
  }, []);

  const handleCPFChange = useCallback((e) => {
    const rawValue = e.target.value;
    const maskedValue = masks.cpf(rawValue);
    setFormData(prev => ({ ...prev, doc_number: maskedValue }));
    if (errors.doc_number) {
      setErrors(prev => ({ ...prev, doc_number: undefined }));
    }
  }, [errors]);

  const handlePhoneChange = useCallback((e) => {
    const rawValue = e.target.value;
    const maskedValue = masks.phone(rawValue);
    setFormData(prev => ({ ...prev, phone: maskedValue }));
    if (errors.phone) {
      setErrors(prev => ({ ...prev, phone: undefined }));
    }
  }, [errors]);

  const handleCEPChange = useCallback((e) => {
    const rawValue = e.target.value;
    const maskedValue = masks.cep(rawValue);
    setFormData(prev => ({ ...prev, zip: maskedValue }));
    if (errors.zip) {
      setErrors(prev => ({ ...prev, zip: undefined }));
    }
  }, [errors]);

  const handleCEPBlur = useCallback(async (cep) => {
    const cleanCEP = masks.removeMask(cep);
    if (cleanCEP.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          address: data.logradouro || "",
          neighborhood: data.bairro || "",
          city_ibge: data.ibge || "",
          city_name: data.localidade || "",
          state: data.uf || "",
          complement: data.complemento || prev.complement
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    }
  }, []);

  const validateForm = useCallback(() => {
    const newErrors = {};

    // Apenas NOME é estritamente obrigatório agora
    if (!validators.required(formData.name)) 
      newErrors.name = "Nome é obrigatório";
    else if (formData.name.trim().length < 3)
      newErrors.name = "Nome deve ter no mínimo 3 caracteres";
    
    // Se digitou gênero OUTRO, precisa especificar
    if (formData.gender === "OUTRO" && !validators.required(formData.gender_description)) {
      newErrors.gender_description = "Especifique o gênero informado";
    }
    
    // Só valida o CPF se o usuário tiver digitado algo
    /*if (formData.doc_number && formData.doc_type === "CPF" && !validators.cpf(formData.doc_number)) {
      newErrors.doc_number = "CPF inválido";
    }*/
    
    // Só valida email, telefone e cep se o usuário tiver digitado algo
    if (formData.email && !validators.email(formData.email)) 
      newErrors.email = "Email inválido";
    
    if (formData.phone) {
      const cleanPhone = masks.removeMask(formData.phone);
      if (cleanPhone && !validators.phone(formData.phone))
        newErrors.phone = "Telefone deve ter 10 ou 11 dígitos";
    }
    
    if (formData.zip) {
      const cleanZip = masks.removeMask(formData.zip);
      if (cleanZip && cleanZip.length !== 8)
        newErrors.zip = "CEP deve ter 8 dígitos";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleOpenModal = useCallback((guest = null) => {
    if (guest) {
      setEditingId(guest.id);
      setFormData(mapearDoAPI(guest));
    } else {
      setEditingId(null);
      setFormData(INITIAL_FORM_STATE);
    }
    setErrors({});
    setOpen(true);
  }, []);

  const handleSave = useCallback(async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Verifique os campos obrigatórios', { duration: 3000 });
      return;
    }
    
    const toastId = toast.loading('Salvando...');
    setSaving(true);
    
    try {
      // PREENCHIMENTO AUTOMÁTICO DE DADOS FAKES SE VAZIOS
      const payloadData = { ...formData };
      
       if (!payloadData.doc_number) {
        // Agora passamos a lista de hóspedes para ele ler o que já existe
        payloadData.doc_number = generateTestCPF(guests); 
        payloadData.doc_type = "CPF";
      }
      if (!payloadData.birth_date) payloadData.birth_date = "1900-01-01";
      if (!payloadData.gender) payloadData.gender = "NAOINFORMADO";
      if (!payloadData.race) payloadData.race = "NAOINFORMADO";
      if (!payloadData.disability) payloadData.disability = "NAO";

      const dataToSave = mapearParaAPI(payloadData);

      if (editingId) {
        await api.put(`/guests/${editingId}`, dataToSave);
        toast.success('Hóspede atualizado com sucesso!', { id: toastId });
      } else {
        await api.post("/guests", dataToSave);
        toast.success('Hóspede cadastrado com sucesso!', { id: toastId });
      }
      
      await loadGuests();
      setOpen(false);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      
      if (error.response?.status === 409) {
        toast.error('CPF/Passaporte já cadastrado no sistema', { id: toastId });
      } else if (error.response?.status === 400 && error.response?.data?.errors) {
        const errorMessages = Object.entries(error.response.data.errors)
          .map(([field, msg]) => `${field}: ${msg}`)
          .join('\n');
        toast.error(errorMessages, { id: toastId, duration: 5000 });
        
        setErrors(prev => ({
          ...prev,
          ...error.response.data.errors,
        }));
      } else if (error.response?.status === 401) {
        toast.error('Sessão expirada. Faça login novamente.', { id: toastId });
      } else if (error.response?.status === 404) {
        toast.error('Hóspede não encontrado', { id: toastId });
      } else if (error.response?.status === 429) {
        toast.error('Muitas requisições. Aguarde um momento.', { id: toastId });
      } else {
        toast.error('Erro ao salvar. Tente novamente.', { id: toastId });
        setErrors(prev => ({ 
          ...prev, 
          submit: 'Erro ao salvar. Tente novamente.' 
        }));
      }
    } finally {
      setSaving(false);
    }
  }, [formData, editingId, validateForm, loadGuests]);

  const filteredGuests = guests.filter(g => 
    g.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.numeroDocumento?.includes(searchTerm) ||
    g.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredGuests.length / itemsPerPage);

  const paginatedGuests = filteredGuests.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const showDisabilityType = formData.disability === "SIM";
  const isCPF = formData.doc_type === "CPF";

  return (
    <div className="maintenance-container">
      <div className="pdv-page-header">
        <div className="pdv-title-group">
          <h1 className="pdv-main-title">Gestão de Hóspedes</h1>
          <p className="pdv-subtitle">Ficha Nacional de Registro de Hóspedes (FNRH)</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-pdv-primary">
          <i className='fas fa-user-plus'></i> Novo Hóspede
        </button>
      </div>

      <div className="fnrh-filter-bar">
        <div className="search-box-b">
          <i className="fas fa-search"></i>
          <input 
            type="text" 
            placeholder="Buscar por nome, documento ou email..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
      </div>

      <div className="table-card animate-in">
        {loading ? (
          <div className="loading-container">
            <i className="fas fa-spinner fa-spin"></i> Carregando hóspedes...
          </div>
        ) : (
          <>
            <table className="guests-table">
              <thead>
                <tr className="table-header-row">
                  <th>Hóspede</th>
                  <th>Contato / Email</th>
                  <th>Documento</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>

              <tbody>
                {filteredGuests.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ padding: '4px 4px' }}>
                      <div className="empty-state">
                        Nenhum hóspede encontrado
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedGuests.map((guest) => (
                    <tr key={guest.id} className="linha-manutencao">
                      <td>
                        <div className="guest-profile-cell">
                          <div className="guest-avatar">
                            {guest.nome?.charAt(0) || "?"}
                          </div>

                          <div>
                            <span className="dado-destaque">
                              {guest.nome}
                            </span>

                            {guest.nomeSocial && (
                              <span
                                className="dado-valor"
                                style={{
                                  display: 'block',
                                  fontSize: '11px'
                                }}
                              >
                                {guest.nomeSocial}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td>
                        {guest.telefone && (
                          <span
                            className="dado-valor"
                            style={{ display: 'block' }}
                          >
                            <i className="fab fa-whatsapp"></i>{" "}
                            {masks.phone(guest.telefone)}
                          </span>
                        )}

                        {guest.email && (
                          <span
                            className="dado-valor"
                            style={{
                              fontSize: '12px',
                              color: '#64748b'
                            }}
                          >
                            {guest.email}
                          </span>
                        )}
                      </td>

                      <td>
                        <span className="room-badge2">
                          {guest.tipoDocumento === "CPF"
                            ? masks.cpf(guest.numeroDocumento || '')
                            : guest.numeroDocumento}
                        </span>
                      </td>

                      <td className="text-right">
                        <button
                          className="btn-table-action-blue"
                          onClick={() => handleOpenModal(guest)}
                          title="Editar hóspede"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-page"
                >
                  Anterior
                </button>

                <span className="page-info">
                  Página {page} de {totalPages}
                </span>

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn-page"
                >
                  Próximo
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {open && (
        <Modal 
          title={editingId ? "Editar FNRH" : "Ficha Nacional de Registro de Hóspedes"} 
          onClose={() => setOpen(false)}
        >
          <form className="fnrh-form-modern" onSubmit={handleSave}>
            
            <div className="fnrh-section">
              <div className="fnrh-section-title">
                <i className="fas fa-user"></i> Dados Pessoais
              </div>
              
              <div className="form-grid">
                <div className={`input-group-mock full ${errors.name ? 'has-error' : ''}`}>
                  <label>Nome Completo *</label>
                  <input 
                    name="name" 
                    value={formData.name} 
                    onChange={handleChange} 
                    placeholder="Nome completo do hóspede"
                  />
                  {errors.name && <span className="field-error">{errors.name}</span>}
                </div>

                <div className="input-group-mock full">
                  <label>Nome Social</label>
                  <input 
                    name="social_name" 
                    value={formData.social_name} 
                    onChange={handleChange} 
                    placeholder="Nome social (opcional)"
                  />
                </div>

                <div style={{ 
                  gridColumn: '1 / -1', 
                  display: 'grid', 
                  gridTemplateColumns: formData.gender === 'OUTRO' ? '1fr 1fr 1fr' : '1fr 1fr', 
                  gap: '1rem' 
                }}>
                  <div className={`input-group-mock ${errors.birth_date ? 'has-error' : ''}`}>
                    <label>Data de Nascimento</label>
                    <input 
                      type="date" 
                      name="birth_date" 
                      value={formData.birth_date} 
                      onChange={handleChange}
                    />
                    {errors.birth_date && <span className="field-error">{errors.birth_date}</span>}
                  </div>

                  <div className={`input-group-mock ${errors.gender ? 'has-error' : ''}`}>
                    <label>Gênero</label>
                    <select name="gender" value={formData.gender} onChange={handleChange}>
                      {DOMAINS.genders.map(g => (
                        <option key={g.code} value={g.code}>{g.name}</option>
                      ))}
                    </select>
                    {errors.gender && <span className="field-error">{errors.gender}</span>}
                  </div>

                  {formData.gender === "OUTRO" && (
                    <div className={`input-group-mock ${errors.gender_description ? 'has-error' : ''}`}>
                      <label>Qual? (Descrição do Gênero) *</label>
                      <input 
                        name="gender_description" 
                        value={formData.gender_description} 
                        onChange={handleChange} 
                        placeholder="Especifique o gênero"
                      />
                      {errors.gender_description && <span className="field-error">{errors.gender_description}</span>}
                    </div>
                  )}
                </div>

                <div className="input-group-mock">
                  <label>País de Nacionalidade</label>
                  <select name="nationality_country" value={formData.nationality_country} onChange={handleChange}>
                    {DOMAINS.countries.map(c => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className={`input-group-mock ${errors.race ? 'has-error' : ''}`}>
                  <label>Raça/Etnia</label>
                  <select name="race" value={formData.race} onChange={handleChange}>
                    {DOMAINS.races.map(r => (
                      <option key={r.code} value={r.code}>{r.name}</option>
                    ))}
                  </select>
                  {errors.race && <span className="field-error">{errors.race}</span>}
                </div>

                <div className={`input-group-mock ${errors.disability ? 'has-error' : ''}`}>
                  <label>Deficiência</label>
                  <select name="disability" value={formData.disability} onChange={handleChange}>
                    {DOMAINS.disabilities.map(d => (
                      <option key={d.code} value={d.code}>{d.name}</option>
                    ))}
                  </select>
                  {errors.disability && <span className="field-error">{errors.disability}</span>}
                </div>

                {showDisabilityType && (
                  <div className={`input-group-mock ${errors.disability_type ? 'has-error' : ''}`}>
                    <label>Tipo de Deficiência *</label>
                    <select name="disability_type" value={formData.disability_type} onChange={handleChange}>
                      {DOMAINS.disabilityTypes.map(dt => (
                        <option key={dt.code} value={dt.code}>{dt.name}</option>
                      ))}
                    </select>
                    {errors.disability_type && <span className="field-error">{errors.disability_type}</span>}
                  </div>
                )}
              </div>
            </div>

            <div className="fnrh-section">
              <div className="fnrh-section-title">
                <i className="fas fa-id-card"></i> Documento de Identificação
              </div>
              
              <div className="form-grid">
                <div className="input-group-mock">
                  <label>Tipo de Documento</label>
                  <select 
                    name="doc_type" 
                    value={formData.doc_type} 
                    onChange={handleDocumentTypeChange}
                  >
                    {DOMAINS.documentTypes.map(dt => (
                      <option key={dt.code} value={dt.code}>{dt.name}</option>
                    ))}
                  </select>
                </div>

                <div className={`input-group-mock ${errors.doc_number ? 'has-error' : ''}`}>
                  <label>{isCPF ? "CPF" : "Número do Passaporte"}</label>
                  {isCPF ? (
                    <input 
                      name="doc_number" 
                      value={formData.doc_number} 
                      onChange={handleCPFChange}
                      placeholder="000.000.000-00 (Opcional)"
                      maxLength={14}
                    />
                  ) : (
                    <input 
                      name="doc_number" 
                      value={formData.doc_number} 
                      onChange={handleChange}
                      placeholder="Número do passaporte (Opcional)"
                    />
                  )}
                  {errors.doc_number && <span className="field-error">{errors.doc_number}</span>}
                </div>
              </div>
            </div>

            <div className="fnrh-section">
              <div className="fnrh-section-title">
                <i className="fas fa-envelope"></i> Contato
              </div>
              
              <div className="form-grid">
                <div className={`input-group-mock ${errors.email ? 'has-error' : ''}`}>
                  <label>E-mail</label>
                  <input 
                    type="email" 
                    name="email" 
                    value={formData.email} 
                    onChange={handleChange}
                    placeholder="email@exemplo.com (Opcional)"
                  />
                  {errors.email && <span className="field-error">{errors.email}</span>}
                </div>

                <div className={`input-group-mock ${errors.phone ? 'has-error' : ''}`}>
                  <label>Telefone</label>
                  <input 
                    type="tel" 
                    name="phone" 
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    placeholder="(00) 00000-0000 (Opcional)"
                    maxLength={15}
                  />
                  {errors.phone && <span className="field-error">{errors.phone}</span>}
                </div>
              </div>
            </div>

            <div className="fnrh-section">
              <div className="fnrh-section-title">
                <i className="fas fa-home"></i> Endereço de Residência
              </div>
              
              <div className="form-grid">
                <div className={`input-group-mock ${errors.zip ? 'has-error' : ''}`}>
                  <label>CEP</label>
                  <input 
                    name="zip" 
                    value={formData.zip}
                    onChange={handleCEPChange}
                    onBlur={(e) => handleCEPBlur(e.target.value)}
                    placeholder="00000-000 (Opcional)"
                    maxLength={9}
                  />
                  {errors.zip && <span className="field-error">{errors.zip}</span>}
                </div>

                <div className="input-group-mock">
                  <label>País</label>
                  <select name="residence_country" value={formData.residence_country} onChange={handleChange}>
                    {DOMAINS.countries.map(c => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="input-group-mock full">
                  <label>Logradouro</label>
                  <input 
                    name="address" 
                    value={formData.address} 
                    onChange={handleChange}
                    placeholder="Rua, Avenida..."
                  />
                </div>

                <div className="input-group-mock">
                  <label>Número</label>
                  <input 
                    name="number" 
                    value={formData.number} 
                    onChange={handleChange}
                    placeholder="Nº"
                  />
                </div>

                <div className="input-group-mock">
                  <label>Complemento</label>
                  <input 
                    name="complement" 
                    value={formData.complement} 
                    onChange={handleChange}
                    placeholder="Apto, Bloco..."
                  />
                </div>

                <div className="input-group-mock">
                  <label>Bairro</label>
                  <input 
                    name="neighborhood" 
                    value={formData.neighborhood} 
                    onChange={handleChange}
                    placeholder="Bairro"
                  />
                </div>

                <div className={`input-group-mock ${errors.city_ibge ? 'has-error' : ''}`}>
                  <label>Cidade (Código IBGE)</label>
                  <input 
                    name="city_ibge" 
                    value={formData.city_ibge} 
                    onChange={handleChange}
                    placeholder="Código IBGE (7 dígitos)"
                    maxLength={7}
                  />
                  {errors.city_ibge && <span className="field-error">{errors.city_ibge}</span>}
                </div>

                <div className="input-group-mock">
                  <label>Cidade</label>
                  <input 
                    name="city_name" 
                    value={formData.city_name} 
                    onChange={handleChange}
                    placeholder="Nome da cidade"
                  />
                </div>

                <div className={`input-group-mock ${errors.state ? 'has-error' : ''}`}>
                  <label>Estado (UF)</label>
                  <input 
                    name="state" 
                    value={formData.state} 
                    onChange={handleChange}
                    placeholder="UF"
                    maxLength={2}
                    style={{textTransform: 'uppercase'}}
                  />
                  {errors.state && <span className="field-error">{errors.state}</span>}
                </div>
              </div>
            </div>

            {errors.submit && (
              <div className="alert alert-error">
                <i className="fas fa-exclamation-triangle"></i> {errors.submit}
              </div>
            )}

            <div className="form-actions">
              <button 
                type="button" 
                onClick={() => setOpen(false)} 
                className="btn-cancel"
                disabled={saving}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="btn-save-fnrh"
                disabled={saving}
              >
                {saving ? (
                  <><i className="fas fa-spinner fa-spin"></i> Salvando...</>
                ) : (
                  <>{editingId ? "Atualizar Ficha" : "Finalizar Registro"}</>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}