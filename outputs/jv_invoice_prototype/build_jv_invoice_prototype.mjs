import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "/Users/akoba/projects/jv_invoice/outputs/jv_invoice_prototype";
const workbook = Workbook.create();

const sheetNames = [
  "納品入力_横型",
  "納品台帳_自動生成",
  "顧客マスタ",
  "店舗マスタ",
  "顧客別単価マスタ",
  "請求明細_出力",
  "請求集計",
  "請求書_出力",
  "設定",
  "使い方",
];

const sheets = Object.fromEntries(sheetNames.map((name) => [name, workbook.worksheets.add(name)]));

const col = (n) => {
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - m) / 26);
  }
  return s;
};

const DELIVERY_COUNT = 20;
const FIRST_DELIVERY_COL = 3;
const LAST_DELIVERY_COL = FIRST_DELIVERY_COL + DELIVERY_COUNT - 1;
const TOTAL_COL = LAST_DELIVERY_COL + 1;
const AMOUNT_COL = LAST_DELIVERY_COL + 2;
const INPUT_LAST_COL = col(AMOUNT_COL);
const deliveryCols = Array.from({ length: DELIVERY_COUNT }, (_, i) => col(FIRST_DELIVERY_COL + i));
const deliveryHeaders = Array.from({ length: DELIVERY_COUNT }, (_, i) => `納品${String(i + 1).padStart(2, "0")}`);

const sheetRef = (name) => `'${name}'`;
const yenFormat = '#,##0';
const dateFormat = 'm/d';
const border = { preset: "all", style: "thin", color: "#D1D5DB" };
const headerFill = "#D9EAF7";
const inputFill = "#FFF2CC";
const calcFill = "#E2F0D9";
const totalFill = "#DDEBF7";
const titleFill = "#1F4E79";

function range(sheet, address) {
  return sheet.getRange(address);
}

function setValues(sheet, address, values) {
  range(sheet, address).values = values;
}

function setFormulas(sheet, address, formulas) {
  range(sheet, address).formulas = formulas;
}

function styleTitle(sheet, address) {
  const r = range(sheet, address);
  r.merge();
  r.format = {
    fill: titleFill,
    font: { bold: true, size: 18, color: "#FFFFFF" },
    horizontalAlignment: "left",
    verticalAlignment: "center",
  };
}

function styleHeader(sheet, address) {
  range(sheet, address).format = {
    fill: headerFill,
    font: { bold: true, color: "#1F2937" },
    borders: border,
    horizontalAlignment: "center",
    verticalAlignment: "center",
    wrapText: true,
  };
}

function styleTable(sheet, address) {
  range(sheet, address).format = {
    borders: border,
    verticalAlignment: "center",
  };
}

function setWidths(sheet, widths) {
  for (const [letter, px] of Object.entries(widths)) {
    range(sheet, `${letter}:${letter}`).format.columnWidthPx = px;
  }
}

function padRow(values, width = AMOUNT_COL) {
  return [...values, ...Array(Math.max(0, width - values.length)).fill("")];
}

function padRows(rows, width = AMOUNT_COL) {
  return rows.map((row) => padRow(row, width));
}

function targetYearFormula() {
  return `VALUE(LEFT($E$3,4))`;
}

function targetMonthFormula() {
  return `VALUE(MID($E$3,FIND("年",$E$3)+1,FIND("月",$E$3)-FIND("年",$E$3)-1))`;
}

function closingDayFormula() {
  return `IF($E$4="15日",15,IF($E$4="20日",20,31))`;
}

function deliveryDateFormula(dayCell) {
  return `=IF(${dayCell}="","",DATE(${targetYearFormula()},${targetMonthFormula()}+IF(AND($E$4<>"月末",${dayCell}>${closingDayFormula()}),-1,0),${dayCell}))`;
}

