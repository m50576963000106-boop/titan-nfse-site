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
    pergunta: "Quanto tempo leva para minha nota ser autorizada depois que eu emito?",
    resposta:
      "Na maioria das vezes, segundos. O TITAN manda a nota pra Sefin Nacional assim que você confirma, e o retorno (autorizada ou rejeitada) chega no histórico — sem precisar ficar atualizando a tela.",
  },
  {
    pergunta: "Errei um dado na nota — dá para corrigir depois de já ter emitido?",
    resposta:
      "NFS-e autorizada não pode ser editada, só cancelada (dentro do prazo permitido) e emitida de novo, certinha. O TITAN reaproveita os dados da nota original pra você não digitar tudo de novo.",
  },
  {
    pergunta: "Dá para cancelar uma nota já emitida?",
    resposta:
      "Dá, pelo portal ou pelo WhatsApp com o Martyn, respeitando o prazo definido pelo município. O PDF e o XML atualizados (já com o cancelamento) ficam disponíveis assim que você confirmar.",
  },
  {
    pergunta: "O que é o DANFSe e para que ele serve?",
    resposta:
      "É o PDF de representação da NFS-e — o documento que você entrega pro seu cliente. A nota fiscal em si é o XML autorizado pela Sefin; o DANFSe é só a versão legível dele.",
  },
  {
    pergunta: "Meu cliente recebe a nota automaticamente, ou eu preciso enviar?",
    resposta:
      "Se o e-mail do tomador estiver cadastrado, o TITAN manda o PDF e o link do XML sozinho assim que a nota é autorizada. Pelo WhatsApp com o Martyn, os dois chegam no próprio chat.",
  },
  {
    pergunta: "Posso emitir nota para pessoa física, só com CPF?",
    resposta:
      "Pode. O cadastro do tomador aceita CPF ou CNPJ — o TITAN valida o dígito verificador antes de mandar pra Sefin, pra você não descobrir o erro só depois da rejeição.",
  },
  {
    pergunta: "E se a Sefin rejeitar a nota que eu emiti?",
    resposta:
      "O TITAN mostra o motivo da rejeição em português (não só o código técnico da Sefin) e deixa você corrigir e reenviar na hora, sem perder os dados que já tinha preenchido.",
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
