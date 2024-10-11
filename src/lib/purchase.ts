// testnet shit
export const ZORA_FEE: number = 0.000777; //0.1554;

export const calculateTotalPrice = (quantity: number, ethPrice: string): string => {
  const p = quantity * (Number.parseFloat(ethPrice.toString()) + ZORA_FEE);
  //p += p * (isAllowList ? ALLOWLIST_ZORA_FEE : ZORA_FEE);
  return p.toString();
};

export const price = (x: string) => Number.parseInt(x, 16) / 1000000000000000000;