function makeMasterSheets() {
  const customers = sheets["顧客マスタ"];
  styleTitle(customers, "A1:K1");
  setValues(customers, "A1:K1", [["顧客マスタ"]]);
  setValues(customers, "A3:K5", [
    ["顧客ID", "請求先名", "支払区分", "送付方法", "締日", "敬称", "郵便番号", "住所", "メール", "LINE名", "備考"],
    ["CUST001", "〇〇株式会社", "振込", "Gmail", "月末", "御中", "100-0001", "東京都千代田区丸の内1-1-1", "billing@example.com", "〇〇株式会社", "系列2店舗"],
    ["CUST002", "現金テスト商店", "現金", "手渡し", "月末", "様", "160-0001", "東京都新宿区新宿1-1-1", "", "", "将来分離用サンプル"],
  ]);
  styleHeader(customers, "A3:K3");
  styleTable(customers, "A4:K5");
  setWidths(customers, { A: 90, B: 180, C: 80, D: 90, E: 70, F: 60, G: 90, H: 240, I: 190, J: 140, K: 180 });
  range(customers, "C4:C100").dataValidation = { allowBlank: false, list: { inCellDropDown: true, source: ["振込", "現金"] } };
  range(customers, "D4:D100").dataValidation = { allowBlank: false, list: { inCellDropDown: true, source: ["Gmail", "LINE", "手渡し", "郵送"] } };

  const stores = sheets["店舗マスタ"];
  styleTitle(stores, "A1:E1");
  setValues(stores, "A1:E1", [["店舗マスタ"]]);
  setValues(stores, "A3:E6", [
    ["店舗ID", "顧客ID", "店舗名", "表示順", "備考"],
    ["S001", "CUST001", "本店", 1, "顧客共通単価を利用"],
    ["S002", "CUST001", "駅前店", 2, "一部店舗別単価"],
    ["S003", "CUST002", "本店", 1, "現金顧客サンプル"],
  ]);
  styleHeader(stores, "A3:E3");
  styleTable(stores, "A4:E6");
  setWidths(stores, { A: 90, B: 90, C: 140, D: 70, E: 180 });

  const prices = sheets["顧客別単価マスタ"];
  styleTitle(prices, "A1:H1");
  setValues(prices, "A1:H1", [["顧客別単価マスタ"]]);
  setValues(prices, "A3:H13", [
    ["顧客ID", "店舗ID", "商品名", "単価", "区分", "適用開始日", "適用終了日", "備考"],
    ["CUST001", "", "バスタオル", 50, "商品", "2026/4/1", "", "共通単価"],
    ["CUST001", "", "フェイスタオル", 10, "商品", "2026/4/1", "", "共通単価"],
    ["CUST001", "", "バスマット", 20, "商品", "2026/4/1", "", "共通単価"],
    ["CUST001", "", "配達料", 150, "配達料", "2026/4/1", "", "共通単価"],
    ["CUST001", "S002", "バスタオル", 50, "商品", "2026/4/1", "", "店舗別単価例"],
    ["CUST001", "S002", "フェイスタオル", 10, "商品", "2026/4/1", "", "店舗別単価例"],
    ["CUST001", "S002", "バスマット", 20, "商品", "2026/4/1", "", "店舗別単価例"],
    ["CUST001", "S002", "配達料", 150, "配達料", "2026/4/1", "", "店舗別単価例"],
    ["CUST002", "", "バスタオル", 55, "商品", "2026/4/1", "", "現金顧客用"],
    ["CUST002", "", "配達料", 120, "配達料", "2026/4/1", "", "現金顧客用"],
  ]);
  styleHeader(prices, "A3:H3");
  styleTable(prices, "A4:H13");
  range(prices, "D4:D100").format.numberFormat = yenFormat;
  range(prices, "E4:E100").dataValidation = { allowBlank: false, list: { inCellDropDown: true, source: ["商品", "配達料", "その他手数料"] } };
  setWidths(prices, { A: 90, B: 80, C: 150, D: 80, E: 90, F: 105, G: 105, H: 180 });

  const settings = sheets["設定"];
  styleTitle(settings, "A1:D1");
  setValues(settings, "A1:D1", [["設定"]]);
  setValues(settings, "A3:D7", [
    ["項目", "値", "説明", ""],
    ["消費税率", 0.1, "請求集計の消費税計算で参照", ""],
    ["初期請求月", "2026年4月", "横型入力の初期値", ""],
    ["納品回数上限", DELIVERY_COUNT, "このプロトタイプでは20回", ""],
    ["支払区分", "振込/現金", "将来分離しやすいよう顧客マスタに保持", ""],
  ]);
  styleHeader(settings, "A3:D3");
  styleTable(settings, "A4:D7");
  range(settings, "B4").format.numberFormat = "0%";
  setWidths(settings, { A: 130, B: 110, C: 280, D: 60 });
}

