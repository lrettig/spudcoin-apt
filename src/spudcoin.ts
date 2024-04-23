/* eslint-disable no-console */
/* eslint-disable max-len */

import { Account, AccountAddress, Aptos, AptosConfig, Network, NetworkToNetworkName } from "@aptos-labs/ts-sdk";
import { compilePackage, getPackageBytesToPublish } from "./utils";

/**
 * This example demonstrate how one can publish a new custom coin to chain.
 * It uses the SpudCoin.move module that can be found in this folder
 *
 * Before running this example, we should compile the package locally:
 * 1. Acquire the Aptos CLI, see https://aptos.dev/cli-tools/aptos-cli/use-cli/install-aptos-cli
 * 2. cd `~/aptos-ts-sdk/examples/typescript`
 * 3. Run `pnpm run your_coin`
 */

const COINS_TO_MINT = 1_000_000;
const DECIMALS = 9;

// Setup the client
const APTOS_NETWORK: Network = NetworkToNetworkName[process.env.APTOS_NETWORK] || Network.DEVNET;
const config = new AptosConfig({ network: APTOS_NETWORK });
const aptos = new Aptos(config);

/** Register the receiver account to receive transfers for the new coin. */
async function registerCoin(receiver: Account, coinTypeAddress: AccountAddress): Promise<string> {
  const transaction = await aptos.transaction.build.simple({
    sender: receiver.accountAddress,
    data: {
      function: "0x1::managed_coin::register",
      typeArguments: [`${coinTypeAddress}::spud_coin::SpudCoin`],
      functionArguments: [],
    },
  });

  const senderAuthenticator = aptos.transaction.sign({ signer: receiver, transaction });
  const pendingTxn = await aptos.transaction.submit.simple({ transaction, senderAuthenticator });

  return pendingTxn.hash;
}

/** Mints amount of the newly created coin to a specified receiver address */
async function mintCoin(minter: Account, receiverAddress: AccountAddress, amount: number): Promise<string> {
  const transaction = await aptos.transaction.build.simple({
    sender: minter.accountAddress,
    data: {
      function: "0x1::managed_coin::mint",
      typeArguments: [`${minter.accountAddress}::spud_coin::SpudCoin`],
      functionArguments: [receiverAddress, amount],
    },
  });

  const senderAuthenticator = aptos.transaction.sign({ signer: minter, transaction });
  const pendingTxn = await aptos.transaction.submit.simple({ transaction, senderAuthenticator });

  return pendingTxn.hash;
}

/** Returns the balance of the newly created coin for an account */
const getBalance = async (accountAddress: AccountAddress, coinTypeAddress: AccountAddress) => {
  const amount = await aptos.getAccountCoinAmount({
    accountAddress,
    coinType: `${coinTypeAddress.toString()}::spud_coin::SpudCoin`,
  });

  return amount;
};

async function main() {
  const alice = Account.generate();

  console.log("\n=== Addresses ===");
  console.log(`Alice: ${alice.accountAddress.toString()}`);

  // Fund alice account
  await aptos.fundAccount({ accountAddress: alice.accountAddress, amount: 100_000_000 * 10 ** DECIMALS });

  // Please ensure you have the aptos CLI installed
  console.log("\n=== Compiling SpudCoin package locally ===");
  compilePackage("move/spudCoin", "move/spudCoin/spudCoin.json", [{ name: "SpudCoin", address: alice.accountAddress }]);

  const { metadataBytes, byteCode } = getPackageBytesToPublish("move/spudCoin/spudCoin.json");

  console.log(`\n=== Publishing SpudCoin package to ${aptos.config.network} network ===`);

  // Publish SpudCoin package to chain
  const transaction = await aptos.publishPackageTransaction({
    account: alice.accountAddress,
    metadataBytes,
    moduleBytecode: byteCode,
  });

  const pendingTransaction = await aptos.signAndSubmitTransaction({
    signer: alice,
    transaction,
  });

  console.log(`Publish package transaction hash: ${pendingTransaction.hash}`);
  await aptos.waitForTransaction({ transactionHash: pendingTransaction.hash });

  console.log(`Alice's SpudCoin balance: ${await getBalance(alice.accountAddress, alice.accountAddress)}.`);

  console.log(`Alice mints herself ${COINS_TO_MINT} SpudCoin.`);
  const registerCoinTransactionHash = await registerCoin(alice, alice.accountAddress);
  await aptos.waitForTransaction({ transactionHash: registerCoinTransactionHash });

  const mintCoinTransactionHash = await mintCoin(alice, alice.accountAddress, COINS_TO_MINT * 10 ** DECIMALS);
  await aptos.waitForTransaction({ transactionHash: mintCoinTransactionHash });
  console.log(`Alice's updated SpudCoin balance: ${await getBalance(alice.accountAddress, alice.accountAddress)}.`);
}

main();
