import { describe, expect, it } from "vitest";
import { Pesquisa } from "../../../apps/web/src/domains/pesquisa/infra/entities/pesquisa.entity";

const dadosDaPesquisa = {
  id: "p1",
  empresaId: "emp-001",
  nome: "Clima",
  descricao: null,
  estaAtiva: true,
  idPublico: "pub",
  dataLancamento: "2026-07-01T00:00:00.000Z",
  dataEncerramento: "2026-07-31T00:00:00.000Z",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
  deletedAt: null,
};

describe("Entidade Pesquisa no frontend", () => {
  it("deve retornar o status Ativa com a cor verde quando a pesquisa estiver ativa", () => {
    const pesquisa = new Pesquisa(dadosDaPesquisa);

    expect(pesquisa.getStatus()).toEqual({
      label: "Ativa",
      color: "green",
    });
  });

  it("deve retornar o status Inativa com a cor cinza quando a pesquisa estiver desativada", () => {
    const pesquisa = new Pesquisa({
      ...dadosDaPesquisa,
      estaAtiva: false,
    });

    expect(pesquisa.getStatus()).toEqual({
      label: "Inativa",
      color: "gray",
    });
  });

  it('deve exibir "Sem encerramento" quando a pesquisa não possuir uma data final', () => {
    const pesquisa = new Pesquisa({
      ...dadosDaPesquisa,
      dataEncerramento: null,
    });

    expect(pesquisa.getPeriodo()).toContain("Sem encerramento");
  });
});