import ethers from 'ethers';

const infuraURL = 'https://testnet.rpc.zora.energy/';

export const provider = new ethers.JsonRpcProvider(infuraURL);

