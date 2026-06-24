import type { Voucher, GSTCalcResult } from "@/types";

// Calculate GST
export function calculateGST(
  taxableValue: number,
  rate: number,
  isInterState: boolean
): GSTCalcResult {
  const totalTax = (taxableValue * rate) / 100;
  if (isInterState) {
    return { igst: totalTax, cgst: 0, sgst: 0, cess: 0, total: totalTax };
  }
  const half = totalTax / 2;
  return { igst: 0, cgst: half, sgst: half, cess: 0, total: totalTax };
}

// Generate GSTR-1 JSON in NIC format
export function generateGSTR1JSON(
  vouchers: Voucher[],
  gstin: string,
  period: string,
  year: number
): Record<string, unknown> {
  const fp = `${String(period).padStart(2, "0")}${year}`;

  const b2b: Record<string, unknown>[] = [];
  const b2cs: Record<string, unknown>[] = [];
  const b2cl: Record<string, unknown>[] = [];
  const cdnr: Record<string, unknown>[] = [];

  for (const voucher of vouchers) {
    if (voucher.type === "SALES" && voucher.gstLines && voucher.gstLines.length > 0) {
      const partyEntry = voucher.entries?.find((e) => e.type === "DEBIT");
      const partyGstin = partyEntry?.ledger?.gstin;

      if (partyGstin) {
        // B2B
        const existing = b2b.find((x) => (x as { ctin: string }).ctin === partyGstin);
        const invItem = {
          inum: voucher.number,
          idt: new Date(voucher.date).toLocaleDateString("en-IN"),
          val: voucher.totalAmount,
          pos: voucher.placeOfSupply || "33",
          rchrg: voucher.reverseCharge ? "Y" : "N",
          inv_typ: "R",
          itms: voucher.gstLines.map((line, idx) => ({
            num: idx + 1,
            itm_det: {
              txval: line.taxableValue,
              rt: line.igstRate || (line.cgstRate + line.sgstRate) * 2,
              iamt: line.igstAmount,
              camt: line.cgstAmount,
              samt: line.sgstAmount,
              csamt: line.cessAmount,
            },
          })),
        };

        if (existing) {
          (existing.inv as unknown[]).push(invItem);
        } else {
          b2b.push({ ctin: partyGstin, inv: [invItem] });
        }
      } else {
        // B2C
        const totalTaxable = voucher.gstLines.reduce((sum, l) => sum + l.taxableValue, 0);
        if (totalTaxable > 250000 && voucher.placeOfSupply) {
          // B2CL - large inter-state
          b2cl.push({
            pos: voucher.placeOfSupply,
            inv: [
              {
                inum: voucher.number,
                idt: new Date(voucher.date).toLocaleDateString("en-IN"),
                val: voucher.totalAmount,
                itms: voucher.gstLines.map((line, idx) => ({
                  num: idx + 1,
                  itm_det: {
                    txval: line.taxableValue,
                    rt: line.igstRate,
                    iamt: line.igstAmount,
                    csamt: line.cessAmount,
                  },
                })),
              },
            ],
          });
        } else {
          // B2CS - small
          const rate = voucher.gstLines[0]?.igstRate || (voucher.gstLines[0]?.cgstRate + voucher.gstLines[0]?.sgstRate) * 2 || 0;
          const existing = b2cs.find(
            (x) =>
              (x as { rt: number }).rt === rate &&
              (x as { pos: string }).pos === (voucher.placeOfSupply || "33")
          );
          if (existing) {
            (existing as { txval: number }).txval += voucher.gstLines.reduce(
              (s, l) => s + l.taxableValue,
              0
            );
            (existing as { iamt: number }).iamt += voucher.gstLines.reduce(
              (s, l) => s + l.igstAmount,
              0
            );
            (existing as { camt: number }).camt += voucher.gstLines.reduce(
              (s, l) => s + l.cgstAmount,
              0
            );
            (existing as { samt: number }).samt += voucher.gstLines.reduce(
              (s, l) => s + l.sgstAmount,
              0
            );
          } else {
            b2cs.push({
              sply_ty: "INTRA",
              pos: voucher.placeOfSupply || "33",
              typ: "OE",
              rt: rate,
              txval: voucher.gstLines.reduce((s, l) => s + l.taxableValue, 0),
              iamt: voucher.gstLines.reduce((s, l) => s + l.igstAmount, 0),
              camt: voucher.gstLines.reduce((s, l) => s + l.cgstAmount, 0),
              samt: voucher.gstLines.reduce((s, l) => s + l.sgstAmount, 0),
              csamt: voucher.gstLines.reduce((s, l) => s + l.cessAmount, 0),
            });
          }
        }
      }
    }
  }

  return {
    gstin,
    fp,
    gt: vouchers.reduce((s, v) => s + v.totalAmount, 0),
    cur_gt: vouchers.reduce((s, v) => s + v.totalAmount, 0),
    b2b,
    b2cs,
    b2cl,
    cdnr,
    nil: { inv: [] },
    exp: { exp_det: [] },
    at: [],
    txpd: [],
    hsn: { data: [] },
    doc_issue: {
      doc_det: [
        {
          doc_num: 1,
          docs: [
            {
              num: 1,
              from: `${gstin}/SI/001`,
              to: `${gstin}/SI/999`,
              totnum: vouchers.length,
              cancel: 0,
              net_issue: vouchers.length,
            },
          ],
        },
      ],
    },
  };
}

