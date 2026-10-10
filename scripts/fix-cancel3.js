const fs = require('fs');
let code = fs.readFileSync('tests/cancel-refund.test.ts', 'utf8');

let marker = 'it("4. COD orders: cancel directly without Razorpay calls"';
let index = code.indexOf(marker);
if (index > -1) {
    let endOfBlock = code.indexOf('});', index + marker.length);
    if (endOfBlock > -1) {
        code = code.substring(0, endOfBlock + 3);
        code += '\n\n' + '  it("5. Stale PENDING_REFUND is cleared and retry occurs", async () => {\n' +
'    const existingStaleRefundRecord = {\n' +
'      id: "ref-rec-stale",\n' +
'      status: "PENDING_REFUND",\n' +
'      razorpay_signature: null,\n' +
'      created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),\n' +
'    };\n' +
'    let paymentCallCount = 0;\n' +
'    const deleteBuilder = createChainableBuilder({ id: "ref-rec-stale" });\n' +
'    mockFrom.mockImplementation((table) => {\n' +
'      if (table === "orders") {\n' +
'        return createChainableBuilder(onlineOrder);\n' +
'      }\n' +
'      if (table === "payments") {\n' +
'        paymentCallCount++;\n' +
'        if (paymentCallCount === 1) return createChainableBuilder(successPayment);\n' +
'        if (paymentCallCount === 2) return createChainableBuilder(existingStaleRefundRecord);\n' +
'        if (paymentCallCount === 3) return deleteBuilder;\n' +
'        if (paymentCallCount === 4) return createChainableBuilder({ id: "new-pending-ref" });\n' +
'        return createChainableBuilder({ id: "updated" });\n' +
'      }\n' +
'      return createChainableBuilder(null);\n' +
'    });\n' +
'    mockFetchMultipleRefund.mockResolvedValue({ items: [] });\n' +
'    mockRefund.mockResolvedValue({ id: "rfnd_new_success" });\n' +
'    mockRpc.mockResolvedValue({ data: { success: true }, error: null });\n' +
'    const res = await POST(makeRequest("order-abc"), { params: { id: "order-abc" } });\n' +
'    expect(res.status).toBe(200);\n' +
'    expect(deleteBuilder.delete).toHaveBeenCalled();\n' +
'    expect(mockRefund).toHaveBeenCalled();\n' +
'  });\n' +
'});\n';
    }
}
fs.writeFileSync('tests/cancel-refund.test.ts', code);