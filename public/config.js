// Backend do emissor NFS-e. NÃO trocar por uma API do Martyn/atendimento: são
// serviços Render distintos e cada um tem o seu DATABASE_URL (render.yaml marca
// a chave como sync:false), então apontar pra outro serviço troca o BANCO
// inteiro — usuários, empresas e notas somem, e o login passa a responder
// "E-mail administrativo ou senha inválidos.". martyn-api-titan ainda roda com
// NFSE_ENV=restricted, que emite nota marcada SEM VALIDADE JURÍDICA.
//
// Homologação (21/08/2026): o portal de teste (homolog.titanbackoffice.com.br)
// fala com a API de teste. O padrão continua sendo produção — qualquer host
// que não esteja no mapa se comporta exatamente como antes desta mudança.
window.TITAN_API_URL = window.TITAN_API_URL || ({
  "homolog.titanbackoffice.com.br": "https://titan-nfse-api-homolog.onrender.com"
}[location.hostname] || "https://titan-nfse-api.onrender.com");
