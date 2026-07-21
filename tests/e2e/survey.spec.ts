import { expect, test } from "@playwright/test";

test.describe("Fluxos principais da pesquisa de clima", () => {
  test("deve exibir na listagem as pesquisas cadastradas pelo seed", async ({
    page,
  }) => {
    await page.goto("/pesquisas");

    const tituloDaPagina = page.getByRole("heading", {
      name: "Pesquisas",
    });

    const pesquisaAtiva = page.getByText("Pesquisa Ativa", {
      exact: true,
    });

    await expect(tituloDaPagina).toBeVisible();
    await expect(pesquisaAtiva).toBeVisible();
  });

  test("deve permitir a criação de uma pesquisa pelo formulário administrativo", async ({
    page,
  }) => {
    await page.goto("/pesquisas/criar");

    const nomeDaPesquisa = `Pesquisa E2E ${Date.now()}`;

    const dataDeAmanha = new Date(
      Date.now() + 86_400_000,
    )
      .toISOString()
      .slice(0, 10);

    await page
      .locator('[data-test-id="pesquisa-nome-input"]')
      .fill(nomeDaPesquisa);

    await page
      .locator('[data-test-id="pesquisa-dataLancamento"]')
      .fill(dataDeAmanha);

    await page
      .locator('[data-test-id="pergunta-nome-input-0"]')
      .fill("Como está o clima?");

    await page
      .locator('[data-test-id="pergunta-tipo-select-0"]')
      .selectOption("texto_grande");

    await page
      .locator('[data-test-id="create-button"]')
      .click();

    await expect(page).toHaveURL(/\/pesquisas$/);

    await expect(
      page.getByText(nomeDaPesquisa, { exact: true }),
    ).toBeVisible();
  });

  test("deve permitir o envio de uma resposta para uma pesquisa ativa pelo link público", async ({
    page,
  }) => {
    await page.goto("/pesquisas/resposta/pub-ativa");

    const tituloDaPesquisa = page.getByRole("heading", {
      name: "Pesquisa Ativa",
    });

    await expect(tituloDaPesquisa).toBeVisible();

    const campoDeRespostaObrigatoria = page
      .locator('textarea[placeholder="Sua resposta"]')
      .first();

    await campoDeRespostaObrigatoria.fill(
      "Minha experiência foi positiva",
    );

    await page
      .locator('[data-test-id="pesquisa-submit-button"]')
      .click();

    const mensagemDeSucesso = page.locator(
      '[data-test-id="pesquisa-submit-success"]',
    );

    await expect(mensagemDeSucesso).toBeVisible();
  });

  test("deve impedir o envio de respostas para uma pesquisa indisponível", async ({
    page,
  }) => {
    await page.goto("/pesquisas/resposta/pub-inativa");

    const mensagemDeIndisponibilidade = page.locator(
      '[data-test-id="pesquisa-submit-unavailable"]',
    );

    const botaoDeEnviarResposta = page.locator(
      '[data-test-id="pesquisa-submit-button"]',
    );

    await expect(mensagemDeIndisponibilidade).toBeVisible();
    await expect(botaoDeEnviarResposta).toHaveCount(0);
  });
});