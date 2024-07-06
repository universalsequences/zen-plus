// pages/api/get-html/[tokenId].ts

import { abi } from "@/lib/abi/metadata-abi";
import { contracts } from "@/lib/onchain/contracts";
import type { NextApiRequest, NextApiResponse } from "next";
import Web3 from "web3";

const Cors = require("cors");

// Define your metadata ABI and other ABIs

// Set your contract addresses and Web3 provider
// Cache for storing fetched HTML content

// Import the cors library
// Initialize the cors middleware
const cors = Cors({
  methods: ["GET", "HEAD", "POST"], // Set the methods you want to allow
  origin: "*", // Replace with the specific hostname you want to allow
});

// Helper method to initialize and use CORS in your API route
function runMiddleware(req: any, res: any, fn: any) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

async function getHTML(
  contractAddress: string,
  tokenId: string,
  chainId: number,
  version: number,
): Promise<string | null> {
  const web3 =
    chainId === 5
      ? new Web3(
          new Web3.providers.HttpProvider(
            `https://goerli.infura.io/v3/${process.env.INFURA_ID}`,
          ),
        )
      : chainId === 999999999
        ? new Web3(
            new Web3.providers.HttpProvider(
              "https://999999999.rpc.thirdweb.com",
            ),
          )
        : chainId === 999
          ? new Web3(
              new Web3.providers.HttpProvider(
                "https://testnet.rpc.zora.energy/",
              ),
            )
          : new Web3(
              new Web3.providers.HttpProvider("https://rpc.zora.energy/"),
            );

  const contract = new web3.eth.Contract(
    abi as any,
    contracts[chainId][version].MetadataRenderer,
  );
  try {
    const tokenURI: string = (await contract.methods
      .onchainTokenURI(contractAddress, tokenId)
      .call()) as string;
    // Check if tokenURI is base64 encoded, if not, assume it's a URL
    let metadataJSON;
    if (tokenURI.startsWith("data:application/json;base64,")) {
      metadataJSON = JSON.parse(
        Buffer.from(
          tokenURI.replace("data:application/json;base64,", ""),
          "base64",
        ).toString(),
      );
    }

    // Extract the 'animation_url' field and decode it
    const base64HTML = metadataJSON.animation_url;
    const decodedHTML = Buffer.from(
      base64HTML.replace("data:text/html;base64,", ""),
      "base64",
    ).toString();

    return decodedHTML;
  } catch (err) {
    return null;
  }
}

function extractParametersToObject(inputString: string) {
  // Regular expression to find the function declaration and its parameters
  const functionDeclRegex = /function\s+module_0\s*\(([^)]+)\)/;
  // Regular expression to find the function call and its values
  const functionCallRegex = /module_0\s*\(\s*(-?\d+\s*(?:,\s*-?\d+\s*)*)\)/;

  // Extracting the matching groups
  const functionDeclMatch = inputString.match(functionDeclRegex);
  const functionCallMatch = inputString.match(functionCallRegex);

  if (!functionDeclMatch || !functionCallMatch) {
    return {};
  }

  // Splitting the parameters and values by commas
  const paramNames = functionDeclMatch[1].split(",").map((name) => name.trim());
  const paramValues = functionCallMatch[0]
    .replace(")", "")
    .replace("module_0(", "")
    .split(",")
    .slice(0)
    .map((value) => value.trim());

  // Constructing the object
  const result: any = {};
  paramNames.forEach((name, index) => {
    result[name] = parseFloat(paramValues[index]);
  });

  return result;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  await runMiddleware(req, res, cors);

  const { version, contractAddress, tokenId, chainId } = req.query;

  let _chainId = 5;
  if (typeof chainId === "string") {
    _chainId = parseInt(chainId);
  } else if (typeof chainId === "number") {
    _chainId = chainId;
  }

  let _version = 1;
  if (typeof version === "string") {
    _version = parseInt(version);
  } else if (typeof version === "number") {
    _version = version;
  }

  if (typeof tokenId !== "string" || typeof contractAddress !== "string") {
    res.status(400).send("Token ID must be a string");
    return;
  }

  try {
    let html = await getHTML(contractAddress, tokenId, _chainId, _version);

    if (html) {
      let extracted = extractParametersToObject(html);
      res.json(extracted);
    } else {
      res.status(404).send("HTML content not found");
    }
  } catch (err) {
    res.status(500).send("An error occurred while fetching the HTML content.");
  }
}
