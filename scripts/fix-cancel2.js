const fs = require('fs');
let code = fs.readFileSync('tests/cancel-refund.test.ts', 'utf8');

// Strip out any trailing blocks we messed up
let marker = 'it("4. COD orders: cancel directly without Razorpay calls"';
let index = code.indexOf(marker);
if (index > -1) {
    let endOfBlock = code.indexOf('});', index + marker.length);
    if (endOfBlock > -1) {
        // Keep up to this block's end
        code = code.substring(0, endOfBlock + 3);
        
        // Append our new test and the closing describe
        code += '\n\n' + \
  it("5. Stale PENDING_REFUND is cleared and retry occurs", async () => {
    const existingStaleRefundRecord = {
      id: "ref-rec-stale",
      status: "PENDING_REFUND",
      razorpay_signature: null,
      created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    };

    let paymentCallCount = 0;
    const deleteBuilder = createChainableBuilder({ id: "ref-rec-stale" });
    
    mockFrom.mockImplementation((table: string) => {
      if (table === "orders") {
        return createChainableBuilder(onlineOrder);
      }
      if (table === "payments") {
        paymentCallCount++;
        if (paymentCallCount === 1) return createChainableBuilder(successPayment);
        if (paymentCallCount === 2) return createChainableBuilder(existingStaleRefundRecord);
        if (paymentCallCount === 3) return deleteBuilder; // For delete
        if (paymentCallCount === 4) return createChainableBuilder({ id: "new-pending-ref" }); // Insert new lock
        return createChainableBuilder({ id: "updated" });
      }
      return createChainableBuilder(null);
    });

    mockFetchMultipleRefund.mockResolvedValue({ items: [] });
    mockRefund.mockResolvedValue({ id: "rfnd_new_success" });
    mockRpc.mockResolvedValue({ data: { success: true }, error: null });

    const res = await POST(makeRequest("order-abc"), { params: { id: "order-abc" } });

    expect(res.status).toBe(200);
    expect(deleteBuilder.delete).toHaveBeenCalled();
    expect(mockRefund).toHaveBeenCalled();
  });
});
\;
    }
}
fs.writeFileSync('tests/cancel-refund.test.ts', code);