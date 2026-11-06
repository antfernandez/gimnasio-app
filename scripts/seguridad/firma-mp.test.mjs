// A08.1: pruebas unitarias de firmaValida (webhook Mercado Pago) con un secreto ficticio.
// Uso: node --experimental-strip-types scripts/seguridad/firma-mp.test.mjs
import { createHmac } from "node:crypto";
import { firmaValida } from "../../lib/mercadopago.ts";

const secret = "secreto-ficticio-de-prueba";
const AHORA = 1700000000000; // ms; las firmas de prueba usan ts=1700000000000
const T = "1700000000000";
const firma = (id, req, ts, s = secret) => `ts=${ts},v1=${createHmac("sha256", s).update(`id:${id};request-id:${req};ts:${ts};`).digest("hex")}`;
const casos = [
  ["firma correcta", firmaValida({ secret, xSignature: firma("123", "r1", T), xRequestId: "r1", dataId: "123", ahoraMs: AHORA }), true],
  ["data.id distinto al firmado", firmaValida({ secret, xSignature: firma("123", "r1", T), xRequestId: "r1", dataId: "999", ahoraMs: AHORA }), false],
  ["x-request-id distinto", firmaValida({ secret, xSignature: firma("123", "r1", T), xRequestId: "r2", dataId: "123", ahoraMs: AHORA }), false],
  ["secreto equivocado", firmaValida({ secret, xSignature: firma("123", "r1", T, "otro"), xRequestId: "r1", dataId: "123", ahoraMs: AHORA }), false],
  ["sin x-signature", firmaValida({ secret, xSignature: null, xRequestId: "r1", dataId: "123", ahoraMs: AHORA }), false],
  ["sin data.id", firmaValida({ secret, xSignature: firma("123", "r1", T), xRequestId: "r1", dataId: null, ahoraMs: AHORA }), false],
  ["v1 de largo distinto", firmaValida({ secret, xSignature: "ts=1,v1=abc", xRequestId: "r1", dataId: "123", ahoraMs: AHORA }), false],
  ["firma correcta con 4 min de antigüedad", firmaValida({ secret, xSignature: firma("123", "r1", T), xRequestId: "r1", dataId: "123", ahoraMs: AHORA + 240000 }), true],
  ["firma correcta pero con más de 5 min (replay)", firmaValida({ secret, xSignature: firma("123", "r1", T), xRequestId: "r1", dataId: "123", ahoraMs: AHORA + 360000 }), false],
  ["firma de 2023 evaluada hoy", firmaValida({ secret, xSignature: firma("123", "r1", T), xRequestId: "r1", dataId: "123" }), false],
];
let fallos = 0;
for (const [n, got, esperado] of casos) { const ok = got === esperado; if (!ok) fallos++; console.log(ok ? "PASS" : "FAIL", n, `(esperado ${esperado}, obtuvo ${got})`); }
process.exit(fallos ? 1 : 0);
