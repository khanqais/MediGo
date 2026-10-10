const fs = require('fs');
for (let file of ['tests/pharmacist-medicine.test.ts', 'tests/rate-limit.test.ts']) {
    let buf = fs.readFileSync(file);
    if (buf[0] === 0xff && buf[1] === 0xfe) {
        fs.writeFileSync(file, buf.toString('utf16le'));
    }
}
let cancelCode = fs.readFileSync('tests/cancel-refund.test.ts', 'utf8');
cancelCode = cancelCode.replace(/it\(\"5\. Stale PENDING_REFUND is cleared and retry occurs\"[\s\S]*?\}\);\s*\}\);/, '');
let index = cancelCode.indexOf('it("4. COD');
if (index > -1) {
  let firstPart = cancelCode.substring(0, index);
  let secondPart = cancelCode.substring(index);
  cancelCode = firstPart + '  it("5. Stale PENDING_REFUND is cleared and retry occurs", async () => {\n    const existingStaleRefundRecord = {\n      id: "ref-rec-stale",\n      status: "PENDING_REFUND",\n      razorpay_signature: null,\n      created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),\n    };\n    let paymentCallCount = 0;\n    const deleteBuilder = createChainableBuilder({ id: "ref-rec-stale" });\n    mockFrom.mockImplementation((table) => {\n      if (table === "orders") return createChainableBuilder(onlineOrder);\n      if (table === "payments") {\n        paymentCallCount++;\n        if (paymentCallCount === 1) return createChainableBuilder(successPayment);\n        if (paymentCallCount === 2) return createChainableBuilder(existingStaleRefundRecord);\n        if (paymentCallCount === 3) return deleteBuilder;\n        if (paymentCallCount === 4) return createChainableBuilder({ id: "new-pending-ref" });\n        return createChainableBuilder({ id: "updated" });\n      }\n      return createChainableBuilder(null);\n    });\n    mockFetchMultipleRefund.mockResolvedValue({ items: [] });\n    mockRefund.mockResolvedValue({ id: "rfnd_new_success" });\n    mockRpc.mockResolvedValue({ data: { success: true }, error: null });\n    const res = await POST(makeRequest("order-abc"), { params: { id: "order-abc" } });\n    expect(res.status).toBe(200);\n    expect(deleteBuilder.delete).toHaveBeenCalled();\n    expect(mockRefund).toHaveBeenCalled();\n  });\n\n' + secondPart;
}
fs.writeFileSync('tests/cancel-refund.test.ts', cancelCode);