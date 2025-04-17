import axios from 'axios';
import { COINGECKO_MAP } from './fund';

export async function getPriceUSD(assetId: string): Promise<number> {
    const tokenId = COINGECKO_MAP[assetId];
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd`;
    const res = await axios.get(url);
    return res.data[tokenId].usd;
}