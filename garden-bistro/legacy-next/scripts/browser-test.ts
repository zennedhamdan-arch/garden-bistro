import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    headless: true,
  });
  const errors: string[] = [];
  try {
    for (const width of [360, 1280]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      page.on("pageerror", (e) => errors.push(e.message));
      for (const locale of ["en", "fr", "sw"]) {
        await page.goto("http://127.0.0.1:3000/" + locale);
        await page.waitForLoadState("networkidle");
        assert.equal(await page.locator("html").getAttribute("lang"), locale);
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
          `Overflow ${width} ${locale}`,
        );
        assert.equal(await page.locator("h1").count(), 1);
        assert.match(
          (await page.locator(".whatsapp").getAttribute("href")) ?? "",
          /wa.me\/250786458663/,
        );
        if (width === 360) {
          await page.locator(".mobile-toggle").click();
          assert.equal(await page.locator("nav").isVisible(), true);
          await page.locator('nav a[href="/' + locale + '/hotel"]').click();
        } else
          await page.locator('nav a[href="/' + locale + '/hotel"]').click();
        await page.waitForURL("**/" + locale + "/hotel");
        assert.equal(await page.locator('form input[name="name"]').count(), 1);
        await page.goto("http://127.0.0.1:3000/" + locale + "/reservations");
        assert.equal(await page.locator('input[name="time"]').count(), 1);
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );
      }
      await page.goto("http://127.0.0.1:3000/en");
      if (width === 1280)
        await page.screenshot({
          path: "test-artifacts/home-desktop.png",
          fullPage: true,
        });
      else
        await page.screenshot({
          path: "test-artifacts/home-mobile.png",
          fullPage: true,
        });
      await page.close();
    }
    assert.deepEqual(errors, []);
    console.log(
      "Browser checks passed at 360px and 1280px in all 3 languages: language metadata, no horizontal overflow, navigation, forms, WhatsApp, no page errors.",
    );
  } finally {
    await browser.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
