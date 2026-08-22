// Backend do emissor NFS-e. NÃO trocar por uma API do Martyn/atendimento: são
// serviços Render distintos e cada um tem o seu DATABASE_URL (render.yaml marca
// a chave como sync:false), então apontar pra outro serviço troca o BANCO
// inteiro — usuários, empresas e notas somem, e o login passa a responder
// "E-mail administrativo ou senha inválidos.". martyn-api-titan ainda roda com
// NFSE_ENV=restricted, que emite nota marcada SEM VALIDADE JURÍDICA.
//
// Houve um mapa de host→API aqui (21/08/2026) para o portal de homologação
// falar com a API de homologação. O ambiente foi DESLIGADO em 22/08/2026 por
// decisão do dono do produto, e o mapa saiu junto: endereço de serviço que não
// existe mais é a pior espécie de comentário — quem lê depois acha que ainda
// há um segundo ambiente para onde apontar, e vai procurar por ele.
window.TITAN_API_URL = window.TITAN_API_URL || "https://titan-nfse-api.onrender.com";
