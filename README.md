# Marca Direta

Site da Marca Direta, serviço de registro de marcas no INPI: [marcadireta.com.br](https://marcadireta.com.br).

É um site estático, publicado pelo GitHub Pages a partir da branch `main` (o domínio está no arquivo `CNAME`).

## Estrutura

| Caminho | O que é |
| --- | --- |
| `index.html` | Página inicial e a captação de leads. A "página" `#contato` é uma visão trocada por JavaScript, não um arquivo separado. |
| `servicos-complementares.html` | Página de serviços complementares: Google Meu Negócio, criação de sites, proteção de domínios e registro de CNPJ. |
| `assets/` | Logos, ícones e fotos da equipe. |
| `supabase/` | Funções de borda e migrações do banco usadas pelo formulário de contato. |
| `docs/` | Documentação de apoio, como as fontes dos textos. |

## Formulário de contato

O formulário envia os dados para uma função do Supabase (`submit-lead`), protegida pelo Cloudflare Turnstile. Ao alterar o formulário, mantenha os nomes dos campos (`entry.*`), o endereço da função e a verificação do Turnstile.

## Rodar localmente

```bash
npx serve .
```

O Turnstile não valida em `localhost`, então o envio do formulário só pode ser testado no domínio publicado.

## Fontes dos textos

Os textos da página de serviços complementares usam dados do Sebrae, da OMPI (WIPO) e dos portais do governo.

- [Agência Sebrae: perfil da empresa no Google pelo App Sebrae](https://agenciasebrae.com.br/inovacao-e-tecnologia/quer-mais-visibilidade-no-google-agora-e-so-acessar-o-app-sebrae/)
- [Sebrae Respostas: por que a sua empresa precisa de um site?](https://respostas.sebrae.com.br/por-que-a-sua-empresa-precisa-de-um-site/)
- [Comunidade Sebrae: o site é a vitrine da empresa](https://sebraepr.com.br/comunidade/artigo/o-site-e-a-vitrine-da-empresa)
- [OMPI (WIPO): número recorde de casos de domínios em 2023](https://www.wipo.int/amc/en/domains/news/2024/news_0001.html)
- [Agência Sebrae: vantagens de ser MEI](https://agenciasebrae.com.br/cultura-empreendedora/descubra-as-vantagens-ainda-pouco-conhecidas-de-ser-mei/)
- [Sebrae: benefícios previdenciários do titular do MEI](https://sebrae.com.br/sites/PortalSebrae/artigos/beneficios-previdenciarios-do-titular-do-mei,2203fa27f7e96810VgnVCM1000001b00320aRCRD)

Detalhes de cada fonte, o que ela sustenta e os dados descartados estão em [`docs/fontes-servicos-complementares.md`](docs/fontes-servicos-complementares.md).
