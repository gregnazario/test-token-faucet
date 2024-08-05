import { useWallet } from "@aptos-labs/wallet-adapter-react";
// Internal components
import { LabelValueGrid, DisplayValue } from "@/components/LabelValueGrid";
import { useEffect, useState } from "react";
import { aptosClient } from "@/utils/aptosClient.ts";
import { MODULE_ADDRESS } from "@/constants.ts";
import { Button } from "@/components/ui/button.tsx";
import { LabeledInput } from "@/components/ui/labeled-input.tsx";
import { Image } from "@/components/ui/image.tsx";

interface FADetails {
  name: string;
  symbol: string;
  decimals: number;
  icon_uri: string;
  project_uri: string;
}

export function FADetails() {
  const { account, signAndSubmitTransaction } = useWallet();
  const [faDetails, setFADetails] = useState<FADetails>();
  const [balance, setBalance] = useState<number>();
  const [recipient, setRecipient] = useState<string>(account?.address ?? "");
  const [amount, setAmount] = useState<number>(1);

  useEffect(() => {
    fetchFABalance();
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

  async function fetchFADetails(): Promise<FADetails> {
    // Fetch FA balance
    const [details] = await aptosClient().view<[FADetails]>({
      payload: {
        function: `${MODULE_ADDRESS}::test_faucet::fa_details`,
        functionArguments: [],
      },
    });


    setFADetails(details);
    return details;
  }

  async function fetchFABalance() {
    let details = faDetails;
    if (faDetails === undefined) {
      details = await fetchFADetails();
    }

    // Fetch FA balance
    const [bal] = await aptosClient().view<string[]>({
      payload: {
        function: `${MODULE_ADDRESS}::test_faucet::fa_balance`,
        functionArguments: [account?.address],
      },
    });

    // Convert coin balance to decimal
    const balNum = subunitsToFull(parseInt(bal, 10), details!.decimals);

    setBalance(balNum);
  }

  async function mintFA() {
    // Send FA
    const resp = await signAndSubmitTransaction({
      data: {
        function: `${MODULE_ADDRESS}::test_faucet::mint_fa_to_account`,
        functionArguments: [recipient, fullToSubunits(amount, faDetails!.decimals)],
      },
    });
    await aptosClient().waitForTransaction({ transactionHash: resp.hash });
    await fetchFABalance();
  }


  async function burnFA() {
    // Send FA
    const resp = await signAndSubmitTransaction({
      data: {
        function: `${MODULE_ADDRESS}::test_faucet::burn_fa_from_account`,
        functionArguments: [recipient, fullToSubunits(amount, faDetails!.decimals)],
      },
    });
    await aptosClient().waitForTransaction({ transactionHash: resp.hash });
    await fetchFABalance();
  }

  async function transferFA() {
    // Send FA
    const resp = await signAndSubmitTransaction({
      data: {
        function: `${MODULE_ADDRESS}::test_faucet::transfer_fa`,
        functionArguments: [recipient, fullToSubunits(amount, faDetails!.decimals)],
      },
    });
    await aptosClient().waitForTransaction({ transactionHash: resp.hash });
    await fetchFABalance();
  }

  return (
    <div className="flex flex-col gap-6">
      <h4 className="text-lg font-medium">{faDetails?.name} Details</h4>
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
            value: <DisplayValue value={faDetails?.symbol ?? "Not Present"} isCorrect={true} />,
          },
          {
            label: "Icon",
            value: <Image src={faDetails?.icon_uri ?? ""} width={50} />,
          },
          {
            label: "Project URI",
            value: <a href={faDetails?.project_uri ?? ""}>Link to Project</a>,
          },
          {
            label: "Decimals",
            value: <DisplayValue value={faDetails?.decimals.toString(10) ?? "Not Present"} isCorrect={true} />,
          },
          {
            label: "FA Balance",
            value: <DisplayValue value={balance?.toString(10) ?? "Not Present"} isCorrect={!!balance} />,
          },
        ]}
      />

      <Button onClick={mintFA}>Mint {faDetails?.symbol}</Button>
      <Button onClick={burnFA}>Burn {faDetails?.symbol}</Button>
      <Button onClick={transferFA}>Transfer {faDetails?.symbol}</Button>
    </div>
  );
}
