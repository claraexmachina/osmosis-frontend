import { isAddress, toHex } from "web3-utils";

import { Erc20Abi } from "../queries";
import { SendFn } from "../types";

/**
 * ERC20 Transfer
 * @param sendFn Function to carry out RPC call.
 * @param amount Bignumber amount. Will be converted to hex.
 * @param erc20Address Hex contract address.
 * @param toAddress User destination address.
 * @returns Result of send function.
 */
export async function transfer(
  sendFn: SendFn,
  amount: string,
  erc20Address: string,
  fromAddress: string,
  toAddress: string
): Promise<unknown> {
  if (
    isAddress(fromAddress) &&
    isAddress(erc20Address) &&
    isAddress(toAddress)
  ) {
    return sendFn({
      method: "eth_sendTransaction",
      params: erc20TransferParams(fromAddress, toAddress, amount, erc20Address),
    });
  }

  return Promise.reject("Invalid address");
}

export function erc20TransferParams(
  fromAddress: string,
  toAddress: string,
  amount: string,
  erc20Address: string
): unknown[] {
  return [
    {
      from: fromAddress,
      to: erc20Address,
      data: Erc20Abi.encodeFunctionData("transfer", [toAddress, toHex(amount)]),
    },
    "latest",
  ];
}
