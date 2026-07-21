import { describe, expect, it } from "vitest";
import { validateAllowedFields } from "../../../apps/api/src/modules/pesquisa/helpers/validate-allowed-fields";
import { validateAnswersDuplicates } from "../../../apps/api/src/modules/pesquisa/helpers/validate-answers-duplicates";
import { validateConditionalFields } from "../../../apps/api/src/modules/pesquisa/helpers/validate-conditional-fields";
import { validateFieldValues } from "../../../apps/api/src/modules/pesquisa/helpers/validate-field-values";
import { validateRequiredAnswered } from "../../../apps/api/src/modules/pesquisa/helpers/validate-required-answered";
import { validateRequiredFields } from "../../../apps/api/src/modules/pesquisa/helpers/validate-required-fields";
import type { PerguntaInput } from "../../../apps/api/src/modules/pesquisa/helpers/types";

const perguntaBase: PerguntaInput = {
  id: 1,
  tipo: "texto_grande",
  respostaObrigatoria: false,
  justificarResposta: false,
  permitirOutro: false,
  opcoes: [],
};

describe("Regras de validação das respostas da pesquisa", () => {
  it("deve rejeitar uma resposta que utilize um campo incompatível com o tipo da pergunta", () => {
    const respostaComCampoIncompatível = {
      perguntaId: 1,
      valorNumerico: 3,
    };

    expect(() =>
      validateAllowedFields(
        perguntaBase,
        respostaComCampoIncompatível,
      ),
    ).toThrow("não é compatível");
  });

  it("deve rejeitar o envio de mais de uma resposta para a mesma pergunta de resposta única", () => {
    const perguntas = new Map([[1, perguntaBase]]);
    const respostasDuplicadas = [
      {
        perguntaId: 1,
        valorOpcaoTexto: "Primeira resposta",
      },
      {
        perguntaId: 1,
        valorOpcaoTexto: "Segunda resposta",
      },
    ];

    expect(() =>
      validateAnswersDuplicates(
        perguntas,
        respostasDuplicadas,
      ),
    ).toThrow("mais de uma vez");
  });

  it("deve permitir opções diferentes para uma pergunta que aceita múltiplas seleções", () => {
    const perguntaComMultiplasOpcoes = {
      ...perguntaBase,
      tipo: "opcoes_diversas" as const,
      opcoes: [{ id: 10 }, { id: 11 }],
    };

    const respostasComOpcoesDiferentes = [
      {
        perguntaId: 1,
        opcaoId: 10,
      },
      {
        perguntaId: 1,
        opcaoId: 11,
      },
    ];

    expect(() =>
      validateAnswersDuplicates(
        new Map([[1, perguntaComMultiplasOpcoes]]),
        respostasComOpcoesDiferentes,
      ),
    ).not.toThrow();
  });

  it('deve rejeitar o campo "outro" quando a pergunta não permitir respostas alternativas', () => {
    const respostaComOutro = {
      perguntaId: 1,
      outroTexto: "Outra resposta",
    };

    expect(() =>
      validateConditionalFields(
        perguntaBase,
        respostaComOutro,
      ),
    ).toThrow("não permite");
  });

  it("deve rejeitar uma pergunta obrigatória não respondida ou enviada sem a justificativa exigida", () => {
    const perguntaObrigatoriaComJustificativa = {
      ...perguntaBase,
      respostaObrigatoria: true,
      justificarResposta: true,
    };

    const respostaSemJustificativa = {
      perguntaId: 1,
      valorOpcaoTexto: "Resposta preenchida",
    };

    expect(() =>
      validateRequiredFields(
        perguntaObrigatoriaComJustificativa,
        respostaSemJustificativa,
      ),
    ).toThrow("exige justificativa");

    expect(() =>
      validateRequiredAnswered(
        [{ id: 1, respostaObrigatoria: true }],
        [],
      ),
    ).toThrow("não foram respondidas");
  });

  it("deve rejeitar valores fora do limite, opções de outra pergunta e valores padronizados incompatíveis", () => {
    const perguntaDePontuacao = {
      ...perguntaBase,
      tipo: "pontuacao_0_a_5" as const,
    };

    expect(() =>
      validateFieldValues(
        perguntaDePontuacao,
        {
          perguntaId: 1,
          valorNumerico: 6,
        },
      ),
    ).toThrow("entre 0 e 5");

    const perguntaDeMultiplaEscolha = {
      ...perguntaBase,
      tipo: "multipla_escolha" as const,
      opcoes: [{ id: 10 }],
    };

    expect(() =>
      validateFieldValues(
        perguntaDeMultiplaEscolha,
        {
          perguntaId: 1,
          opcaoId: 99,
        },
      ),
    ).toThrow("não pertence");

    const perguntaDeSatisfacao = {
      ...perguntaBase,
      tipo: "nivel_satisfacao" as const,
    };

    expect(() =>
      validateFieldValues(
        perguntaDeSatisfacao,
        {
          perguntaId: 1,
          valorOpcaoPadronizada: "excelente",
        },
      ),
    ).toThrow("nível de satisfação");
  });
});