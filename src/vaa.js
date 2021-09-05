import { Connection, PublicKey } from "@solana/web3.js";
import BufferLayout from "buffer-layout";

const BridgeProgramId = 'WormT3McKhFJ2RkiGpdw9GKvNCrB2aB54gb2uV9MfQC';
const connection = new Connection('https://api.mainnet-beta.solana.com')

const TransferOutProposalLayout = BufferLayout.struct([
  BufferLayout.blob(32, 'amount'),
  BufferLayout.u8('toChain'),
  BufferLayout.blob(32, 'sourceAddress'),
  BufferLayout.blob(32, 'targetAddress'),
  BufferLayout.blob(32, 'assetAddress'),
  BufferLayout.u8('assetChain'),
  BufferLayout.u8('assetDecimals'),
  BufferLayout.seq(BufferLayout.u8(), 1), // 4 byte alignment because a u32 is following
  BufferLayout.u32('nonce'),
  BufferLayout.blob(1001, 'vaa'),
  BufferLayout.seq(BufferLayout.u8(), 3), // 4 byte alignment because a u32 is following
  BufferLayout.u32('vaaTime'),
  BufferLayout.u32('lockupTime'),
  BufferLayout.u8('pokeCounter'),
  BufferLayout.blob(32, 'signatureAccount'),
  BufferLayout.u8('initialized'),
  BufferLayout.seq(BufferLayout.u8(), 2), // 2 byte alignment
]);

export async function getTransferOutProposal(account) {
  const data = await connection.getAccountInfo(account);
  try {
    const transferOutProposal = TransferOutProposalLayout.decode(data.data);
    return transferOutProposal;
  } catch {
    throw Error("Decode Transfer Out Proposal failed, bad format.")
  }
}

export async function getTransferKey(tx) {
  const txInfo = await connection.getTransaction(tx);

  if (txInfo && txInfo?.meta.err == null) {
    //validate TX
    const valid = txInfo.meta.logMessages.findIndex(log => log === `Program ${BridgeProgramId} success`) !== -1
    const transferKey = txInfo?.transaction?.message?.accountKeys[3] || null;
    if (!valid || !transferKey) {
      throw Error("invalid transaction, please verify the transaction's signature and try again. (make sure instruction 'Wormhole: Transfer Assets Out' exists)")
    }
    return transferKey;
  }
  throw Error("Unknown error when fetch transaction data, please make sure transaction exist")
}

export async function fetchVAA(transferOutProposal) {
  const signatureInfo = await connection.getAccountInfo(new PublicKey(transferOutProposal.signatureAccount), 'single');

  if (signatureInfo == null || signatureInfo.lamports == 0) {
    throw new Error('not found');
  } else {
    const dataLayout = BufferLayout.struct([
      BufferLayout.blob(20 * 65, 'signaturesRaw'),
    ]);
    let rawSignatureInfo = dataLayout.decode(signatureInfo?.data);

    let signatures = [];
    for (let i = 0; i < 20; i++) {
      let data = rawSignatureInfo.signaturesRaw.slice(65 * i, 65 * (i + 1));
      let empty = true;
      for (let v of data) {
        if (v != 0) {
          empty = false;
          break;
        }
      }
      if (empty) continue;

      signatures.push({
        signature: data,
        index: i,
      });
    }


    let sigData = Buffer.of(
      ...signatures.reduce((previousValue, currentValue) => {
        previousValue.push(currentValue.index);
        previousValue.push(...currentValue.signature);

        return previousValue;
      }, new Array()),
    );

    const vaa = Buffer.concat([
      transferOutProposal.vaa.slice(0, 5),
      Buffer.of(signatures.length),
      sigData,
      transferOutProposal.vaa.slice(6),
    ]);

    return vaa.slice(0,1005);
  }
}
