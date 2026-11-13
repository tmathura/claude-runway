import test from "node:test";
import assert from "node:assert/strict";

import { count, money, signed, span } from "../plugins/runway/hooks/lib/format";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

test("span writes a time in its two largest units", () => {
  assert.equal(span(59_999), "<1m");
  assert.equal(span(24 * MINUTE), "24m");
  assert.equal(span(3 * HOUR + 10 * MINUTE), "3h10m");
  assert.equal(span(5 * HOUR), "5h");
  assert.equal(span(2 * DAY + 4 * HOUR + 30 * MINUTE), "2d4h");
  assert.equal(span(2 * DAY), "2d");
});

test("span answers the shortest time for a figure that is not a time", () => {
  assert.equal(span(Number.NaN), "<1m");
  assert.equal(span(-5 * HOUR), "<1m");
});

test("count writes tokens in thousands and millions", () => {
  assert.equal(count(950), "950");
  assert.equal(count(6300), "6.3k");
  assert.equal(count(9960), "10k");
  assert.equal(count(634_000), "634k");
  assert.equal(count(999_600), "1.0M");
  assert.equal(count(1_200_000), "1.2M");
  assert.equal(count(-5), "0");
  assert.equal(count(Number.NaN), "0");
});

test("signed puts a sign before the count", () => {
  assert.equal(signed(6300), "+6.3k");
  assert.equal(signed(-120_000), "-120k");
  assert.equal(signed(0), "+0");
});

test("money drops the cents from 100 dollars", () => {
  assert.equal(money(41.07), "$41.07");
  assert.equal(money(0.5), "$0.50");
  assert.equal(money(141.4), "$141");
});
