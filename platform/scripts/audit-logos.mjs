// Verifica cuantos <img> de partners se renderizan en el topbar
import { chromium, request as pwRequest } from "playwright";

const req = await pwRequest.newContext({ baseURL: "http://localhost:3000" });
const csrf = (await (await req.get("/api/auth/csrf")).json()).csrfToken;
await req.post("/api/auth/callback/credentials", {
  form: { csrfToken: csrf, email: "admin@car.gov.co", password: "Admin123!", redirect: "false", json: "true" },
  maxRedirects: 0,
  failOnStatusCode: false,
});
const cookies = await req.storageState();
await req.dispose();

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addCookies(cookies.cookies);
const page = await ctx.newPage();
await page.goto("http://localhost:3000/");
await page.waitForTimeout(3000);

const partnerImages = await page.locator('img[src*="partners"], img[src*="partner-logo"]').count();
const allImagesInHeader = await page.locator('header img').count();
const headerHtml = await page.locator('header').first().innerHTML();

console.log("Partner images count:", partnerImages);
console.log("All images in <header>:", allImagesInHeader);
console.log("---");
console.log(headerHtml.substring(0, 2000));

await browser.close();
