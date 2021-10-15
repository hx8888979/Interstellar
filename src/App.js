import { useState } from "react";
import logo from './logo.svg';
import './App.css';
import { BigNumber, ethers } from "ethers";
import { getTransferOutProposal, getTransferKey, fetchVAA } from "./vaa";
import { formatUnits } from "ethers/lib/utils";
import _ from 'lodash/string';
import contract from './contract.json'
import { Button, Modal } from "react-bootstrap";

let logArray = [];

function App({ web3Modal }) {
  const [metamaskConnection, setMetamaskConnection] = useState();
  const [tx, setTx] = useState();
  const [logs, setLogs] = useState({ data: logArray });
  const [showPop, setShowPop] = useState(false);

  const onConnect = async () => {
    const provider = await web3Modal.connect();
    const web3Provider = new ethers.providers.Web3Provider(provider);
    const signer = web3Provider.getSigner();
    const network = await web3Provider.getNetwork();
    const address = await signer.getAddress();

    const wormhole = new ethers.Contract('0xf92cD566Ea4864356C5491c177A430C222d7e678', contract.abi, signer);

    setMetamaskConnection({
      provider: web3Provider,
      signer,
      address,
      wormhole,
      currentWallet: network.chainId === 1 ? `${address} connected` : 'Please connect to Ethereum'
    });
  };

  const pushLog = (log, clear = false) => {
    const newLog = [(new Date()).toLocaleString(), log];
    if (!!clear) logArray = [];
    logArray.push(newLog)
    setLogs({ data: logArray });
  }

  const onSubmit = async () => {
    pushLog(`Analyzing transaction "${tx}"`, true);
    try {
      const transferKey = await getTransferKey(tx);
      pushLog('Fetch transaction info successfully');
      const transferOutProposal = await getTransferOutProposal(transferKey);
      pushLog(`Transfer Amount: ${formatUnits(BigNumber.from([...transferOutProposal.amount].reverse()), transferOutProposal.assetDecimals)}`);
      if (transferOutProposal.toChain === 2) {
        pushLog('Target Network: Ethereum');
      } else {
        pushLog(`Target Network: Unknown(id:${transferOutProposal.toChain})`);
        pushLog("The target network doesn't support yet, please submit a issue");
        return;
      }
      const targetAddress = `0x${transferOutProposal.targetAddress.toString('hex').substring(24,64)}`.toUpperCase();
      pushLog(`Target Address: ${targetAddress}`);
      const matchAddress = targetAddress === metamaskConnection.address.toUpperCase();
      if (!matchAddress) {
        pushLog("The target address doesn't match connected wallet, abort");
        return;
      }

      const vaa = await fetchVAA(transferOutProposal);
      pushLog("Extract VAA: \n" + vaa.toString('hex'));
      pushLog("Creating TX to mint asset");
      setShowPop(true);
      const transaction = await metamaskConnection.wormhole.submitVAA(vaa, { gasLimit: 250000 });
      pushLog("Waiting TX to be mint");
      await transaction.wait();

      pushLog("All Set!");
      pushLog("if my application helps you saves the trouble😊, and you would like to buy me a coffee☕\n here's the link: \n Solona: GzVJprEByS5AEkUgzfikQT952D5RCZadeT8tqbUu84YG \n Ethereum: 0xE9668a7601aAbf5ceC8EB8f5F9001A9f97F1c949");

    } catch (e) {
      pushLog('Error: ' + e.message);
      pushLog("Progress exit early with error!");
    }
  }

  return (
    <div className="container-fluid">
      <nav className="navbar navbar-dark bg-dark">
        <div className="container-fluid">
          <a className="navbar-brand" href="#">
            <img src={logo} alt="" width="30" height="24"
                 className="d-inline-block align-text-top"/>
            Interstellar
          </a>
          <div>
            <a href="https://github.com/hx8888979/Interstellar" style={{fill: 'white'}}>
              <svg className="octicon octicon-mark-github v-align-middle" height="32" viewBox="0 0 16 16" version="1.1"
                   width="32" aria-hidden="true">
                <path fill-rule="evenodd"
                      d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z">
                </path>
              </svg>
            </a>
          </div>
        </div>
      </nav>
      <div className="d-flex justify-content-center row">
        <div className="card col-10 mt-3">
          <div className="card-body">
            <h4 className="card-title">Solana Wormhole VAA restorer</h4>
            <p className="card-text">when you trying to send cryptos through Wormhole from Solana to Ethereum, but
              accidentally rejected the signature request on metamask. you may struck your money in the
              Wormhole.<br/><br/>
              <strong>Interstellar</strong> is a <strong>open source</strong> script to help you to
              restore <strong>VAA</strong>(signatures on Solana) and re-create a right request on metamask and you will
              get you money back!<br/>
              enjoys.<br/><br/>
              If my application helps you saves the trouble😊, and you would like to buy me a coffee☕<br/> here's the
              address: <br/> <strong>Solana:</strong> GzVJprEByS5AEkUgzfikQT952D5RCZadeT8tqbUu84YG<br/>
              <strong>Ethereum:</strong> 0xE9668a7601aAbf5ceC8EB8f5F9001A9f97F1c949
            </p>
            <div className="fw-light fst-italic">* Use at your own risks</div>
          </div>
        </div>
        <div className="col-10 mt-3">
          <button className="btn btn-primary me-3" onClick={onConnect}>Connect Metamask</button>
          <span>{!!metamaskConnection?.currentWallet ? metamaskConnection?.currentWallet : 'Please Connect your wallet first'}</span>
        </div>

        <div className="card col-10 mt-3">
          <div className="card-body">
            <label htmlFor="basic-url" className="form-label">Your TX URL</label>
            <div className="input-group mb-3">
              <span className="input-group-text" id="basic-addon3">https://explorer.solana.com/tx/</span>
              <input type="text" className="form-control" disabled={!metamaskConnection} value={tx}
                     onChange={(e) => setTx(e.target.value.replace('https://explorer.solana.com/tx/', ''))}/>
              <button className="btn btn-primary" disabled={!metamaskConnection || !tx} onClick={onSubmit}>Submit
              </button>
            </div>
          </div>
          <div className="ms-3"><strong>work logs</strong></div>
          <div className="border-bottom mt-1"></div>
          <div className="card-text mb-3">{logs.data.map(([timestamp, log]) => <div key={timestamp}>
            <strong>{timestamp}</strong> - {log}</div>)}</div>
        </div>
      </div>
      <Modal show={showPop} onHide={() => setShowPop(false)} backdrop="static" keyboard={false}>
        <Modal.Body>
          <strong>Congratulation! You are all set!🎉🎉🎉</strong><br/><br/>
          If my application helps you saves the trouble😊, and you would like to buy me a coffee☕<br/>
          <br/>here's the address: <br/>
          <strong>Solana:</strong> GzVJprEByS5AEkUgzfikQT952D5RCZadeT8tqbUu84YG<br/>
          <strong>Ethereum:</strong> 0xE9668a7601aAbf5ceC8EB8f5F9001A9f97F1c949
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowPop(false)}>
            Thanks!
          </Button>
        </Modal.Footer>
      </Modal>

    </div>
  );
}

export default App;