function makeInputSheet() {
  const s = sheets["納品入力_横型"];
  styleTitle(s, `A1:${INPUT_LAST_COL}1`);
  setValues(s, `A1:${INPUT_LAST_COL}1`, [padRow(["納品入力_横型"])]);
  setValues(s, `A3:${INPUT_LAST_COL}5`, padRows([
    ["請求先", "〇〇株式会社", "", "対象月", "2026年4月", "", "入力欄", "黄色", ""],
    ["顧客ID", "CUST001", "", "締日", "月末", "", "自動計算", "緑色", ""],
    ["備考", "上部の納品日と数量のみ入力。配達料は納品日が入った列を自動で1計上。", "", "", "", "", "", "", ""],
  ]));
  range(s, "B3:B4").format.fill = inputFill;
  range(s, "E3:E4").format.fill = inputFill;
  range(s, "H3").format.fill = inputFill;
  range(s, "H4").format.fill = calcFill;
  s.freezePanes.freezeRows(7);
  setWidths(s, Object.fromEntries([["A", 150], ["B", 80], ...deliveryCols.map((letter) => [letter, 68]), [col(TOTAL_COL), 90], [col(AMOUNT_COL), 100]]));
  range(s, "B4").dataValidation = { allowBlank: false, list: { inCellDropDown: true, source: ["CUST001", "CUST002"] } };
  range(s, "B3").dataValidation = { allowBlank: false, list: { inCellDropDown: true, source: ["〇〇株式会社", "現金テスト商店"] } };
  range(s, "E4").dataValidation = { allowBlank: false, list: { inCellDropDown: true, source: ["月末", "15日", "20日"] } };
  range(s, `A2:${INPUT_LAST_COL}2`).merge();
  setFormulas(s, "A2", [[`=$E$3&" 請求明細（"&$E$4&"締め）"`]]);
  range(s, `A2:${INPUT_LAST_COL}2`).format = { font: { bold: true, size: 14, color: "#1F2937" }, horizontalAlignment: "left" };

  const blocks = [
    { start: 7, storeId: "S001", storeName: "本店", dates: ["2026/4/1", "2026/4/4", "2026/4/9", "2026/4/15", "2026/4/20"], qty: [[100, "", 50, 50, ""], [150, 200, 100, "", 100], [10, "", 10, "", 10]] },
    { start: 17, storeId: "S002", storeName: "駅前店", dates: ["2026/4/2", "2026/4/8", "2026/4/16", "", ""], qty: [[80, 100, "", "", ""], [100, 100, 100, "", ""], ["", 10, 10, "", ""]] },
  ];

  for (const block of blocks) {
    const sr = block.start;
    const dateDays = padRow(block.dates.map((value) => (value ? Number(value.split("/").at(-1)) : "")), DELIVERY_COUNT);
    const qtyRows = block.qty.map((values) => padRow(values, DELIVERY_COUNT));
    setValues(s, `A${sr}:${INPUT_LAST_COL}${sr}`, [padRow([block.storeName, `店舗ID: ${block.storeId}`])]);
    range(s, `A${sr}:${INPUT_LAST_COL}${sr}`).merge();
    range(s, `A${sr}:${INPUT_LAST_COL}${sr}`).format = { fill: "#B4C6E7", font: { bold: true, size: 14, color: "#1F2937" }, borders: border };
    setValues(s, `A${sr + 1}:${INPUT_LAST_COL}${sr + 1}`, [padRow(["商品名", "単価", ...deliveryHeaders, "合計", "金額"])]);
    styleHeader(s, `A${sr + 1}:${INPUT_LAST_COL}${sr + 1}`);
    setValues(s, `A${sr + 2}:${INPUT_LAST_COL}${sr + 2}`, [padRow(["日だけ入力", "", ...dateDays, "", ""])]);
    setFormulas(s, `C${sr + 3}:${col(LAST_DELIVERY_COL)}${sr + 3}`, [deliveryCols.map((letter) => deliveryDateFormula(`${letter}${sr + 2}`))]);
    setValues(s, `A${sr + 3}:B${sr + 3}`, [["納品日表示", ""]]);
    range(s, `C${sr + 2}:${col(LAST_DELIVERY_COL)}${sr + 2}`).format = { fill: inputFill, numberFormat: "0", borders: border, horizontalAlignment: "center" };
    range(s, `C${sr + 3}:${col(LAST_DELIVERY_COL)}${sr + 3}`).format = { fill: calcFill, numberFormat: dateFormat, borders: border, horizontalAlignment: "center" };
    range(s, `A${sr + 2}:${INPUT_LAST_COL}${sr + 3}`).format.borders = border;

    const products = ["バスタオル", "フェイスタオル", "バスマット", "配達料"];
    setValues(s, `A${sr + 4}:A${sr + 7}`, products.map((p) => [p]));
    setFormulas(s, `B${sr + 4}:B${sr + 7}`, products.map((p) => [`=IFERROR(INDEX(${sheetRef("顧客別単価マスタ")}!$D$4:$D$100,MATCH(1,(${sheetRef("顧客別単価マスタ")}!$A$4:$A$100=$B$4)*(${sheetRef("顧客別単価マスタ")}!$B$4:$B$100="${block.storeId}")*(${sheetRef("顧客別単価マスタ")}!$C$4:$C$100=A${sr + 4 + products.indexOf(p)}),0)),INDEX(${sheetRef("顧客別単価マスタ")}!$D$4:$D$100,MATCH(1,(${sheetRef("顧客別単価マスタ")}!$A$4:$A$100=$B$4)*(${sheetRef("顧客別単価マスタ")}!$B$4:$B$100="")*(${sheetRef("顧客別単価マスタ")}!$C$4:$C$100=A${sr + 4 + products.indexOf(p)}),0)))`]));
    setValues(s, `C${sr + 4}:${col(LAST_DELIVERY_COL)}${sr + 6}`, qtyRows);
    setFormulas(s, `C${sr + 7}:${col(LAST_DELIVERY_COL)}${sr + 7}`, [deliveryCols.map((letter) => `=IF(${letter}${sr + 3}<>"",1,"")`)]);
    setFormulas(s, `${col(TOTAL_COL)}${sr + 4}:${col(TOTAL_COL)}${sr + 7}`, products.map((_, i) => [`=SUM(C${sr + 4 + i}:${col(LAST_DELIVERY_COL)}${sr + 4 + i})`]));
    setFormulas(s, `${col(AMOUNT_COL)}${sr + 4}:${col(AMOUNT_COL)}${sr + 7}`, products.map((_, i) => [`=${col(TOTAL_COL)}${sr + 4 + i}*B${sr + 4 + i}`]));
    styleTable(s, `A${sr + 4}:${INPUT_LAST_COL}${sr + 7}`);
    range(s, `B${sr + 4}:B${sr + 7}`).format = { fill: calcFill, numberFormat: yenFormat, borders: border, horizontalAlignment: "right" };
    range(s, `C${sr + 4}:${col(LAST_DELIVERY_COL)}${sr + 6}`).format = { fill: inputFill, borders: border, horizontalAlignment: "right" };
    range(s, `C${sr + 7}:${col(LAST_DELIVERY_COL)}${sr + 7}`).format = { fill: calcFill, borders: border, horizontalAlignment: "right" };
    range(s, `${col(TOTAL_COL)}${sr + 4}:${col(AMOUNT_COL)}${sr + 7}`).format = { fill: calcFill, numberFormat: yenFormat, borders: border, horizontalAlignment: "right" };
    range(s, `A${sr + 4}:A${sr + 7}`).format.horizontalAlignment = "left";
    range(s, `C${sr + 2}:${col(LAST_DELIVERY_COL)}${sr + 2}`).dataValidation = {
      rule: { type: "whole", operator: "between", formula1: 1, formula2: 31 },
      errorAlert: { style: "stop", title: "日付エラー", message: "1〜31の日だけ入力してください。" },
    };
    range(s, `C${sr + 4}:${col(LAST_DELIVERY_COL)}${sr + 7}`).dataValidation = {
      rule: { type: "whole", operator: "greaterThanOrEqual", formula1: 0 },
      errorAlert: { style: "stop", title: "数量エラー", message: "0以上の整数を入力してください。" },
    };
  }
}

