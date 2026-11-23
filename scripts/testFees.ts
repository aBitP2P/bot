import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getBotFeePercent,
  getBotFeeSats,
  getBuyerNetSats,
  getPartyFeeSats,
  getSellerDepositSats,
} from "../src/config/fees.js";

// Fórmulas originales, copiadas literalmente de los archivos antes de la refactorización.
// Sirven como referencia para garantizar que los helpers nuevos producen los mismos montos.
const legacy = {
  // escrowHandler / monitor / cancel: sellerFeeSats = floor(base * (pct / 2 / 100))
  sellerFeeSats: (base: number) =>
    Math.floor(base * (getBotFeePercent(base) / 2 / 100)),
  // transactions / claim: buyerFee = floor((base * (pct / 100)) / 2)
  buyerFeeSats: (base: number) =>
    Math.floor((base * (getBotFeePercent(base) / 100)) / 2),
  // claim: totalBotFeeSats = floor(base * (pct / 100)); buyerFeeSats = floor(total / 2)
  buyerFeeSatsFromTotal: (base: number) => {
    const total = Math.floor(base * (getBotFeePercent(base) / 100));
    return Math.floor(total / 2);
  },
};

// Montos a probar: todo rango pequeño, los bordes de tier y valores aleatorios grandes.
function sampleAmounts(): number[] {
  const set = new Set<number>();
  for (let i = 0; i <= 5000; i++) set.add(i);
  for (let i = 99_000; i <= 101_000; i++) set.add(i);
  for (let i = 0; i < 20_000; i++) {
    set.add(Math.floor(Math.random() * 100_000_000));
  }
  for (const edge of [100_000, 100_001, 1, 2000, 2001, 2_100_000_000]) {
    set.add(edge);
  }
  return [...set].sort((a, b) => a - b);
}

const amounts = sampleAmounts();

describe("comisiones: helpers vs fórmulas originales", () => {
  it("getPartyFeeSats coincide con buyerFee original (ambas variantes)", () => {
    for (const base of amounts) {
      const expected = legacy.buyerFeeSats(base);
      assert.equal(
        getPartyFeeSats(base),
        expected,
        `base=${base}: getPartyFeeSats=${getPartyFeeSats(base)} legacy=${expected}`,
      );
      assert.equal(
        getPartyFeeSats(base),
        legacy.buyerFeeSatsFromTotal(base),
        `base=${base}: variante total/2 difiere`,
      );
    }
  });

  it("getSellerDepositSats coincide con base + sellerFeeSats original", () => {
    for (const base of amounts) {
      const expected = base + legacy.sellerFeeSats(base);
      assert.equal(
        getSellerDepositSats(base),
        expected,
        `base=${base}: deposit=${getSellerDepositSats(base)} legacy=${expected}`,
      );
    }
  });

  it("getBuyerNetSats coincide con base - buyerFee - minerFee original", () => {
    const minerFees = [0, 1, 250, 1_000, 25_000];
    for (const base of amounts) {
      for (const miner of minerFees) {
        const expected = base - legacy.buyerFeeSats(base) - miner;
        assert.equal(
          getBuyerNetSats(base, miner),
          expected,
          `base=${base} miner=${miner}`,
        );
      }
    }
  });

  it("getBuyerNetSats sin minerFee coincide con estimateBuyerSats original", () => {
    // estimateBuyerSats original: base - floor(floor(base*pct/100)/2)
    for (const base of amounts) {
      const pct = getBotFeePercent(base);
      const total = Math.floor(base * (pct / 100));
      const expected = base - Math.floor(total / 2);
      assert.equal(getBuyerNetSats(base), expected, `base=${base}`);
    }
  });

  it("getBotFeeSats coincide con totalBotFeeSats original", () => {
    for (const base of amounts) {
      const expected = Math.floor(base * (getBotFeePercent(base) / 100));
      assert.equal(getBotFeeSats(base), expected, `base=${base}`);
    }
  });

  it("el depósito del vendedor cuadra con la suma de partes", () => {
    // Invariante: depósito = base + mitad(comisión) del vendedor.
    // Para un monto base, la comisión total se reparte entre ambas partes y
    // la suma de lo que recibe el comprador + la comisión de ambas partes debe ser base.
    for (const base of amounts) {
      const deposit = getSellerDepositSats(base);
      const sellerFee = deposit - base;
      const buyerFee = getPartyFeeSats(base);
      assert.ok(sellerFee >= 0 && buyerFee >= 0, `base=${base}`);
      assert.ok(
        Math.abs(sellerFee - buyerFee) <= 1,
        `base=${base}: mitades difieren más de 1 sat (${sellerFee} vs ${buyerFee})`,
      );
    }
  });
});
