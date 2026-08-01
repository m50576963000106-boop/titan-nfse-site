import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Exclusão de Dados — TITAN NFS-e",
  description:
    "Instruções para solicitar a exclusão de conta e de dados pessoais tratados pelo TITAN NFS-e e pelo Martyn.",
  alternates: { canonical: "/exclusao-de-dados" },
};

const ATUALIZACAO = "31 de julho de 2026";

export default function ExclusaoDeDados() {
  return (
    <main className="legal">
      <header className="legal-head">
        <div className="legal-in">
          <h1>Exclusão de Dados — TITAN NFS-e</h1>
          <p>Última atualização: {ATUALIZACAO}</p>
        </div>
      </header>

      <article className="legal-doc">
        <h2>1. Como solicitar</h2>
        <div className="legal-box">
          <p>
            Envie um e-mail para <b>nfse@titanbackoffice.com.br</b> com o assunto
            <b> “Solicitação de exclusão de dados”</b>.
          </p>
        </div>
        <ol>
          <li>Informe seu nome e o e-mail ou telefone usado no serviço.</li>
          <li>Identifique a empresa à qual seu acesso está vinculado.</li>
          <li>
            Diga se deseja excluir uma conversa do Martyn, encerrar uma conta ou exercer
            outro direito previsto na LGPD.
          </li>
        </ol>
        <p>
          Poderemos pedir informações adicionais estritamente necessárias para confirmar sua
          identidade e impedir a exclusão indevida de dados de outra pessoa ou empresa.
        </p>

        <h2>2. O que acontece após o pedido</h2>
        <p>
          Depois da validação, excluiremos ou anonimizaremos os dados abrangidos pela
          solicitação que não precisem ser mantidos. Também informaremos se alguma parte não
          puder ser eliminada imediatamente e a justificativa aplicável. O pedido será
          respondido nos prazos previstos na legislação.
        </p>

        <h2>3. Dados que podem precisar ser preservados</h2>
        <p>
          Documentos fiscais, registros contábeis, comprovantes, trilhas de auditoria, dados
          necessários à prevenção de fraude e informações relacionadas ao exercício regular de
          direitos podem ser mantidos durante os prazos legais ou regulatórios. Nesse período,
          o uso fica limitado às finalidades de preservação e segurança.
        </p>

        <h2>4. WhatsApp e Meta</h2>
        <p>
          A solicitação pode abranger dados de atendimento e conversas armazenados pela TITAN.
          Dados mantidos diretamente pela Meta ou pelo WhatsApp também devem ser administrados
          pelos controles e políticas disponibilizados por essas plataformas.
        </p>

        <h2>5. Controladora e contato</h2>
        <div className="legal-box">
          <p><b>TITAN BACKOFFICE SERVIÇOS ADMINISTRATIVOS LTDA</b></p>
          <p>Nome fantasia: TITAN SOLUÇÕES</p>
          <p>CNPJ 67.261.200/0001-79</p>
          <p>R. Frederico Müller, 510 — Campo Comprido</p>
          <p>Curitiba/PR — CEP 81.220-170</p>
          <p>E-mail: nfse@titanbackoffice.com.br · Telefone: (41) 3012-2998</p>
        </div>

        <p className="legal-foot">
          Consulte também nossa <Link href="/politica-de-privacidade">Política de Privacidade</Link>
          {" "}e os <Link href="/termos-de-uso">Termos de Uso</Link>.
        </p>
      </article>
    </main>
  );
}
