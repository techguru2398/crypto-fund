import { FireblocksSDK, PeerType } from 'fireblocks-sdk';
import fs from 'fs';
import path from 'path';


// Read Fireblocks private key from file
const privateKeyPath = path.join(process.cwd(), process.env.FIREBLOCKS_SECRET_PATH!);
const fireblocksPrivateKey = fs.readFileSync(privateKeyPath, 'utf8');

const fireblocks = new FireblocksSDK(
  fireblocksPrivateKey,
  process.env.FIREBLOCKS_API_KEY!,
  'https://sandbox-api.fireblocks.io'
);

export async function transferToVault(asset: 'BTC' | 'LTC', amount: string) {
  return await fireblocks.createTransaction({
    assetId: asset,
    amount: parseFloat(amount).toFixed(8),
    source: { type: PeerType.EXCHANGE_ACCOUNT, id: 'Coinbase Prime' },
    destination: { type: PeerType.VAULT_ACCOUNT, id: process.env.VAULT_NAME },
    note: `Auto-transfer ${asset} from Coinbase Prime to vault ${process.env.VAULT_NAME}`,
  });
}
