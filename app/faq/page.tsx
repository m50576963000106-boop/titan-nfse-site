import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Dúvidas frequentes — TITAN NFS-e",
  description:
    "Perguntas frequentes sobre a migração para o Portal Nacional da NFS-e, planos, certificado digital e o assistente Martyn.",
  alternates: { canonical: "/faq" },
};

const PERGUNTAS = [
  {
    pergunta: "Preciso mesmo migrar até 01/09?",
    resposta:
      "Sim. A partir de 01 de setembro, empresas do Simples Nacional e MEI passam a emitir pelo Portal Nacional da NFS-e. O TITAN já está pronto para esse fluxo.",
  },
  {
    pergunta: "Preciso saber o código de tributação ou NBS do meu serviço?",
    resposta:
      "Não. Você escolhe o serviço numa lista e o TITAN indica automaticamente as opções mais próximas pela descrição — sem precisar decorar código nenhum.",
  },
  {
    pergunta: "Minha contabilidade continua responsável pelos impostos?",
    resposta:
      "Sim. O TITAN organiza clientes, notas e XMLs num pacote pronto para a contabilidade — ele não substitui o seu contador, só facilita o trabalho de ambos.",
  },
  {
    pergunta: "Posso testar antes de contratar de verdade?",
    resposta:
      "Sim. O ambiente de Produção Restrita simula toda a emissão sem gerar documentos com validade fiscal, para você validar o fluxo com calma.",
  },
  {
    pergunta: "E se eu ultrapassar o limite do meu plano?",
    resposta:
      "Sem problema — é só migrar para o plano seguinte ou pedir um limite personalizado. Fale com a gente a qualquer momento.",
  },
  {
    pergunta: "Preciso trocar de certificado digital?",
    resposta:
      "Não necessariamente. Você usa o certificado que já tem — o TITAN cuida da assinatura da nota a partir dele.",
  },
  {
    pergunta: "Dá para emitir e cancelar notas pelo WhatsApp?",
    resposta:
      "Dá sim. O Martyn coleta os dados no chat, confirma um resumo com você e só emite depois de um \"sim\" explícito — o mesmo vale para cancelamento. Depois de autorizada ou cancelada, o PDF e o link do XML chegam automaticamente no WhatsApp e por e-mail.",
  },
];

export default function Faq() {
  return (
    <main className="legal">
      <a className="legal-skip-link" href="#conteudo">Ir para o conteúdo</a>
      <header className="legal-header">
        <div className="legal-nav-shell">
          <nav className="legal-nav" aria-label="Navegação principal">
            <Link className="legal-brand" href="/" aria-label="Página inicial do TITAN NFS-e">
              <img src="/titan-nfse-logo-transparent.png" alt="TITAN NFS-e" />
            </Link>
            <Link className="legal-home-button" href="/">Voltar ao TITAN</Link>
          </nav>
        </div>
        <div className="legal-head">
          <div className="legal-in">
            <p className="legal-eyebrow">Central de ajuda</p>
            <h1>Dúvidas frequentes</h1>
            <p className="legal-updated">O que mais perguntam empresas do Simples Nacional e MEI se preparando para 01/09.</p>
          </div>
        </div>
      </header>

      <div className="faq-doc" id="conteudo">
        <div className="faq-list">
          {PERGUNTAS.map((item) => (
            <details className="faq-item" key={item.pergunta}>
              <summary>{item.pergunta}</summary>
              <p>{item.resposta}</p>
            </details>
          ))}
        </div>
      </div>
      <p className="faq-more">
        Não achou o que precisava? Fale com a gente na{" "}
        <Link href="/#contratar">página inicial</Link> ou peça ajuda ao{" "}
        <Link href="/martyn_ia">Martyn</Link>.
      </p>
    </main>
  );
}