// Generate GSTR-3B data
export function generateGSTR3BData(
  vouchers: Voucher[]
): Record<string, unknown> {
  const salesVouchers = vouchers.filter(
    (v) => v.type === "SALES" || v.type === "DEBIT_NOTE"
  );
  const purchaseVouchers = vouchers.filter(
    (v) => v.type === "PURCHASE" || v.type === "CREDIT_NOTE"
  );

  const outputIGST = salesVouchers.reduce(
    (s, v) => s + (v.gstLines?.reduce((gs, l) => gs + l.igstAmount, 0) || 0),
    0
  );
  const outputCGST = salesVouchers.reduce(
    (s, v) => s + (v.gstLines?.reduce((gs, l) => gs + l.cgstAmount, 0) || 0),
    0
  );
  const outputSGST = salesVouchers.reduce(
    (s, v) => s + (v.gstLines?.reduce((gs, l) => gs + l.sgstAmount, 0) || 0),
    0
  );

  const inputIGST = purchaseVouchers.reduce(
    (s, v) => s + (v.gstLines?.reduce((gs, l) => gs + l.igstAmount, 0) || 0),
    0
  );
  const inputCGST = purchaseVouchers.reduce(
    (s, v) => s + (v.gstLines?.reduce((gs, l) => gs + l.cgstAmount, 0) || 0),
    0
  );
  const inputSGST = purchaseVouchers.reduce(
    (s, v) => s + (v.gstLines?.reduce((gs, l) => gs + l.sgstAmount, 0) || 0),
    0
  );

  return {
    sup_details: {
      osup_det: {
        txval: salesVouchers.reduce(
          (s, v) => s + (v.gstLines?.reduce((gs, l) => gs + l.taxableValue, 0) || 0),
          0
        ),
        iamt: outputIGST,
        camt: outputCGST,
        samt: outputSGST,
        csamt: 0,
      },
      osup_zero: { txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 },
      osup_nil_exmp: { txval: 0 },
      isup_rev: { txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 },
      osup_nongst: { txval: 0 },
    },
    inter_sup: {
      unreg_details: [],
      comp_details: [],
      uin_details: [],
    },
    itc_elg: {
      itc_avl: [
        {
          ty: "IMPG",
          iamt: 0,
          camt: 0,
          samt: 0,
          csamt: 0,
        },
        {
          ty: "IMPS",
          iamt: 0,
          camt: 0,
          samt: 0,
          csamt: 0,
        },
        {
          ty: "ISRC",
          iamt: inputIGST,
          camt: inputCGST,
          samt: inputSGST,
          csamt: 0,
        },
        {
          ty: "ISD",
          iamt: 0,
          camt: 0,
          samt: 0,
          csamt: 0,
        },
        {
          ty: "OTH",
          iamt: 0,
          camt: 0,
          samt: 0,
          csamt: 0,
        },
      ],
      itc_rev: [],
      itc_net: {
        iamt: inputIGST,
        camt: inputCGST,
        samt: inputSGST,
        csamt: 0,
      },
      itc_inelg: [],
    },
    inward_sup: {
      isup_details: [
        {
          ty: "GST",
          inter: 0,
          intra: 0,
        },
        {
          ty: "NONGST",
          inter: 0,
          intra: 0,
        },
      ],
    },
    intr_ltfee: {
      intr_details: {
        iamt: 0,
        camt: 0,
        samt: 0,
        csamt: 0,
      },
    },
  };
}