function ledgerRows() {
  const rows = [];
  const blocks = [
    { storeName: "本店", storeId: "S001", sr: 7 },
    { storeName: "駅前店", storeId: "S002", sr: 17 },
  ];
  for (const block of blocks) {
    for (let productOffset = 0; productOffset < 4; productOffset++) {
      const productRow = block.sr + 4 + productOffset;
      for (let i = 0; i < DELIVERY_COUNT; i++) {
        const dateCell = `${col(3 + i)}${block.sr + 3}`;
        const qtyCell = `${col(3 + i)}${productRow}`;
        rows.push({ block, productRow, dateCell, qtyCell });
      }
    }
  }
  return rows;
}

function makeLedger() {
  const s = sheets["納品台帳_自動生成"];
  styleTitle(s, "A1:J1");
  setValues(s, "A1:J1", [["納品台帳_自動生成"]]);
  setValues(s, "A3:J3", [["請求月", "請求先", "店舗名", "納品日", "商品名", "数量", "単価", "金額", "区分", "備考"]]);
  styleHeader(s, "A3:J3");

  const rows = ledgerRows();
  rows.forEach((r, i) => {
    const row = 4 + i;
    const input = sheetRef("納品入力_横型");
    const price = sheetRef("顧客別単価マスタ");
    setFormulas(s, `A${row}:J${row}`, [[
      `=IF(OR(${input}!${r.dateCell}="",${input}!${r.qtyCell}=""),"",${input}!$E$3)`,
      `=IF(A${row}="","",${input}!$B$3)`,
      `=IF(A${row}="","","${r.block.storeName}")`,
      `=IF(A${row}="","",${input}!${r.dateCell})`,
      `=IF(A${row}="","",${input}!A${r.productRow})`,
      `=IF(A${row}="","",${input}!${r.qtyCell})`,
      `=IF(A${row}="","",${input}!B${r.productRow})`,
      `=IF(A${row}="","",F${row}*G${row})`,
      `=IF(A${row}="","",INDEX(${price}!$E$4:$E$100,MATCH(1,(${price}!$A$4:$A$100=${input}!$B$4)*(${price}!$C$4:$C$100=E${row})*IF(${price}!$B$4:$B$100="",1,${price}!$B$4:$B$100="${r.block.storeId}"),0)))`,
      `=IF(A${row}="","","")`,
    ]]);
  });
  styleTable(s, `A4:J${3 + rows.length}`);
  range(s, `D4:D${3 + rows.length}`).format.numberFormat = "yyyy/m/d";
  range(s, `F4:H${3 + rows.length}`).format.numberFormat = yenFormat;
  range(s, `A4:J${3 + rows.length}`).format.verticalAlignment = "center";
  setWidths(s, { A: 100, B: 160, C: 100, D: 100, E: 140, F: 80, G: 80, H: 100, I: 90, J: 160 });
  s.freezePanes.freezeRows(3);
}

