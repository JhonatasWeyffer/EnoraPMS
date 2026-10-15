export default function Support() {
  // Array com os 4 integrantes da equipe, suas especialidades e links
  const atendentes = [
    {
      id: 1,
      nome: "Carlos Silva",
      especialidade: "Suporte em Relatórios e XML",
      foto: "../img/atendente5.png", // Substitua pelos seus caminhos de imagem
      link: "https://wa.me/5592992396793" // Seu número atual
    },
    {
      id: 2,
      nome: "Clara Deodato",
      especialidade: "Suporte em Acessos e Login",
      foto: "../img/atendente1.png", // Substitua pelos seus caminhos de imagem
      link: "https://wa.me/5592992919025" // Seu número atual
    },
    {
      id: 3,
      nome: "Elklem Silva",
      especialidade: "Suporte em Orientações de Uso",
      foto: "../img/atendente2.png",
      link: "https://wa.me/5592933003912"
    },
    {
      id: 4,
      nome: "Jonatas Weyffer",
      especialidade: "Suporte em Dúvidas Gerais",
      foto: "../img/atendente3.png",
      link: "https://wa.me/5592992752825"
    },
    {
      id: 5,
      nome: "Marcos Santos",
      especialidade: "Suporte ao Banco de dados",
      foto: "../img/atendente4.png",
      link: "https://wa.me/5592985419002"
    }
  ];

  return (
    <div className="support-wrapper">
        <a href="/login" className="btn-voltar">VOLTAR</a>
        
        <div className="box-texto">
            <p className="mensagem">
                Para recuperar seu acesso ou tirar dúvidas, escolha um de nossos atendentes especializados abaixo.
                Nosso atendimento funciona 12 horas por dia e o tempo médio de resposta é de até 30 minutos.*
            </p>
            <i className="bx bx-support icon-suporte"></i>
        </div>

        {/* Container que vai alinhar os 4 cards lado a lado */}
        <div className="container-atendentes">
            {atendentes.map((atendente) => (
                <div className="box-atendente" key={atendente.id}>
                    <img src={atendente.foto} alt={atendente.nome} className="foto-atendente" />
                    <h2 className="nome-atendente">{atendente.nome}</h2>
                    <p className="especialidade-atendente">{atendente.especialidade}</p>
                    <p className="descricao-contato">Contato do WhatsApp</p>
                    
                    <a 
                        href={atendente.link} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="btn-whatsapp"
                    > 
                        Falar com {atendente.nome.split(' ')[0]}
                    </a>
                </div>
            ))}
            <div>
              <p className="rodape">*Caso um dos nossos atendentes não esteja disponível qualquer outro está apto a sanar dúvidas.</p>
            </div>
        </div>
    </div>
  );
}