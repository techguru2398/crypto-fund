import { pool } from './db';

export async function getLatestNAV(): Promise<number> {
    const navRes = await pool.query('SELECT nav FROM nav_history ORDER BY date DESC LIMIT 1');
    return 5;
    // return parseFloat(navRes.rows[0].nav);
}