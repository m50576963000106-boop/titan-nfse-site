import type { Metadata } from "next";
import Link from "next/link";
import LegalPageHeader from "../legal-page-header";

export const metadata: Metadata = {
  title: "Termos de Uso do TITAN NFS-e",
  description:
    "Condições de uso do TITAN NFS-e: responsabilidades, planos, certificado digital, disponibilidade e cancelamento.",
};

const ATUALIZACAO = "31 de julho de 2026";

export default function Termos() {
  return (
    <main className="legal">
      <LegalPageHeader title="Termos de Uso" updatedAt={ATUALIZACAO} />

      <article className="legal-doc" id="conteudo">
        <h2>1. Quem somos e o que é este documento</h2>
        <p>
          O TITAN NFS-e é um sistema de emissão de Nota Fiscal de Serviço eletrônica no Padrão
          Nacional, operado por:
        </p>
        <div className="legal-box">
          <p><b>TITAN BACKOFFICE SERVIÇOS ADMINISTRATIVOS LTDA</b></p>
          <p>Nome fantasia: TITAN SOLUÇÕES</p>
          <p>CNPJ 67.261.200/0001-79</p>
          <p>R. Frederico Müller, 510, Campo Comprido</p>
          <p>Curitiba/PR, CEP 81.220-170</p>
          <p>E-mail: nfse@titanbackoffice.com.br. Telefone: (41) 3012-2998</p>
        </div>
        <p>
          Estes Termos regem o uso do sistema. Ao criar uma conta, aceitar um convite de acesso
          ou emitir qualquer documento pelo TITAN, você declara que leu, entendeu e concorda com
          o que está escrito aqui.
        </p>
        <p>
          O tratamento de dados pessoais é descrito na{" "}
          <Link href="/politica-de-privacidade">Política de Privacidade</Link>, que faz parte destes Termos.
        </p>

        <h2>2. O que o TITAN faz e quais são os limites do serviço</h2>
        <p>
          <b>O TITAN é uma ferramenta de emissão.</b> Ele monta o documento fiscal a partir dos
          dados que você informa, assina com o seu certificado digital e transmite ao ambiente
          nacional da NFS-e. Também guarda os documentos emitidos, gera o DANFSe e envia notas
          por e-mail.
        </p>
        <p>
          <b>O TITAN não é escritório de contabilidade e não presta consultoria fiscal ou
          tributária.</b> As sugestões automáticas do sistema, incluindo as do assistente
          Martyn e do motor de retenções, oferecem apoio operacional e não constituem parecer
          profissional. A decisão sobre o que emitir, com quais valores, tributos e retenções,
          é sua e do seu contador.
        </p>
        <p>
          <b>Cálculo de ISS municipal.</b> O motor fiscal automatiza as retenções federais
          (INSS, IRRF, CSLL, PIS e COFINS) e as validações estruturais do documento. O ISS
          municipal <b>não é calculado automaticamente</b>: os valores e alíquotas de ISS são
          informados por você. Confira sempre com a legislação do seu município.
        </p>

        <h2>3. Quem pode usar</h2>
        <ul>
          <li>Pessoa jurídica com CNPJ ativo, ou pessoa física maior de 18 anos legalmente habilitada a emitir NFS-e</li>
          <li>Que possua certificado digital válido e inscrição municipal regular</li>
          <li>Que esteja habilitada a emitir NFS-e no Padrão Nacional para o seu município</li>
        </ul>
        <p>
          Podemos recusar ou encerrar cadastros que não atendam a esses requisitos ou que
          apresentem indício de uso fraudulento.
        </p>

        <h2>4. Sua conta e seus acessos</h2>
        <ul>
          <li>
            As credenciais são <b>pessoais e intransferíveis</b>. Cada usuário deve ter seu
            próprio acesso. Contas compartilhadas comprometem a trilha de auditoria.
          </li>
          <li>
            Você é responsável por tudo que for feito com as suas credenciais, inclusive
            emissões, cancelamentos e alterações de permissão.
          </li>
          <li>
            O administrador da empresa é responsável por conceder, revisar e revogar os acessos
            da sua equipe.
          </li>
          <li>
            Avise imediatamente pelo e-mail de contato se suspeitar de acesso indevido. O
            sistema envia alerta automático após tentativas de senha malsucedidas.
          </li>
        </ul>

        <h2>5. Certificado digital</h2>
        <p>
          Para emitir, você precisa enviar seu certificado digital A1 e a respectiva senha. Ao
          fazê-lo, você:
        </p>
        <ul>
          <li>
            Declara ser o titular do certificado ou ter autorização expressa do titular para
            usá-lo;
          </li>
          <li>
            <b>Autoriza o TITAN a usar o certificado exclusivamente</b> para assinar e
            transmitir os documentos fiscais que você mandar emitir;
          </li>
          <li>
            Reconhece que a assinatura feita com o seu certificado tem a mesma validade
            jurídica da sua assinatura.
          </li>
        </ul>
        <p>
          O certificado e a senha são armazenados cifrados (AES-256-GCM), com a chave mantida
          fora do banco de dados. Você pode removê-los a qualquer momento. A remoção interrompe
          a emissão até o envio de um novo certificado.
        </p>
        <p>
          <b>Certificado vencido é responsabilidade sua.</b> O sistema não renova certificados
          e emissões falham enquanto ele estiver expirado.
        </p>

        <h2>6. Suas responsabilidades sobre o conteúdo fiscal</h2>
        <p>Esta seção é a mais importante deste documento. Você é o responsável por:</p>
        <ul>
          <li>
            <b>A veracidade e exatidão de todos os dados</b> informados: valores, descrição do
            serviço, dados do tomador, códigos de serviço, alíquotas, tributos e retenções;
          </li>
          <li>
            <b>A adequação fiscal e tributária</b> de cada documento emitido à sua atividade,
            ao seu regime e à legislação aplicável;
          </li>
          <li>
            <b>Conferir o documento antes de emitir.</b> A NFS-e é documento fiscal com efeitos
            legais e tributários. Depois de autorizada, sua correção depende de cancelamento ou
            substituição, que estão sujeitos a prazos e regras do próprio órgão fiscal;
          </li>
          <li>
            <b>Obter autorização dos titulares</b> dos dados pessoais que você inserir no
            sistema sobre seus clientes, e usar esses dados apenas para as finalidades legais da
            emissão;
          </li>
          <li>
            <b>Guardar seus documentos fiscais</b> pelos prazos legais, independentemente da
            cópia mantida no TITAN.
          </li>
        </ul>

        <h2>7. Uso proibido</h2>
        <p>É vedado usar o TITAN para:</p>
        <ul>
          <li>Emitir documento fiscal falso, simulado, frio ou referente a operação inexistente</li>
          <li>Praticar sonegação, fraude fiscal, lavagem de dinheiro ou qualquer ilícito</li>
          <li>Emitir em nome de terceiro sem autorização</li>
          <li>Tentar acessar dados de outra empresa, burlar controles de permissão ou explorar falhas do sistema</li>
          <li>Fazer engenharia reversa, copiar ou revender o sistema sem autorização escrita</li>
          <li>Automatizar acessos de forma abusiva, sobrecarregando a plataforma</li>
        </ul>
        <p>
          A constatação de qualquer dessas condutas permite a suspensão imediata da conta, sem
          reembolso, sem prejuízo das medidas legais cabíveis e da comunicação às autoridades
          quando exigida por lei.
        </p>

        <h2>8. Planos, cobrança e limites</h2>
        <ul>
          <li>
            O TITAN é oferecido por assinatura, em planos com limites mensais de emissão
            informados no momento da contratação.
          </li>
          <li>
            A assinatura é mensal e renovada automaticamente até que você cancele.
          </li>
          <li>
            Atingido o limite do plano, novas emissões podem ser bloqueadas até a renovação do
            ciclo ou a mudança de plano.
          </li>
          <li>
            <b>Atraso no pagamento</b> pode levar à suspensão do acesso após o prazo de
            tolerância. Seus documentos já emitidos permanecem preservados e disponíveis para
            download durante o período de retenção previsto na Política de Privacidade.
          </li>
          <li>
            Podemos reajustar os preços mediante aviso com <b>30 dias</b> de antecedência. Se
            não concordar, você pode cancelar antes da vigência do novo valor.
          </li>
        </ul>

        <h2>9. Disponibilidade do serviço</h2>
        <p>
          Trabalhamos para manter o TITAN disponível, mas <b>não garantimos funcionamento
          ininterrupto</b>. Podem ocorrer interrupções por manutenção, falha de fornecedores de
          infraestrutura ou casos fortuitos.
        </p>
        <p>
          <b>Dependência de terceiros:</b> a emissão depende do ambiente nacional da NFS-e
          (Sefin/ADN) e de outros serviços públicos. Indisponibilidade, lentidão, rejeição ou
          mudança de regras desses órgãos <b>estão fora do nosso controle</b> e não configuram
          falha do TITAN. Recomendamos não deixar emissões para o último dia do prazo.
        </p>

        <h2>10. Limitação de responsabilidade</h2>
        <p>
          O TITAN é fornecido no estado em que se encontra. Dentro do permitido pela lei:
        </p>
        <ul>
          <li>
            Não respondemos por tributo, multa, juros, autuação ou penalidade decorrente de
            informação incorreta prestada por você, de decisão fiscal sua ou do seu contador,
            ou de descumprimento de obrigação acessória que não caiba ao sistema;
          </li>
          <li>
            Não respondemos por lucros cessantes, perda de oportunidade ou danos indiretos;
          </li>
          <li>
            Nossa responsabilidade total, em qualquer hipótese, fica limitada ao valor pago por
            você pelo serviço nos <b>12 meses</b> anteriores ao evento.
          </li>
        </ul>
        <p>
          Nada nestes Termos afasta direitos que a lei garante de forma irrenunciável,
          especialmente os do Código de Defesa do Consumidor quando aplicável.
        </p>

        <h2>11. Propriedade intelectual</h2>
        <p>
          O sistema, sua marca, código, layout e documentação pertencem à Titan Backoffice.
          Nada nestes Termos transfere propriedade. Você recebe apenas uma licença de uso
          revogável, não exclusiva e intransferível enquanto a assinatura estiver ativa.
        </p>
        <p>
          <b>Seus dados continuam seus.</b> Não reivindicamos propriedade sobre as notas,
          cadastros e informações que você insere.
        </p>

        <h2>12. Cancelamento e encerramento</h2>
        <ul>
          <li>
            <b>Você pode cancelar quando quiser</b>, pelo e-mail de contato. O acesso permanece
            até o fim do ciclo já pago.
          </li>
          <li>
            <b>Antes de encerrar, exporte seus documentos.</b> Recomendamos baixar XMLs e
            DANFSe das notas emitidas.
          </li>
          <li>
            Podemos encerrar a conta em caso de violação destes Termos, inadimplência
            prolongada ou exigência legal, com aviso prévio sempre que possível.
          </li>
          <li>
            Após o encerramento, os dados fiscais são mantidos pelos prazos legais descritos na
            Política de Privacidade, e depois eliminados.
          </li>
        </ul>

        <h2>13. Alterações destes Termos</h2>
        <p>
          Podemos alterar estes Termos. Mudanças relevantes serão avisadas pelo sistema ou por
          e-mail com <b>30 dias</b> de antecedência. Continuar usando o TITAN após a vigência
          significa concordar com a nova versão. Se não concordar, cancele antes.
        </p>

        <h2>14. Lei aplicável e foro</h2>
        <p>
          Estes Termos são regidos pela lei brasileira. Fica eleito o foro da Comarca de
          Curitiba/PR para dirimir controvérsias, salvo quando a lei garantir ao consumidor o
          foro do seu domicílio.
        </p>

        <h2>15. Contato</h2>
        <p>
          Dúvidas sobre estes Termos: <b>nfse@titanbackoffice.com.br</b>. Telefone: (41) 3012-2998
        </p>

        <p className="legal-foot">
          TITAN BACKOFFICE SERVIÇOS ADMINISTRATIVOS LTDA, CNPJ 67.261.200/0001-79
          <br />
          R. Frederico Müller, 510, Campo Comprido, Curitiba/PR, CEP 81.220-170
          <br />
          Veja também a <Link href="/politica-de-privacidade">Política de Privacidade</Link>.
        </p>
      </article>
    </main>
  );
}
