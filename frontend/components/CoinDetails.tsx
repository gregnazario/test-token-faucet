import { useWallet } from "@aptos-labs/wallet-adapter-react";
// Internal components
import { LabelValueGrid, DisplayValue } from "@/components/LabelValueGrid";
import { useEffect, useState } from "react";
import { aptosClient } from "@/utils/aptosClient.ts";
import { MODULE_ADDRESS } from "@/constants.ts";
import { Button } from "@/components/ui/button.tsx";
import { LabeledInput } from "@/components/ui/labeled-input.tsx";

interface CoinDetails {
  name: string;
  symbol: string;
  decimals: number;
}

export function CoinDetails() {
  const { account, signAndSubmitTransaction } = useWallet();
  const [coinDetails, setCoinDetails] = useState<CoinDetails>();
  const [balance, setBalance] = useState<number>();
  const [isMigrated, setIsMigrated] = useState<boolean>(false);
  const [recipient, setRecipient] = useState<string>(account?.address ?? "");
  const [amount, setAmount] = useState<number>(1);

  useEffect(() => {
    fetchCoinBalance();
  }, [account]);

  function onRecipientChange(e: React.ChangeEvent<HTMLInputElement>) {
    setRecipient(e.target.value);
  }

  function onAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    setAmount(parseFloat(e.target.value));
  }

  function subunitsToFull(amount: number, decimals: number): number {
    return amount / (10 ** decimals);
  }

  function fullToSubunits(amount: number, decimals: number): number {
    return amount * (10 ** decimals);
  }

  async function fetchCoinDetails(): Promise<CoinDetails> {
    // Fetch Coin balance
    const [name, symbol, decimals] = await aptosClient().view<[string, string, number]>({
      payload: {
        function: `${MODULE_ADDRESS}::test_faucet::coin_details`,
        functionArguments: [],
      },
    });

    const details = { name, symbol, decimals };
    setCoinDetails(details);
    return details;
  }

  async function fetchCoinBalance() {
    let details = coinDetails;
    if (coinDetails === undefined) {
      details = await fetchCoinDetails();
    }

    // Fetch Coin balance
    const [bal] = await aptosClient().view<string[]>({
      payload: {
        function: `${MODULE_ADDRESS}::test_faucet::coin_balance`,
        functionArguments: [account?.address],
      },
    });

    // Convert coin balance to decimal
    const balNum = subunitsToFull(parseInt(bal, 10), details!.decimals);

    setBalance(balNum);

    // Fetch if coin is migrated
    const [bool] = await aptosClient().view<boolean[]>({
      payload: {
        function: `${MODULE_ADDRESS}::test_faucet::coin_is_migrated`,
        functionArguments: [account?.address],
      },
    });
    setIsMigrated(bool);
  }

  async function mintCoin() {
    // Send Coin
    const resp = await signAndSubmitTransaction({
      data: {
        function: `${MODULE_ADDRESS}::test_faucet::mint_coins_to_account`,
        functionArguments: [recipient, fullToSubunits(amount, coinDetails!.decimals)],
      },
    });
    await aptosClient().waitForTransaction({ transactionHash: resp.hash });
    await fetchCoinBalance();
  }


  async function burnCoin() {
    // Send Coin
    const resp = await signAndSubmitTransaction({
      data: {
        function: `${MODULE_ADDRESS}::test_faucet::burn_coins_from_account`,
        functionArguments: [recipient, fullToSubunits(amount, coinDetails!.decimals)],
      },
    });
    await aptosClient().waitForTransaction({ transactionHash: resp.hash });
    await fetchCoinBalance();
  }

  async function transferCoin() {
    // Send Coin
    const resp = await signAndSubmitTransaction({
      data: {
        function: `${MODULE_ADDRESS}::test_faucet::transfer_coins`,
        functionArguments: [recipient, fullToSubunits(amount, coinDetails!.decimals)],
      },
    });
    await aptosClient().waitForTransaction({ transactionHash: resp.hash });
    await fetchCoinBalance();
  }

  async function convertAccountToFA() {
    // Send Coin
    const resp = await signAndSubmitTransaction({
      data: {
        function: `${MODULE_ADDRESS}::test_faucet::migrate_coin_to_fungible_store`,
        functionArguments: [],
      },
    });
    await aptosClient().waitForTransaction({ transactionHash: resp.hash });
    await fetchCoinBalance();
  }

  return (
    <div className="flex flex-col gap-6">
      <h4 className="text-lg font-medium">{coinDetails?.name} Details</h4>
      <LabeledInput
        label="Recipient"
        required={true}
        id={"fa-recipient"}
        tooltip={"Receiver of FA actions"}
        type="text"
        value={recipient}
        onChange={onRecipientChange}
      />
      <LabeledInput
        label="Amount"
        required={true}
        id={"fa-amount"}
        tooltip={"Amount of FA to mint, burn, or transfer"}
        type="number"
        value={amount}
        onChange={onAmountChange}
      />
      <LabelValueGrid
        items={[
          {
            label: "Connected Wallet",
            value: <DisplayValue value={account?.address ?? "Not Present"} isCorrect={true} />,
          },
          {
            label: "Symbol",
            value: <DisplayValue value={coinDetails?.symbol ?? "Not Present"} isCorrect={true} />,
          },
          {
            label: "Decimals",
            value: <DisplayValue value={coinDetails?.decimals.toString(10) ?? "Not Present"} isCorrect={true} />,
          },
          {
            label: "Coin Balance",
            value: <DisplayValue value={balance?.toString(10) ?? "Not Present"} isCorrect={!!balance} />,
          },
          {
            label: "Wallet is Migrated from Coin To FA",
            value: <DisplayValue value={isMigrated.toString() ?? "Not Present"} isCorrect={isMigrated} />,
          },
        ]}
      />

      <Button onClick={mintCoin}>Mint {coinDetails?.symbol}</Button>
      <Button onClick={burnCoin}>Burn {coinDetails?.symbol}</Button>
      <Button onClick={transferCoin}>Transfer {coinDetails?.symbol}</Button>
      <Button disabled={isMigrated} onClick={convertAccountToFA}>Convert wallet to FA</Button>
    </div>
  );
}
