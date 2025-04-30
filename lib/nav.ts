import { pool } from './db';

export async function getLatestNAV(fund_id: string): Promise<number> {
    const navRes = await pool.query('SELECT nav FROM nav_history WHERE fund_id=$1 ORDER BY date DESC LIMIT 1', [fund_id]);
    // return 5;
    return parseFloat(navRes.rows[0].nav);
}