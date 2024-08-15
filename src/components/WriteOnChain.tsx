import React, { useEffect, useCallback, useState } from "react";
import { usePublicClient, PublicClient, useWaitForTransaction } from "wagmi";
import { parseEther } from "viem";
import { abi } from "@/lib/abi/minter-abi";
import { useContractWrite, usePrepareContractWrite, useAccount } from "wagmi";

//export const DROP_CONTRACT = "0x70a2d63e3ce575a8420617d8c0d80de81f2841ca";
//export const MINTER_CONTRACT = "0x2d756f6b69aa9f07e55627c053af1f79eec24172";

export const DROP_CONTRACT = "0xC7dD4a140F87F34c52e853152577c15bf6737467";
export const MINTER_CONTRACT = "0x0afe39611872dbAE7Ceac0f2a693F09962a49a76";

const WriteOnchain: React.FC<{
  setTokenId: (x: number | null) => void;
  previousTokenId: number;
  isSubPatch?: boolean;
  name: string;
  compressed: string;
}> = ({ compressed, name, isSubPatch, previousTokenId, setTokenId }) => {
  let account = useAccount();

  const publicClient = usePublicClient();

  const { config } = usePrepareContractWrite({
    address: MINTER_CONTRACT,
    abi: abi,
    functionName: "purchase",
    args: [
      DROP_CONTRACT,
      account ? account.address : "",
      name,
      compressed,
      isSubPatch ? true : false,
      previousTokenId,
    ],
    value: parseEther("0"),
  });

  const { write, data } = useContractWrite(config);

  const {
    data: transactionData,
    isError: transactionError,
    isLoading: transactionLoading,
  } = useWaitForTransaction({
    hash: data ? data.hash : undefined,
  });

  useEffect(() => {
    if (data && !transactionError && !transactionLoading) {
      console.log("waiting for trans data=", transactionData);
      fetchTokenId(publicClient, data.hash as any).then((x: any) => {
        setTokenId(x);
      });
    }
  }, [data, transactionLoading, transactionError, data, publicClient]);

  useEffect(() => {
    if (write) {
      write();
    }
  }, [write]);

  return <div></div>;
};

export default WriteOnchain;

export async function fetchTokenId(
  publicClient: PublicClient,
  transactionHash: `0x{ string }`,
): Promise<number | null> {
  const receipt = await publicClient.getTransactionReceipt({ hash: transactionHash });

  console.log("receipt=", receipt);

  // Check if there are logs and the logs are from the expected contract
  if (receipt && receipt.logs && receipt.logs.length > 0 && receipt.logs[0].topics[3]) {
    let num = 1;
    let token = parseInt(receipt.logs[0].topics[3], 16);

    console.log("token=", token);
    return token;
  }
  return null;
}
