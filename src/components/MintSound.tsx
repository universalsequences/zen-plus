import React, { useEffect, useCallback, useRef, useState } from "react";
import { contracts } from "@/lib/onchain/contracts";
import { usePublicClient, useWaitForTransaction } from "wagmi";
import { parseEther } from "viem";
import { abi } from "@/lib/abi/sound-drop-abi";

import { useContractWrite, usePrepareContractWrite, useAccount } from "wagmi";

const MintSound: React.FC<{
  fps: number;
  chainId: number;
  screenshot: string;
  numEditions: number;
  price: bigint;
  name: string;
  description: string;
  visuals: string;
  setDropAddress: (x: string | null) => void;
  dsp: string;
  parameterNames: string[];
  minValues: number[];
  maxValues: number[];
}> = ({
  dsp,
  setDropAddress,
  parameterNames,
  minValues,
  maxValues,
  visuals,
  name,
  description,
  numEditions,
  price,
  screenshot,
  chainId,
  fps,
}) => {
  let account = useAccount();
  const publicClient = usePublicClient();

  console.log(visuals);
  console.log("MINTING WITH FPS=", fps);

  let args = [
    {
      name,
      description,
      collectionImage: screenshot,
      dsp,
      visuals,
      parameterNames,
      minValues,
      maxValues,
      inputs: [],
      outputs: ["left", "right"],
      fps,
    },
    BigInt(price),
    BigInt(numEditions),
  ];

  console.log("args = ", args);

  const keys = Object.keys(contracts[chainId]).map((x) => parseInt(x));
  const contract = contracts[chainId][Math.max(...keys)].DropCreator;
  console.log("contract deploy", contract);
  console.log("args=", args);

  const { config } = usePrepareContractWrite({
    address: contract,
    abi: abi,
    functionName: "newDrop",
    args,
  });

  const written = useRef(false);
  const { write, data } = useContractWrite(config);
  const {
    data: transactionData,
    isError: transactionError,
    isLoading: transactionLoading,
  } = useWaitForTransaction({
    hash: data ? data.hash : undefined,
    confirmations: 1,
  });

  useEffect(() => {
    if (data && !transactionError && !transactionLoading) {
      console.log("waiting for trans data=", transactionData);
      fetchNewDrop(publicClient, data.hash).then((x: any) => {
        setDropAddress(x);
      });
    }
  }, [data, transactionLoading, transactionError, data, publicClient]);

  useEffect(() => {
    if (write && !written.current) {
      write();
      written.current = true;
    }
  }, [write]);

  return <div></div>;
};

export default MintSound;

export async function fetchNewDrop(provider: any, transactionHash: string): Promise<string | null> {
  const receipt = await provider.getTransactionReceipt({ hash: transactionHash });

  // Check if there are logs and the logs are from the expected contract
  if (receipt && receipt.logs && receipt.logs.length > 0) {
    return receipt.logs[0].address;
  }
  return null;
}
