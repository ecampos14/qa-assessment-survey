import { BadRequestException } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getStatusFromPeriod } from "../../../apps/api/src/modules/pesquisa/helpers/get-status-from-period";
import { validateSurveyDates } from "../../../apps/api/src/modules/pesquisa/helpers/validate-survey-dates";

describe("Regras de disponibilidade e período da pesquisa", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function definirDataAtualFixa() {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-21T12:00:00.000Z"));
  }

  it("deve considerar a pesquisa disponível quando o lançamento e o encerramento ocorrerem no dia atual", () => {
    definirDataAtualFixa();

    const estaDisponivel = getStatusFromPeriod(
      new Date("2026-07-21T00:00:00Z"),
      new Date("2026-07-21T23:59:59Z"),
    );

    expect(estaDisponivel).toBe(true);
  });

  it("deve considerar a pesquisa indisponível quando a data de lançamento ainda não tiver chegado", () => {
    definirDataAtualFixa();

    const estaDisponivel = getStatusFromPeriod(
      new Date("2026-07-22T00:00:00Z"),
      null,
    );

    expect(estaDisponivel).toBe(false);
  });

  it("deve considerar a pesquisa indisponível quando a data de encerramento já tiver passado", () => {
    definirDataAtualFixa();

    const estaDisponivel = getStatusFromPeriod(
      new Date("2026-07-01T00:00:00Z"),
      new Date("2026-07-20T23:59:59Z"),
    );

    expect(estaDisponivel).toBe(false);
  });

  it("deve manter a pesquisa disponível quando ela já tiver iniciado e não possuir data de encerramento", () => {
    definirDataAtualFixa();

    const estaDisponivel = getStatusFromPeriod(
      new Date("2026-07-01T00:00:00Z"),
      null,
    );

    expect(estaDisponivel).toBe(true);
  });

  it("deve aceitar lançamento e encerramento definidos para o mesmo dia", () => {
    definirDataAtualFixa();

    expect(() =>
      validateSurveyDates(
        new Date("2026-07-21T00:00:00Z"),
        new Date("2026-07-21T23:59:59Z"),
      ),
    ).not.toThrow();
  });

  it("deve lançar BadRequestException quando a data de lançamento for anterior ao dia atual", () => {
    definirDataAtualFixa();

    expect(() =>
      validateSurveyDates(
        new Date("2026-07-20T23:59:59Z"),
        null,
      ),
    ).toThrow(BadRequestException);
  });

  it("deve informar erro quando a data de encerramento for anterior à data de lançamento", () => {
    definirDataAtualFixa();

    expect(() =>
      validateSurveyDates(
        new Date("2026-07-23T00:00:00Z"),
        new Date("2026-07-22T00:00:00Z"),
      ),
    ).toThrow("A data de encerramento não pode ser anterior");
  });
});