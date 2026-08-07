import type { Metadata } from "next";
import Link from "next/link";
import LegalPageHeader from "../legal-page-header";

export const metadata: Metadata = {
  title: "Política de Privacidade do TITAN NFS-e",
  description:
    "Como o TITAN NFS-e trata os dados pessoais de clientes, usuários e tomadores de serviço, conforme a LGPD.",
};

const ATUALIZACAO = "31 de julho de 2026";

export default function Privacidade() {
  return (
    <main className="legal">
      <LegalPageHeader title="Política de Privacidade" updatedAt={ATUALIZACAO} />

      <article className="legal-doc" id="conteudo">
        <h2>1. Quem é o responsável pelos seus dados</h2>
        <p>O TITAN NFS-e é operado por:</p>
        <div className="legal-box">
          <p><b>TITAN BACKOFFICE SERVIÇOS ADMINISTRATIVOS LTDA</b></p>
          <p>Nome fantasia: TITAN SOLUÇÕES</p>
          <p>CNPJ 67.261.200/0001-79</p>
          <p>R. Frederico Müller, 510, Campo Comprido</p>
          <p>Curitiba/PR, CEP 81.220-170</p>
          <p>E-mail: nfse@titanbackoffice.com.br. Telefone: (41) 3790-0311</p>
        </div>
        <p>
          Nesta política, “nós” se refere à Titan Backoffice e “você” se refere à pessoa ou
          empresa que usa o TITAN NFS-e.
        </p>

        <h2>2. Dois papéis diferentes que exercemos</h2>
        <p>Essa distinção é importante e define seus direitos:</p>
        <ul>
          <li>
            <b>Somos controladores</b> dos dados da sua conta e da sua empresa. Isso inclui
            cadastro, acesso, cobrança e suporte. Decidimos como tratá-los.
          </li>
          <li>
            <b>Somos operadores</b> dos dados que você insere no sistema sobre <b>seus
            clientes</b> (os tomadores dos serviços). Esses dados são seus; nós apenas os
            processamos conforme você determina, para emitir as notas que você pede.
          </li>
        </ul>
        <p>
          Se você é tomador de um serviço e teve seus dados incluídos numa nota fiscal
          emitida pelo TITAN, o responsável por esses dados é o prestador que emitiu a nota.
          Procure-o diretamente. Podemos ajudar a encaminhar o pedido.
        </p>

        <h2>3. Que dados tratamos</h2>

        <h3>3.1 Dados da sua conta</h3>
        <ul>
          <li>Nome e e-mail</li>
          <li>
            Senha armazenada apenas como código embaralhado irreversível (<code>scrypt</code>).
            Nunca guardamos sua senha de forma legível.
          </li>
          <li>
            Registros de acesso, incluindo tentativas de login malsucedidas, usados para
            alertar você sobre acesso suspeito
          </li>
        </ul>

        <h3>3.2 Dados da sua empresa</h3>
        <ul>
          <li>CNPJ, razão social, nome fantasia e inscrição municipal</li>
          <li>Endereço, município, regime tributário</li>
          <li>E-mail e telefone de contato</li>
        </ul>

        <h3>3.3 Certificado digital</h3>
        <p>
          Se você enviar seu certificado A1, guardamos o arquivo e a senha <b>cifrados</b>
          (AES-256-GCM), usados exclusivamente para assinar as notas que você mandar emitir.
          Detalhes no item 7.
        </p>

        <h3>3.4 Dados dos seus clientes (tomadores)</h3>
        <ul>
          <li>Nome ou razão social, CPF ou CNPJ</li>
          <li>E-mail, telefone e endereço, quando informados</li>
        </ul>

        <h3>3.5 Dados fiscais</h3>
        <ul>
          <li>Descrição do serviço, valores, tributos e retenções</li>
          <li>Notas emitidas, canceladas ou substituídas, com seus XMLs e DANFSe</li>
          <li>Registro das decisões fiscais do sistema, para auditoria</li>
        </ul>

        <h3>3.6 Registros de auditoria</h3>
        <p>
          Guardamos quem fez o quê e quando dentro do sistema. O registro abrange criação de
          usuário, mudança de permissão, emissão e cancelamento. Isso protege você e pode ser
          exigido em uma fiscalização.
        </p>

        <p>
          <b>Não coletamos</b> dados sensíveis (origem racial, religião, opinião política,
          saúde, biometria) e não fazemos perfilamento comportamental para publicidade.
        </p>

        <h2>4. Por que tratamos cada dado</h2>
        <div className="legal-table-wrap">
          <table>
            <thead>
              <tr><th>Finalidade</th><th>Base legal (LGPD)</th></tr>
            </thead>
            <tbody>
              <tr><td>Dar acesso ao sistema e emitir as notas que você solicita</td><td>Execução de contrato (art. 7º, V, da LGPD)</td></tr>
              <tr><td>Transmitir a NFS-e ao ambiente nacional e guardar o documento fiscal</td><td>Obrigação legal ou regulatória (art. 7º, II, da LGPD)</td></tr>
              <tr><td>Proteger a conta: alertas de login suspeito, limites de tentativa, auditoria</td><td>Legítimo interesse (art. 7º, IX, da LGPD)</td></tr>
              <tr><td>Cobrança de mensalidade e controle de plano</td><td>Execução de contrato (art. 7º, V, da LGPD)</td></tr>
              <tr><td>Suporte técnico e comunicação sobre o serviço</td><td>Execução de contrato (art. 7º, V, da LGPD)</td></tr>
              <tr><td>Integrações opcionais que você ativar (e-mail, arquivamento, WhatsApp)</td><td>Consentimento (art. 7º, I, da LGPD)</td></tr>
            </tbody>
          </table>
        </div>

        <h2>5. Com quem compartilhamos</h2>
        <p>
          Não vendemos seus dados, nem os cedemos para publicidade. Compartilhamos apenas com
          quem é necessário para o serviço funcionar:
        </p>

        <h3>5.1 Órgãos públicos (obrigatório por lei)</h3>
        <div className="legal-table-wrap">
          <table>
            <thead><tr><th>Destinatário</th><th>O que recebe</th></tr></thead>
            <tbody>
              <tr><td>Sefin Nacional / ADN (Ambiente Nacional da NFS-e)</td><td>Os dados da nota fiscal, como exige a legislação</td></tr>
              <tr><td>Receita Federal (via BrasilAPI)</td><td>CNPJ consultado, para preencher dados cadastrais</td></tr>
              <tr><td>IBGE</td><td>Consulta ao catálogo de municípios (sem dados pessoais)</td></tr>
            </tbody>
          </table>
        </div>

        <h3>5.2 Fornecedores de tecnologia</h3>
        <div className="legal-table-wrap">
          <table>
            <thead><tr><th>Fornecedor</th><th>Para quê</th><th>Onde</th></tr></thead>
            <tbody>
              <tr><td>Neon</td><td>Banco de dados</td><td>Exterior</td></tr>
              <tr><td>Render</td><td>Hospedagem do servidor</td><td>Exterior</td></tr>
              <tr><td>Cloudflare</td><td>Hospedagem e entrega do site</td><td>Global</td></tr>
              <tr><td>Resend</td><td>Envio de e-mails do sistema</td><td>Exterior</td></tr>
              <tr><td>Cohere</td><td>Assistente Martyn (ver 5.3)</td><td>Exterior</td></tr>
            </tbody>
          </table>
        </div>

        <h3>5.3 Sobre o Martyn, nosso assistente</h3>
        <p>
          Quando uma emissão falha e você pede ajuda ao Martyn, <b>o texto da mensagem de
          erro</b> é enviado ao serviço de inteligência artificial da Cohere para gerar a
          explicação. Não enviamos seu certificado, sua senha nem sua base de clientes. No
          entanto, a mensagem de erro devolvida pelo órgão fiscal pode conter dados da nota,
          como um CPF ou CNPJ inválido. Se preferir não usar esse recurso, basta não acioná-lo.
        </p>

        <h3>5.4 Integrações que só funcionam se você ativar</h3>
        <p>
          Ficam desligadas por padrão. Ao ativá-las, você autoriza o envio dos dados
          necessários a: Google (envio de notas por Gmail e arquivamento no Drive), Microsoft
          (envio por Outlook), Nubank (conciliação de cobranças) e Meta (atendimento por
          WhatsApp).
        </p>

        <h3>5.5 Transferência internacional</h3>
        <p>
          Parte dos fornecedores acima está fora do Brasil. Essas transferências ocorrem para
          executar o contrato com você, conforme o Art. 33 da LGPD, e exigimos de cada
          fornecedor compromissos contratuais de proteção equivalentes.
        </p>

        <h2>6. Por quanto tempo guardamos</h2>
        <div className="legal-table-wrap">
          <table>
            <thead><tr><th>Dado</th><th>Prazo</th></tr></thead>
            <tbody>
              <tr><td>Notas fiscais, XMLs e registros fiscais</td><td>5 anos, por exigência da legislação tributária</td></tr>
              <tr><td>Registros de auditoria</td><td>5 anos</td></tr>
              <tr><td>Dados de conta e cadastro</td><td>Enquanto a conta existir, e por 5 anos após o encerramento</td></tr>
              <tr><td>Certificado digital</td><td>Até você removê-lo ou o certificado vencer</td></tr>
            </tbody>
          </table>
        </div>

        <h2>7. Como protegemos</h2>
        <ul>
          <li>
            <b>Certificado digital e configurações sensíveis</b> ficam cifrados com
            AES-256-GCM. A chave não fica no banco de dados.
          </li>
          <li><b>Senhas</b> nunca são armazenadas de forma legível.</li>
          <li><b>Tráfego</b> sempre por conexão criptografada (HTTPS).</li>
          <li>
            <b>Separação por empresa:</b> cada CNPJ só enxerga os próprios dados, com a
            checagem feita no servidor.
          </li>
          <li>
            <b>Alerta de acesso suspeito:</b> após tentativas de senha erradas, avisamos por
            e-mail o titular da conta.
          </li>
          <li><b>Trilha de auditoria</b> de todas as ações relevantes.</li>
        </ul>
        <p>
          Nenhum sistema é infalível. Em caso de incidente com risco relevante, comunicaremos
          você e a ANPD nos prazos da lei.
        </p>

        <h2>8. Seus direitos</h2>
        <p>
          A LGPD garante a você: confirmação de tratamento, acesso, correção, anonimização ou
          eliminação de dados desnecessários, portabilidade, informação sobre
          compartilhamentos, revogação de consentimento e revisão de decisões automatizadas.
        </p>
        <p>
          Para exercer, escreva para <b>nfse@titanbackoffice.com.br</b>. Respondemos em até 15
          dias.
        </p>
        <p>
          Um limite honesto: dados de notas fiscais já emitidas <b>não podem ser apagados</b> a
          pedido, porque a lei tributária obriga a guardá-los. Nesses casos explicaremos o
          motivo da recusa.
        </p>

        <h2>9. Cookies e armazenamento no navegador</h2>
        <p>
          O TITAN não usa cookies de publicidade nem rastreadores de terceiros. Usamos apenas
          armazenamento local do navegador para manter sua sessão ativa enquanto você trabalha.
          Ao fechar o navegador, a sessão é encerrada.
        </p>

        <h2>10. Menores de idade</h2>
        <p>
          O TITAN é uma ferramenta empresarial, destinada a maiores de 18 anos. Não coletamos
          intencionalmente dados de crianças e adolescentes.
        </p>

        <h2>11. Mudanças nesta política</h2>
        <p>
          Se alterarmos esta política de forma relevante, avisaremos pelo sistema ou por
          e-mail antes de a mudança valer. A data no topo indica a última revisão.
        </p>

        <h2>12. Encarregado pelo tratamento de dados</h2>
        <p>
          Conforme o Art. 41 da LGPD, o encarregado (DPO) pelo tratamento de dados pessoais é:
        </p>
        <div className="legal-box">
          <p><b>Marlon Garcia Beira</b></p>
          <p>E-mail: nfse@titanbackoffice.com.br</p>
        </div>

        <h2>13. Contato</h2>
        <p>
          Dúvidas sobre esta política ou sobre seus dados:{" "}
          <b>nfse@titanbackoffice.com.br</b>. Telefone: (41) 3790-0311
        </p>

        <p className="legal-foot">
          TITAN BACKOFFICE SERVIÇOS ADMINISTRATIVOS LTDA, CNPJ 67.261.200/0001-79
          <br />
          R. Frederico Müller, 510, Campo Comprido, Curitiba/PR, CEP 81.220-170
          <br />
          Veja também os <Link href="/termos-de-uso">Termos de Uso</Link>.
        </p>
      </article>
    </main>
  );
}