function makeInvoiceDetail() {
  const s = sheets["請求明細_出力"];
  styleTitle(s, `A1:${INPUT_LAST_COL}1`);
  setValues(s, `A1:${INPUT_LAST_COL}1`, [padRow(["請求明細_出力"])]);
  setValues(s, `A3:${INPUT_LAST_COL}6`, padRows([
    ["請求先名", "〇〇株式会社", "", "店舗名", "全店舗", "", "発行日", "2026/5/1", ""],
    ["対象期間", "2026/4/1〜2026/4/30", "", "締日", "月末", "", "請求月", "2026年4月", ""],
    ["", "", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", "", ""],
  ]));
  range(s, "B3:B4").format.fill = calcFill;
  range(s, "E3:E4").format.fill = calcFill;
  range(s, "H3:H4").format.fill = calcFill;
  range(s, "B4:C4").merge();
  range(s, `A2:${INPUT_LAST_COL}2`).merge();
  setFormulas(s, "A2", [[`=${sheetRef("納品入力_横型")}!$E$3&" 請求明細"`]]);
  range(s, `A2:${INPUT_LAST_COL}2`).format = { font: { bold: true, size: 14, color: "#1F2937" }, horizontalAlignment: "left" };
  setWidths(s, Object.fromEntries([["A", 150], ["B", 72], ...deliveryCols.map((letter) => [letter, 56]), [col(TOTAL_COL), 90], [col(AMOUNT_COL), 105]]));

  const blocks = [
    { start: 8, store: "本店", inputStart: 7 },
    { start: 18, store: "駅前店", inputStart: 17 },
  ];
  for (const block of blocks) {
    const sr = block.start;
    setValues(s, `A${sr}:${INPUT_LAST_COL}${sr}`, [padRow([block.store])]);
    range(s, `A${sr}:${INPUT_LAST_COL}${sr}`).merge();
    range(s, `A${sr}:${INPUT_LAST_COL}${sr}`).format = { fill: "#B4C6E7", font: { bold: true, size: 14 }, borders: border };
    setValues(s, `A${sr + 1}:${INPUT_LAST_COL}${sr + 1}`, [padRow(["商品名", "単価", ...Array(DELIVERY_COUNT).fill(""), "合計数量", "金額"])]);
    setFormulas(s, `C${sr + 1}:${col(LAST_DELIVERY_COL)}${sr + 1}`, [
      deliveryCols.map((letter) => {
        const cell = `${sheetRef("納品入力_横型")}!${letter}${block.inputStart + 3}`;
        return `=IF(${cell}=0,"",${cell})`;
      }),
    ]);
    styleHeader(s, `A${sr + 1}:${INPUT_LAST_COL}${sr + 1}`);
    range(s, `C${sr + 1}:${col(LAST_DELIVERY_COL)}${sr + 1}`).format.numberFormat = dateFormat;
    for (let i = 0; i < 4; i++) {
      const row = sr + 2 + i;
      const inputRow = block.inputStart + 4 + i;
      setFormulas(s, `A${row}:${INPUT_LAST_COL}${row}`, [[
        `=${sheetRef("納品入力_横型")}!A${inputRow}`,
        `=${sheetRef("納品入力_横型")}!B${inputRow}`,
        ...deliveryCols.map((letter) => `=IF(${sheetRef("納品入力_横型")}!${letter}${inputRow}=0,"",${sheetRef("納品入力_横型")}!${letter}${inputRow})`),
        `=${sheetRef("納品入力_横型")}!${col(TOTAL_COL)}${inputRow}`,
        `=${sheetRef("納品入力_横型")}!${col(AMOUNT_COL)}${inputRow}`,
      ]]);
    }
    styleTable(s, `A${sr + 2}:${INPUT_LAST_COL}${sr + 5}`);
    range(s, `B${sr + 2}:${INPUT_LAST_COL}${sr + 5}`).format.numberFormat = yenFormat;
    range(s, `B${sr + 2}:${INPUT_LAST_COL}${sr + 5}`).format.horizontalAlignment = "right";
    range(s, `A${sr + 2}:A${sr + 5}`).format.horizontalAlignment = "left";
    setFormulas(s, `A${sr + 6}:${INPUT_LAST_COL}${sr + 6}`, [[`="店舗計"`, ...Array(AMOUNT_COL - 3).fill(""), `=SUM(${col(TOTAL_COL)}${sr + 2}:${col(TOTAL_COL)}${sr + 5})`, `=SUM(${col(AMOUNT_COL)}${sr + 2}:${col(AMOUNT_COL)}${sr + 5})`]]);
    range(s, `A${sr + 6}:${INPUT_LAST_COL}${sr + 6}`).format = { fill: totalFill, font: { bold: true }, borders: border, numberFormat: yenFormat };
    range(s, `A${sr + 6}:${col(LAST_DELIVERY_COL)}${sr + 6}`).merge();
  }

  setValues(s, `A28:${INPUT_LAST_COL}28`, [padRow(["全店舗合計"])]);
  range(s, `A28:${INPUT_LAST_COL}28`).merge();
  range(s, `A28:${INPUT_LAST_COL}28`).format = { fill: "#1F4E79", font: { bold: true, color: "#FFFFFF", size: 14 }, borders: border };
  setValues(s, `A29:${INPUT_LAST_COL}29`, [padRow(["商品名", "単価", ...Array(DELIVERY_COUNT).fill(""), "合計数量", "金額"])]);
  styleHeader(s, `A29:${INPUT_LAST_COL}29`);
  const products = ["バスタオル", "フェイスタオル", "バスマット", "配達料"];
  products.forEach((p, i) => {
    const row = 30 + i;
    setValues(s, `A${row}:A${row}`, [[p]]);
    setFormulas(s, `B${row}:${INPUT_LAST_COL}${row}`, [[
      `=MAXIFS(${sheetRef("納品台帳_自動生成")}!$G$4:$G$100,${sheetRef("納品台帳_自動生成")}!$E$4:$E$100,A${row})`,
      ...Array(DELIVERY_COUNT).fill(""),
      `=SUMIFS(${sheetRef("納品台帳_自動生成")}!$F:$F,${sheetRef("納品台帳_自動生成")}!$E:$E,A${row})`,
      `=SUMIFS(${sheetRef("納品台帳_自動生成")}!$H:$H,${sheetRef("納品台帳_自動生成")}!$E:$E,A${row})`,
    ]]);
  });
  styleTable(s, `A30:${INPUT_LAST_COL}33`);
  range(s, `B30:${INPUT_LAST_COL}33`).format = { numberFormat: yenFormat, horizontalAlignment: "right", borders: border };
  setFormulas(s, `A34:${INPUT_LAST_COL}34`, [[`="総合計"`, ...Array(AMOUNT_COL - 3).fill(""), `=SUM(${col(TOTAL_COL)}30:${col(TOTAL_COL)}33)`, `=SUM(${col(AMOUNT_COL)}30:${col(AMOUNT_COL)}33)`]]);
  range(s, `A34:${INPUT_LAST_COL}34`).format = { fill: totalFill, font: { bold: true }, borders: border, numberFormat: yenFormat };
  range(s, `A34:${col(LAST_DELIVERY_COL)}34`).merge();
}

function makeSummaryAndInvoice() {
  const summary = sheets["請求集計"];
  styleTitle(summary, "A1:L1");
  setValues(summary, "A1:L1", [["請求集計"]]);
  setValues(summary, "A3:L3", [["請求月", "顧客ID", "請求先名", "支払区分", "送付方法", "商品合計", "配達料", "その他手数料", "税抜合計", "消費税", "税込合計", "備考"]]);
  styleHeader(summary, "A3:L3");
  setFormulas(summary, "A4:L4", [[
    `=${sheetRef("納品入力_横型")}!$E$3`,
    `=${sheetRef("納品入力_横型")}!$B$4`,
    `=${sheetRef("納品入力_横型")}!$B$3`,
    `=XLOOKUP(B4,${sheetRef("顧客マスタ")}!$A$4:$A$100,${sheetRef("顧客マスタ")}!$C$4:$C$100,"")`,
    `=XLOOKUP(B4,${sheetRef("顧客マスタ")}!$A$4:$A$100,${sheetRef("顧客マスタ")}!$D$4:$D$100,"")`,
    `=SUMIFS(${sheetRef("納品台帳_自動生成")}!$H:$H,${sheetRef("納品台帳_自動生成")}!$I:$I,"商品")`,
    `=SUMIFS(${sheetRef("納品台帳_自動生成")}!$H:$H,${sheetRef("納品台帳_自動生成")}!$I:$I,"配達料")`,
    0,
    `=SUM(F4:H4)`,
    `=ROUND(I4*${sheetRef("設定")}!$B$4,0)`,
    `=I4+J4`,
    `="支払区分で現金/振込の分離が可能"`,
  ]]);
  styleTable(summary, "A4:L4");
  range(summary, "F4:K4").format = { numberFormat: yenFormat, horizontalAlignment: "right", borders: border };
  setWidths(summary, { A: 100, B: 90, C: 160, D: 80, E: 90, F: 100, G: 90, H: 110, I: 100, J: 90, K: 100, L: 220 });

  const invoice = sheets["請求書_出力"];
  styleTitle(invoice, "A1:H1");
  setValues(invoice, "A1:H1", [["請求書_出力"]]);
  setValues(invoice, "A3:H9", [
    ["請求先", "〇〇株式会社 御中", "", "", "発行日", "2026/5/1", "", ""],
    ["請求月", "2026年4月", "", "", "締日", "月末", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["ご請求金額", "", "", "", "", "", "", ""],
    ["税抜合計", "", "", "", "", "", "", ""],
    ["消費税", "", "", "", "", "", "", ""],
    ["税込合計", "", "", "", "", "", "", ""],
  ]);
  setFormulas(invoice, "B6:B9", [[`=${sheetRef("請求集計")}!K4`], [`=${sheetRef("請求集計")}!I4`], [`=${sheetRef("請求集計")}!J4`], [`=${sheetRef("請求集計")}!K4`]]);
  range(invoice, "A6:H6").format = { fill: totalFill, font: { bold: true, size: 16 }, borders: border };
  range(invoice, "B6:B9").format = { numberFormat: yenFormat, horizontalAlignment: "right" };
  setValues(invoice, "A12:H12", [["内訳", "", "", "", "", "", "", ""]]);
  range(invoice, "A12:H12").merge();
  range(invoice, "A12:H12").format = { fill: "#B4C6E7", font: { bold: true }, borders: border };
  setValues(invoice, "A13:D15", [
    ["区分", "金額", "備考", ""],
    ["商品合計", "", "請求集計から反映", ""],
    ["配達料", "", "請求集計から反映", ""],
  ]);
  setFormulas(invoice, "B14:B15", [[`=${sheetRef("請求集計")}!F4`], [`=${sheetRef("請求集計")}!G4`]]);
  styleHeader(invoice, "A13:D13");
  styleTable(invoice, "A14:D15");
  range(invoice, "B14:B15").format.numberFormat = yenFormat;
  setWidths(invoice, { A: 120, B: 130, C: 180, D: 80, E: 90, F: 100, G: 60, H: 60 });
}

function makeUsage() {
  const s = sheets["使い方"];
  styleTitle(s, "A1:H1");
  setValues(s, "A1:H1", [["使い方"]]);
  setValues(s, "A3:H13", [
    ["項目", "説明", "", "", "", "", "", ""],
    ["1", "顧客マスタ、店舗マスタ、顧客別単価マスタを整備します。店舗別単価がない商品は店舗IDを空欄にした共通単価を使います。", "", "", "", "", "", ""],
    ["2", "納品入力_横型で請求先、対象月、各店舗ブロックの納品日を入力します。納品日は日だけ入力し、納品回数は20回分まで用意しています。", "", "", "", "", "", ""],
    ["3", "商品行には数量だけ入力します。単価、合計、金額は自動計算です。", "", "", "", "", "", ""],
    ["4", "配達料は納品日が入った列を1回として自動計上します。", "", "", "", "", "", ""],
    ["5", "納品台帳_自動生成は横型入力から縦型に展開されるため、直接編集しません。", "", "", "", "", "", ""],
    ["6", "請求明細_出力は顧客提出用です。店舗別ブロックと全店舗合計を確認します。", "", "", "", "", "", ""],
    ["7", "請求集計は請求書反映用です。消費税率は設定シートのB4を変更します。", "", "", "", "", "", ""],
    ["拡張案", "PDF出力は請求明細_出力/請求書_出力を印刷範囲化、Gmail/LINE送付は請求集計の送付方法と支払区分をキーに出力対象を分ける構成にします。", "", "", "", "", "", ""],
    ["既存構成", "このプロジェクトは Next.js アプリで、現金/振込データが src/data/cash.ts と src/data/bank.ts に分かれています。請求プレビューは src/components/InvoicePreview.tsx にあります。", "", "", "", "", "", ""],
    ["今回の範囲", "既存アプリには手を入れず、要件検証用の独立した最小プロトタイプブックを作成しています。", "", "", "", "", "", ""],
  ]);
  styleHeader(s, "A3:H3");
  styleTable(s, "A4:H13");
  range(s, "B4:B13").format.wrapText = true;
  range(s, "A4:A13").format.horizontalAlignment = "center";
  setWidths(s, { A: 90, B: 720, C: 30, D: 30, E: 30, F: 30, G: 30, H: 30 });
}

makeMasterSheets();
makeInputSheet();
makeLedger();
makeInvoiceDetail();
makeSummaryAndInvoice();
makeUsage();

for (const name of sheetNames) {
  const s = sheets[name];
  s.showGridLines = false;
}

workbook.recalculate();

const checks = [
  await workbook.inspect({ kind: "table", range: `納品入力_横型!A1:${INPUT_LAST_COL}24`, include: "values,formulas", tableMaxRows: 24, tableMaxCols: AMOUNT_COL }),
  await workbook.inspect({ kind: "table", range: "納品台帳_自動生成!A3:J170", include: "values,formulas", tableMaxRows: 40, tableMaxCols: 10 }),
  await workbook.inspect({ kind: "table", range: "請求集計!A3:L4", include: "values,formulas", tableMaxRows: 4, tableMaxCols: 12 }),
  await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options: { useRegex: true, maxResults: 200 }, summary: "formula error scan" }),
];

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(path.join(outputDir, "verification.ndjson"), checks.map((c) => c.ndjson).join("\n"));

for (const name of ["納品入力_横型", "請求明細_出力", "請求集計", "請求書_出力"]) {
  const blob = await workbook.render({ sheetName: name, range: name === "請求明細_出力" || name === "納品入力_横型" ? `A1:${INPUT_LAST_COL}34` : "A1:L24", scale: 1.5 });
  if (typeof blob.save === "function") {
    await blob.save(path.join(outputDir, `${name}.png`));
  } else if (typeof blob.arrayBuffer === "function") {
    await fs.writeFile(path.join(outputDir, `${name}.png`), Buffer.from(await blob.arrayBuffer()));
  } else if (blob.data) {
    await fs.writeFile(path.join(outputDir, `${name}.png`), Buffer.from(blob.data));
  }
}

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(path.join(outputDir, "JV_請求明細シート_最小プロトタイプ.xlsx"));
