import { useWallet } from "@aptos-labs/wallet-adapter-react";
// Internal Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { CoinDetails } from "@/components/CoinDetails.tsx";
import { FADetails } from "@/components/FADetails.tsx";
import { NETWORK } from "@/constants.ts";


function App() {
  const { connected, network } = useWallet();

  return (
    <>
      <Header />

      <div className="flex items-center justify-center flex-col">
        {!connected ? (
          <CardHeader>
            <CardTitle>To get started Connect a wallet</CardTitle>
          </CardHeader>
        ) : null}
        {connected && network?.name === NETWORK ? (
          <>
            <Card>
              <CardContent className="flex flex-col gap-10 pt-6">
                <CoinDetails />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col gap-10 pt-6">
                <FADetails />
              </CardContent>
            </Card>
          </>
        ) : null}
        {connected && network?.name !== NETWORK ? (
          <CardHeader>
            <CardTitle>Please switch your network to {NETWORK}</CardTitle>
          </CardHeader>
        ) : null}
      </div>
    </>
  );
}

export default App;
