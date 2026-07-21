import type { INestApplication } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../../apps/api/src/app.module';
import { PrismaService } from '../../apps/api/src/prisma/prisma.service';
import { Test } from '@nestjs/testing';

describe('Integração da API de pesquisas com o banco MySQL', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => prepararBancoParaTeste(prisma));
  afterAll(async () => app.close());

  it('deve retornar apenas as pesquisas pertencentes à empresa informada', async () => {
    const response = await request(app.getHttpServer()).get('/pesquisas').query(criarParametrosDeListagem()).expect(200);
    expect(response.body.totalItems).toBe(4);
    expect(response.body.items).toHaveLength(4);
  });

  it('deve retornar somente pesquisas ativas ao aplicar o filtro de status', async () => {
    const response = await request(app.getHttpServer()).get('/pesquisas').query({ ...criarParametrosDeListagem(), status: 'ativo' }).expect(200);
    expect(response.body.items).toHaveLength(3);
    expect(response.body.items.every((item: { estaAtiva: boolean }) => item.estaAtiva)).toBe(true);
  });

  it('deve paginar os resultados e ordenar as pesquisas pelo nome em ordem crescente', async () => {
    const response = await request(app.getHttpServer()).get('/pesquisas').query({ ...criarParametrosDeListagem(), perPage: 2, orderBy: 'nome', ordination: 'asc' }).expect(200);
    expect(response.body.pages).toBe(2);
    expect(response.body.items.map((item: { nome: string }) => item.nome)).toEqual(['Ativa', 'Encerrada']);
  });

  it('deve criar uma pesquisa e salvar suas perguntas e opções no banco de dados', async () => {
    const response = await request(app.getHttpServer()).post('/pesquisas').send(criarDadosDePesquisa('Nova pesquisa')).expect(201);
    expect(response.body.perguntas[0].opcoes.map((o: { texto: string }) => o.texto)).toEqual(['Sim', 'Não']);
    expect(await prisma.pesquisa.count({ where: { nome: 'Nova pesquisa' } })).toBe(1);
  });

  it('deve retornar conflito ao tentar criar duas pesquisas com o mesmo nome para a mesma empresa', async () => {
    await request(app.getHttpServer()).post('/pesquisas').send(criarDadosDePesquisa('Duplicada')).expect(201);
    const response = await request(app.getHttpServer()).post('/pesquisas').send(criarDadosDePesquisa('Duplicada')).expect(409);
    expect(response.body.message).toContain('Já existe');
  });

  it('deve retornar erro de validação ao tentar criar uma pesquisa com dados obrigatórios inválidos', async () => {
    const response = await request(app.getHttpServer()).post('/pesquisas').send({ nome: '', perguntas: [] }).expect(400);
    expect(response.body.message).toBeDefined();
  });

  it('deve retornar uma pesquisa ativa pelo identificador público incluindo suas perguntas', async () => {
    const response = await request(app.getHttpServer()).get('/public/pub-ativa').expect(200);
    expect(response.body.nome).toBe('Ativa');
    expect(response.body.perguntas).toHaveLength(2);
  });

  it('deve impedir o acesso público a pesquisas futuras, encerradas ou desativadas', async () => {
    for (const id of ['pub-futura', 'pub-encerrada', 'pub-inativa']) {
      await request(app.getHttpServer()).get(`/public/${id}`).expect(400);
    }
  });

  it('deve receber respostas válidas e salvar todos os registros no banco de dados', async () => {
    const pesquisa = await prisma.pesquisa.findUniqueOrThrow({ where: { idPublico: 'pub-ativa' }, include: { perguntas: true } });
    const [texto, nota] = pesquisa.perguntas;
    const response = await request(app.getHttpServer()).post('/public/pub-ativa/respostas').send({
      iniciadoEm: new Date(Date.now() - 60_000).toISOString(), finalizadoEm: new Date().toISOString(),
      respostas: [{ perguntaId: texto.id, valorOpcaoTexto: 'Ambiente saudável' }, { perguntaId: nota.id, valorNumerico: 5 }],
    }).expect(201);
    expect(response.body).toEqual({ ok: true, total: 2 });
    expect(await prisma.resposta.count({ where: { pesquisaId: pesquisa.id } })).toBe(2);
  });

  it('deve rejeitar o envio sem resposta obrigatória e não salvar registros parcialmente', async () => {
    const pesquisa = await prisma.pesquisa.findUniqueOrThrow({ where: { idPublico: 'pub-ativa' }, include: { perguntas: true } });
    const nota = pesquisa.perguntas[1];
    await request(app.getHttpServer()).post('/public/pub-ativa/respostas').send({
      iniciadoEm: new Date(Date.now() - 60_000).toISOString(), finalizadoEm: new Date().toISOString(),
      respostas: [{ perguntaId: nota.id, valorNumerico: 5 }],
    }).expect(400);
    expect(await prisma.resposta.count()).toBe(0);
  });
});

function criarParametrosDeListagem() {
  return { empresaId: 'emp-test', page: 1, perPage: 10, ordination: 'asc', orderBy: 'nome' };
}

function criarDadosDePesquisa(nome: string) {
  const tomorrow = new Date(Date.now() + 86_400_000);
  return { empresaId: 'emp-test', nome, dataLancamento: tomorrow.toISOString(), dataEncerramento: null, perguntas: [{ nome: 'Recomenda?', tipo: 'multipla_escolha', respostaObrigatoria: true, justificarResposta: false, permitirOutro: false, opcoes: ['Sim', 'Não'] }] };
}

async function prepararBancoParaTeste(prisma: PrismaService) {
  await prisma.resposta.deleteMany();
  await prisma.opcao.deleteMany();
  await prisma.pergunta.deleteMany();
  await prisma.pesquisa.deleteMany();
  await prisma.empresa.deleteMany();
  await prisma.empresa.create({ data: { id: 'emp-test', nome: 'Empresa Teste' } });
  const day = 86_400_000;
  const fixtures = [
    { nome: 'Ativa', idPublico: 'pub-ativa', estaAtiva: true, dataLancamento: new Date(Date.now() - day), dataEncerramento: new Date(Date.now() + day), perguntas: { create: [{ nome: 'Comentário', tipo: 'texto_grande' as const, respostaObrigatoria: true }, { nome: 'Nota', tipo: 'pontuacao_0_a_5' as const }] } },
    { nome: 'Futura', idPublico: 'pub-futura', estaAtiva: true, dataLancamento: new Date(Date.now() + day), dataEncerramento: new Date(Date.now() + 2 * day) },
    { nome: 'Encerrada', idPublico: 'pub-encerrada', estaAtiva: true, dataLancamento: new Date(Date.now() - 2 * day), dataEncerramento: new Date(Date.now() - day) },
    { nome: 'Inativa', idPublico: 'pub-inativa', estaAtiva: false, dataLancamento: new Date(Date.now() - day), dataEncerramento: new Date(Date.now() + day) },
  ];
  for (const fixture of fixtures) await prisma.pesquisa.create({ data: { empresaId: 'emp-test', ...fixture } });
}
