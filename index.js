const express = require("express");
const puppeteer = require("puppeteer");

const app = express();

// Rota raiz
app.get("/", (req, res) => {
  res.send("Bem vindo ao Scraper Google Maps");
});

// Rota de busca no Google Maps
app.get("/search", async (req, res) => {
  const searchTerm = req.query.term;

  // ✅ Log do termo recebido
  console.log("📥 Termo recebido da query:", req.query);

  if (!searchTerm) {
    return res.status(400).json({ error: "O parâmetro 'term' é obrigatório." });
  }

  try {
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: "/usr/bin/google-chrome",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--lang=pt-BR"
      ],
    });

    const page = await browser.newPage();

    await page.setExtraHTTPHeaders({
      "Accept-Language": "pt-BR,pt;q=0.9",
    });

    const url = `https://www.google.com/maps/search/${encodeURIComponent(searchTerm)}`;
    console.log("🔎 Navegando para URL:", url);

    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    // ✅ Selector melhorado com fallback
    const resultsSelector = 'div[role="feed"]'; // mais genérico
    await page.waitForSelector(resultsSelector, { timeout: 60000 });

    // Scroll
    let previousHeight;
    while (true) {
      const resultDiv = await page.$(resultsSelector);
      previousHeight = await page.evaluate((el) => el.scrollHeight, resultDiv);
      await page.evaluate((el) => el.scrollBy(0, el.scrollHeight), resultDiv);
      await new Promise((resolve) => setTimeout(resolve, 4000));
      const newHeight = await page.evaluate((el) => el.scrollHeight, resultDiv);
      if (newHeight === previousHeight) break;
    }

    // Extrair os websites
    const websites = await page.evaluate(() => {
      const elements = document.querySelectorAll('[data-value="Website"]');
      return Array.from(elements).map((el) => el.getAttribute("href"));
    });

    await browser.close();

    console.log("✅ Scraping finalizado:", websites);

    return res.json({
      term: searchTerm,
      websites,
    });
  } catch (error) {
    console.error("❌ Erro ao realizar a pesquisa:", error.message);
    return res.status(500).json({ error: "Erro ao realizar a pesquisa.", details: error.message });
  }
});

// Inicializar o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
