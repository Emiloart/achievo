-- Add unique constraints for critical invariants
CREATE UNIQUE INDEX "Organization_onchainCreationTxHash_key" ON "Organization"("onchainCreationTxHash");
CREATE UNIQUE INDEX "UsernameOrder_orderHash_key" ON "UsernameOrder"("orderHash");
CREATE UNIQUE INDEX "UsernameTrade_chainId_txHash_key" ON "UsernameTrade"("chainId", "txHash");
