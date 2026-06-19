// RUN WITH: npx tsx src/scripts/preview-invoice.ts

import fs from "node:fs";
import path from "node:path";
import Handlebars from "handlebars";
import puppeteer from "puppeteer";

const template = fs.readFileSync(
  path.resolve(process.cwd(), "src/templates/invoice.hbs"),
  "utf-8",
);
const html = Handlebars.compile(template)({
  laundryName: "Fresh & Clean Laundry",
  orderShortId: "A1B2C3D4",
  orderDate: "15th June, 2026",
  status: "pending",
  customerName: "John Doe",
  customerPhone: "2348103814511",
  items: [
    {itemName: "Shirts", quantity: 3, total: "4,500"},
    {itemName: "Trousers", quantity: 2, total: "3,000"},
    {itemName: "Bed Sheets", quantity: 1, total: "2,500"},
  ],
  totalAmount: "10,000",
  pickupDate: "17th June, 2026",
});

const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.setContent(html);
await page.pdf({path: "preview-invoice.pdf", format: "A4"});
await browser.close();
console.log("preview-invoice.pdf generated");