// Build e-invoice payload (NIC format)
export function buildEInvoicePayload(
  voucher: Voucher,
  company: { gstin: string; name: string; address: string; city: string; state: string; stateCode: string; pincode: string },
  buyer: { gstin?: string; name: string; address: string; city: string; state: string; stateCode: string; pincode: string }
): Record<string, unknown> {
  const totalTaxable = voucher.gstLines?.reduce((s, l) => s + l.taxableValue, 0) || 0;
  const totalIGST = voucher.gstLines?.reduce((s, l) => s + l.igstAmount, 0) || 0;
  const totalCGST = voucher.gstLines?.reduce((s, l) => s + l.cgstAmount, 0) || 0;
  const totalSGST = voucher.gstLines?.reduce((s, l) => s + l.sgstAmount, 0) || 0;

  return {
    Version: "1.1",
    TranDtls: {
      TaxSch: "GST",
      SupTyp: "B2B",
      RegRev: voucher.reverseCharge ? "Y" : "N",
    },
    DocDtls: {
      Typ: "INV",
      No: voucher.number,
      Dt: new Date(voucher.date).toLocaleDateString("en-IN"),
    },
    SellerDtls: {
      Gstin: company.gstin,
      LglNm: company.name,
      TrdNm: company.name,
      Addr1: company.address,
      Loc: company.city,
      Pin: parseInt(company.pincode),
      Stcd: company.stateCode,
    },
    BuyerDtls: {
      Gstin: buyer.gstin || "URP",
      LglNm: buyer.name,
      TrdNm: buyer.name,
      Pos: voucher.placeOfSupply || buyer.stateCode,
      Addr1: buyer.address,
      Loc: buyer.city,
      Pin: parseInt(buyer.pincode),
      Stcd: buyer.stateCode,
    },
    ItemList: voucher.gstLines?.map((line, idx) => ({
      SlNo: String(idx + 1),
      PrdDesc: line.description || "Goods",
      IsServc: "N",
      HsnCd: line.hsnCode || "999999",
      Qty: line.quantity || 1,
      Unit: "NOS",
      UnitPrice: line.rate || line.taxableValue,
      TotAmt: line.taxableValue,
      Discount: 0,
      AssAmt: line.taxableValue,
      GstRt: line.igstRate || (line.cgstRate + line.sgstRate) * 2,
      IgstAmt: line.igstAmount,
      CgstAmt: line.cgstAmount,
      SgstAmt: line.sgstAmount,
      CesRt: line.cessRate,
      CesAmt: line.cessAmount,
      TotItemVal: line.taxableValue + line.totalTax,
    })) || [],
    ValDtls: {
      AssVal: totalTaxable,
      IgstVal: totalIGST,
      CgstVal: totalCGST,
      SgstVal: totalSGST,
      TotInvVal: voucher.totalAmount,
    },
  };
}
