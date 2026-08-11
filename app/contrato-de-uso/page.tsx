import type { Metadata } from "next";
import Link from "next/link";
import LegalPageHeader from "../legal-page-header";

export const metadata: Metadata = {
  title: "Contrato de Prestação de Serviços de Sessão de Uso do TITAN NFS-e",
  description:
    "Condições comerciais de contratação, pagamento, ativação e renovação dos planos do TITAN NFS-e.",
  alternates: { canonical: "/contrato-de-uso" },
};

const ATUALIZACAO = "10 de agosto de 2026";

export default function ContratoDeUso() {
  return (
    <main className="legal">
      <LegalPageHeader title="Contrato de Prestação de Serviços de Sessão de Uso" updatedAt={ATUALIZACAO} />

      <article className="legal-doc" id="conteudo">
        <h2>1. Partes e definições</h2>
        <p><b>CONTRATADA:</b></p>
        <div className="legal-box">
          <p><b>TITAN BACKOFFICE SERVIÇOS ADMINISTRATIVOS LTDA</b></p>
          <p>Nome fantasia: TITAN SOLUÇÕES</p>
          <p>CNPJ 67.261.200/0001-79</p>
          <p>R. Frederico Müller, 510, Campo Comprido</p>
          <p>Curitiba/PR, CEP 81.220-170</p>
          <p>E-mail: nfse@titanbackoffice.com.br. Telefone: (41) 3790-0311</p>
        </div>
        <p>
          <b>CONTRATANTE:</b> a empresa que contrata ou faz upgrade de um plano do TITAN NFS-e
          pelo portal, identificada pelo CNPJ e pelos dados cadastrais informados no momento da
          adesão.
        </p>
        <p>
          <b>Sessão de Uso:</b> o direito de acesso e utilização do sistema TITAN NFS-e concedido
          à CONTRATANTE durante a vigência do plano contratado, nos termos e limites deste
          Contrato.
        </p>

        <h2>2. Objeto</h2>
        <p>
          Este Contrato regula a licença de uso, não exclusiva e intransferível, do sistema
          TITAN NFS-e, referente ao plano selecionado pela CONTRATANTE no momento da contratação
          inicial ou de um upgrade, com as características (preço, limite mensal de notas
          autorizadas e ferramentas incluídas) apresentadas na tela de Planos do portal na data
          da adesão.
        </p>
        <p>
          Cada contratação inicial e cada upgrade de plano têm por objeto especificamente o
          plano então selecionado e aceito, sendo regidos por estas mesmas condições gerais,
          aplicadas ao plano vigente a cada momento. Um upgrade não cria um contrato novo: ele
          substitui o objeto deste, passando a Sessão de Uso a corresponder ao novo plano.
        </p>

        <h2>3. Contratação, upgrade e aceite</h2>
        <p>
          Ao selecionar um plano e confirmar a contratação, ou ao solicitar um upgrade de plano
          pelo portal, a CONTRATANTE declara ter lido e aceito este Contrato, os{" "}
          <Link href="/termos-de-uso">Termos de Uso</Link> e a{" "}
          <Link href="/politica-de-privacidade">Política de Privacidade</Link>.
        </p>
        <div className="legal-box">
          <p>
            A confirmação do pagamento referente à contratação ou ao upgrade constitui{" "}
            <b>aceite formal das condições comerciais do plano correspondente</b>. O comprovante
            de pagamento e a respectiva confirmação ficam registrados no histórico de
            contratações da empresa, disponível no portal, e servem como evidência desse aceite.
          </p>
        </div>

        <h2>4. Forma de pagamento</h2>
        <p>
          O pagamento pode ser feito via Pix, com compensação imediata, ou, quando
          disponibilizado pela TITAN, por cartão de crédito, conforme o prazo de confirmação da
          operadora responsável. A identificação do pagamento costuma ocorrer em até{" "}
          <b>24 horas</b> após o envio à instituição financeira.
        </p>
        <p>
          Enquanto o pagamento não for identificado, a solicitação de contratação ou de upgrade{" "}
          <b>permanece pendente, sem prazo de expiração automático</b>: a CONTRATANTE pode
          concluir o pagamento a qualquer momento para que o plano seja ativado, ou cancelar a
          solicitação a qualquer momento antes da confirmação.
        </p>

        <h2>5. Ativação</h2>
        <p>
          A confirmação do pagamento é recebida da instituição financeira integrada ao sistema
          TITAN, que libera automaticamente o acesso ao plano contratado ou à mudança de plano,
          sem necessidade de nova ação da CONTRATANTE. Enquanto a integração automática estiver
          em implantação, a liberação pode ser feita manualmente pela equipe TITAN logo após a
          confirmação do pagamento, sem alterar as condições deste Contrato.
        </p>

        <h2>6. Vigência e renovação</h2>
        <p>
          A Sessão de Uso tem vigência mensal, renovada automaticamente ao fim de cada ciclo
          pelas mesmas condições do plano vigente, salvo cancelamento pela CONTRATANTE ou
          upgrade para um novo plano.
        </p>

        <h2>7. Atraso na renovação</h2>
        <p>
          O item 4 trata da contratação inicial e do upgrade, que não expiram sozinhos enquanto
          aguardam pagamento. Já o atraso no pagamento da renovação de um plano já ativo pode
          suspender novas emissões após o prazo de tolerância informado no portal, sem prejuízo
          da preservação de documentos e dados já emitidos, conforme obrigações legais.
        </p>

        <h2>8. Upgrade e downgrade</h2>
        <p>
          A CONTRATANTE pode solicitar upgrade de plano a qualquer momento pelo portal. A TITAN
          analisa e aprova a solicitação, e a mudança passa a valer conforme os itens 3 a 5
          acima. Pedidos de mudança para um plano de menor valor seguem o mesmo fluxo de
          solicitação e análise.
        </p>

        <h2>9. Uso do sistema e demais regras</h2>
        <p>
          Conta, segurança, certificado digital, responsabilidade fiscal, uso proibido,
          disponibilidade, limitação de responsabilidade e propriedade intelectual seguem os{" "}
          <Link href="/termos-de-uso">Termos de Uso</Link> do TITAN NFS-e, aplicáveis em conjunto
          com este Contrato.
        </p>

        <h2>10. Privacidade</h2>
        <p>
          O tratamento de dados pessoais segue a{" "}
          <Link href="/politica-de-privacidade">Política de Privacidade</Link>.
        </p>

        <h2>11. Cancelamento</h2>
        <p>
          A CONTRATANTE pode cancelar a qualquer momento pelo e-mail de contato, mantendo acesso
          até o fim do ciclo pago vigente. Dados sujeitos a obrigações fiscais ou legais serão
          preservados pelos prazos aplicáveis.
        </p>

        <h2>12. Alterações deste Contrato</h2>
        <p>
          Este Contrato pode ser atualizado por razões comerciais, legais ou operacionais, com
          publicação da versão vigente nesta página. Alterações relevantes de preço são
          comunicadas com antecedência razoável, permitindo o cancelamento antes da cobrança do
          novo valor.
        </p>

        <h2>13. Lei e foro</h2>
        <p>
          Este Contrato é regido pela lei brasileira, com foro em Curitiba/PR, salvo foro
          legalmente assegurado ao consumidor.
        </p>

        <h2>14. Contato</h2>
        <p>
          Dúvidas sobre este Contrato: <b>nfse@titanbackoffice.com.br</b>. Telefone: (41) 3790-0311
        </p>

        <p className="legal-foot">
          TITAN BACKOFFICE SERVIÇOS ADMINISTRATIVOS LTDA, CNPJ 67.261.200/0001-79
          <br />
          R. Frederico Müller, 510, Campo Comprido, Curitiba/PR, CEP 81.220-170
          <br />
          Veja também os <Link href="/termos-de-uso">Termos de Uso</Link> e a{" "}
          <Link href="/politica-de-privacidade">Política de Privacidade</Link>.
        </p>
      </article>
    </main>
  );
}
