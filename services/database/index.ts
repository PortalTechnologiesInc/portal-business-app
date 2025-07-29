import type { SQLiteDatabase } from 'expo-sqlite';
import type { ActivityType, UpcomingPayment } from '@/utils/types';
import type { Currency } from '@/utils/currency';
import uuid from 'react-native-uuid';

// Timestamp utilities
export const toUnixSeconds = (date: Date | number): number => {
  const ms = date instanceof Date ? date.getTime() : date;
  return Math.floor(ms / 1000);
};

export const fromUnixSeconds = (seconds: number | bigint): Date => {
  return new Date(Number(seconds) * 1000);
};

// Database record types (as stored in SQLite)
export interface ActivityRecord {
  id: string;
  type: 'auth' | 'pay' | 'ticket' | 'ticket_approved' | 'ticket_denied' | 'ticket_received';
  service_name: string;
  service_key: string;
  detail: string;
  date: number; // Unix timestamp in seconds
  amount: number | null;
  currency: string | null;
  request_id: string;
  created_at: number; // Unix timestamp in seconds
  subscription_id: string | null;
  status: 'neutral' | 'positive' | 'negative' | 'pending';
  invoice?: string | null; // Invoice for payment activities (optional)
}

export interface SubscriptionRecord {
  id: string;
  request_id: string;
  service_name: string;
  service_key: string;
  amount: number;
  currency: string;
  recurrence_calendar: string;
  recurrence_max_payments: number | null;
  recurrence_until: number | null; // Unix timestamp in seconds
  recurrence_first_payment_due: number; // Unix timestamp in seconds
  status: 'active' | 'cancelled' | 'expired';
  last_payment_date: number | null; // Unix timestamp in seconds
  next_payment_date: number | null; // Unix timestamp in seconds
  created_at: number; // Unix timestamp in seconds
}

export interface NostrRelay {
  ws_uri: string;
  created_at: number;
}

export interface NameCacheRecord {
  service_pubkey: string;
  service_name: string;
  expires_at: number; // Unix timestamp in seconds
  created_at: number; // Unix timestamp in seconds
}

export interface WorkflowRecord {
  id: string;
  name: string;
  data: string; // JSON string containing blocks, connections, and block_configs
  created_at: number; // Unix timestamp in seconds
  updated_at: number; // Unix timestamp in seconds
  is_active: number; // 0 or 1 for SQLite boolean
}

// Application layer types (with Date objects)
export interface ActivityWithDates extends Omit<ActivityRecord, 'date' | 'created_at'> {
  date: Date;
  created_at: Date;
}

export interface StoredPendingRequest {
  id: string;
  request_id: string;
  approved: boolean;
  created_at: Date;
}

export interface StoredPendingRequestWithDates extends Omit<StoredPendingRequest, 'created_at'> {
  created_at: Date;
}

export interface Tag {
  id: string;
  token: string;
  description: string | null;
  url: string;
  icon: string;
  created_at: number; // Unix timestamp in seconds
}

export interface Ticket {
  id: string;
  mint_url: string;
  unit: string;
  price: number;
  currency: string;
  created_at: number; // Unix timestamp in seconds
}

export interface SubscriptionWithDates
  extends Omit<
    SubscriptionRecord,
    | 'recurrence_until'
    | 'recurrence_first_payment_due'
    | 'last_payment_date'
    | 'next_payment_date'
    | 'created_at'
  > {
  recurrence_until: Date | null;
  recurrence_first_payment_due: Date;
  last_payment_date: Date | null;
  next_payment_date: Date | null;
  created_at: Date;
}

export interface NostrRelayWithDates extends Omit<NostrRelay, 'created_at'> {
  created_at: Date;
}

export interface WorkflowWithDates extends Omit<WorkflowRecord, 'created_at' | 'updated_at' | 'is_active' | 'data'> {
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
  data: WorkflowData;
}

export interface WorkflowData {
  blocks: any[];
  connections: any[];
  block_configs: any[];
}

export class DatabaseService {
  constructor(private db: SQLiteDatabase) {}

  // Database reset method
  async dropAllTables(): Promise<void> {
    try {
      console.log('Dropping all tables from database');
      // Drop existing tables
      await this.db.execAsync(`
        DROP TABLE IF EXISTS activities;
        DROP TABLE IF EXISTS subscriptions;
        DROP INDEX IF EXISTS idx_activities_date;
        DROP INDEX IF EXISTS idx_activities_type;
        DROP INDEX IF EXISTS idx_subscriptions_next_payment;
        PRAGMA user_version = 0;
      `);
      console.log('All database tables dropped successfully');
    } catch (error) {
      console.error('Failed to drop tables:', error);
      throw error;
    }
  }

  // Activity methods
  async addActivity(activity: Omit<ActivityWithDates, 'id' | 'created_at'>): Promise<string> {
    try {
      if (!this.db) {
        throw new Error('Database connection not available');
      }

      const id = uuid.v4();
      const now = toUnixSeconds(Date.now());

      try {
        await this.db.runAsync(
          `INSERT INTO activities (
            id, type, service_name, service_key, detail, date, amount, currency, request_id, created_at, subscription_id, status, invoice
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            activity.type,
            activity.service_name,
            activity.service_key,
            activity.detail,
            toUnixSeconds(activity.date),
            activity.amount,
            activity.currency,
            activity.request_id,
            now,
            activity.subscription_id,
            activity.status || 'neutral',
            activity.invoice || null,
          ]
        );

        console.log(`Activity ${id} of type ${activity.type} added successfully`);
        return id;
      } catch (dbError) {
        console.error('Database operation failed when adding activity:', dbError);
        throw dbError;
      }
    } catch (error) {
      console.error('Failed to add activity:', error);
      throw error;
    }
  }

  async getActivity(id: string): Promise<ActivityWithDates | null> {
    const record = await this.db.getFirstAsync<ActivityRecord>(
      'SELECT * FROM activities WHERE id = ?',
      [id]
    );

    if (!record) return null;

    return {
      ...record,
      date: fromUnixSeconds(record.date),
      created_at: fromUnixSeconds(record.created_at),
    };
  }

  async updateActivityStatus(
    id: string,
    status: 'neutral' | 'positive' | 'negative' | 'pending'
  ): Promise<void> {
    try {
      await this.db.runAsync('UPDATE activities SET status = ? WHERE id = ?', [status, id]);
    } catch (error) {
      console.error('Error updating activity status:', error);
      throw error;
    }
  }

  async getActivities(
    options: {
      type?: ActivityType;
      serviceKey?: string;
      limit?: number;
      offset?: number;
      fromDate?: Date | number;
      toDate?: Date | number;
    } = {}
  ): Promise<ActivityWithDates[]> {
    const conditions: string[] = [];
    const params: (string | number | null)[] = [];

    if (options.type !== undefined) {
      conditions.push('type = ?');
      params.push(options.type);
    }
    if (options.serviceKey) {
      conditions.push('service_key = ?');
      params.push(options.serviceKey);
    }
    if (options.fromDate) {
      conditions.push('date >= ?');
      params.push(toUnixSeconds(options.fromDate));
    }
    if (options.toDate) {
      conditions.push('date <= ?');
      params.push(toUnixSeconds(options.toDate));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limitClause = options.limit ? `LIMIT ${options.limit}` : '';
    const offsetClause = options.offset ? `OFFSET ${options.offset}` : '';

    const records = await this.db.getAllAsync<ActivityRecord>(
      `SELECT * FROM activities ${whereClause} ORDER BY date DESC ${limitClause} ${offsetClause}`,
      params
    );

    return records.map(record => ({
      ...record,
      date: fromUnixSeconds(record.date),
      created_at: fromUnixSeconds(record.created_at),
    }));
  }

  // Optimized method to get only the 5 most recent activities
  async getRecentActivities(limit = 5): Promise<ActivityWithDates[]> {
    const records = await this.db.getAllAsync<ActivityRecord>(
      `SELECT * FROM activities ORDER BY date DESC LIMIT ?`,
      [limit]
    );

    return records.map(record => ({
      ...record,
      date: fromUnixSeconds(record.date),
      created_at: fromUnixSeconds(record.created_at),
    }));
  }

  // Subscription methods
  async addSubscription(
    subscription: Omit<SubscriptionWithDates, 'id' | 'created_at'>
  ): Promise<string> {
    const id = uuid.v4();
    const now = toUnixSeconds(Date.now());

    await this.db.runAsync(
      `INSERT INTO subscriptions (
        id, request_id, service_name, service_key, amount, currency,
        recurrence_calendar, recurrence_max_payments, recurrence_until,
        recurrence_first_payment_due, status, last_payment_date,
        next_payment_date, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        subscription.request_id,
        subscription.service_name,
        subscription.service_key,
        subscription.amount,
        subscription.currency,
        subscription.recurrence_calendar,
        subscription.recurrence_max_payments,
        subscription.recurrence_until ? toUnixSeconds(subscription.recurrence_until) : null,
        toUnixSeconds(subscription.recurrence_first_payment_due),
        subscription.status,
        subscription.last_payment_date ? toUnixSeconds(subscription.last_payment_date) : null,
        subscription.next_payment_date ? toUnixSeconds(subscription.next_payment_date) : null,
        now,
      ]
    );

    return id;
  }

  async getSubscription(id: string): Promise<SubscriptionWithDates | null> {
    const record = await this.db.getFirstAsync<SubscriptionRecord>(
      'SELECT * FROM subscriptions WHERE id = ?',
      [id]
    );

    if (!record) return null;

    return {
      ...record,
      recurrence_until: record.recurrence_until ? fromUnixSeconds(record.recurrence_until) : null,
      recurrence_first_payment_due: fromUnixSeconds(record.recurrence_first_payment_due),
      last_payment_date: record.last_payment_date
        ? fromUnixSeconds(record.last_payment_date)
        : null,
      next_payment_date: record.next_payment_date
        ? fromUnixSeconds(record.next_payment_date)
        : null,
      created_at: fromUnixSeconds(record.created_at),
    };
  }

  async getSubscriptions(
    options: {
      serviceKey?: string;
      status?: SubscriptionRecord['status'];
      activeOnly?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<SubscriptionWithDates[]> {
    const conditions: string[] = [];
    const params: (string | number | null)[] = [];

    if (options.serviceKey) {
      conditions.push('service_key = ?');
      params.push(options.serviceKey);
    }
    if (options.status) {
      conditions.push('status = ?');
      params.push(options.status);
    } else if (options.activeOnly) {
      conditions.push('status = ?');
      params.push('active');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limitClause = options.limit ? `LIMIT ${options.limit}` : '';
    const offsetClause = options.offset ? `OFFSET ${options.offset}` : '';

    const records = await this.db.getAllAsync<SubscriptionRecord>(
      `SELECT * FROM subscriptions ${whereClause} ORDER BY next_payment_date ASC ${limitClause} ${offsetClause}`,
      params
    );

    return records.map(record => ({
      ...record,
      recurrence_until: record.recurrence_until ? fromUnixSeconds(record.recurrence_until) : null,
      recurrence_first_payment_due: fromUnixSeconds(record.recurrence_first_payment_due),
      last_payment_date: record.last_payment_date
        ? fromUnixSeconds(record.last_payment_date)
        : null,
      next_payment_date: record.next_payment_date
        ? fromUnixSeconds(record.next_payment_date)
        : null,
      created_at: fromUnixSeconds(record.created_at),
    }));
  }

  async updateSubscriptionStatus(
    id: string,
    status: SubscriptionRecord['status'],
    nextPaymentDate?: Date | number | null
  ): Promise<void> {
    const updates: string[] = ['status = ?'];
    const params: (string | number | null)[] = [status];

    if (nextPaymentDate !== undefined) {
      updates.push('next_payment_date = ?');
      params.push(nextPaymentDate ? toUnixSeconds(nextPaymentDate) : null);
    }

    params.push(id);

    await this.db.runAsync(`UPDATE subscriptions SET ${updates.join(', ')} WHERE id = ?`, params);
  }

  async updateSubscriptionLastPayment(id: string, lastPaymentDate: Date | number): Promise<void> {
    await this.db.runAsync(
      `UPDATE subscriptions
       SET last_payment_date = ?
       WHERE id = ?`,
      [toUnixSeconds(lastPaymentDate), id]
    );
  }

  // Helper method to get upcoming payments
  async getUpcomingPayments(limit = 5): Promise<UpcomingPayment[]> {
    const now = toUnixSeconds(Date.now());
    const subscriptions = await this.db.getAllAsync<SubscriptionRecord>(
      `SELECT * FROM subscriptions
       WHERE status = 'active'
       AND next_payment_date > ?
       ORDER BY next_payment_date ASC
       LIMIT ?`,
      [now, limit]
    );

    return subscriptions.map(sub => ({
      id: sub.id,
      serviceName: sub.service_name,
      amount: sub.amount,
      currency: sub.currency as Currency,
      dueDate: fromUnixSeconds(sub.next_payment_date ?? 0),
    }));
  }

  // Get payment activities for a specific subscription
  async getSubscriptionPayments(subscriptionId: string): Promise<ActivityWithDates[]> {
    const records = await this.db.getAllAsync<ActivityRecord>(
      `SELECT * FROM activities
       WHERE subscription_id = ?
       AND type = 'pay'
       ORDER BY date DESC`,
      [subscriptionId]
    );

    return records.map(record => ({
      ...record,
      date: fromUnixSeconds(record.date),
      created_at: fromUnixSeconds(record.created_at),
    }));
  }

  async updateRelays(relays: string[]): Promise<number> {
    this.db.withTransactionAsync(async () => {
      const placeholders = relays.map(() => '?').join(', ');
      await this.db.runAsync(
        `DELETE FROM nostr_relays
           WHERE ws_uri NOT IN (?)`,
        [placeholders]
      );
      for (const relay of relays) {
        await this.db.runAsync(
          `INSERT OR IGNORE INTO nostr_relays (
              ws_uri, created_at
            ) VALUES (?, ?)`,
          [relay, toUnixSeconds(Date.now())]
        );
      }
    });
    return 0;
  }

  /**
   * Get relays
   * @returns Promise that resolves with an object containing the ws uri and it's creation date
   */
  async getRelays(): Promise<NostrRelayWithDates[]> {
    const records = await this.db.getAllAsync<NostrRelay>(`SELECT * FROM nostr_relays`);

    return records.map(record => ({
      ...record,
      created_at: fromUnixSeconds(record.created_at),
    }));
  }

  // Name cache methods

  /**
   * Get a cached service name if it exists and hasn't expired (within 1 hour)
   * @param pubkey The public key to look up
   * @returns The cached service name or null if not found/expired
   */
  async getCachedServiceName(pubkey: string): Promise<string | null> {
    const now = toUnixSeconds(Date.now());

    const record = await this.db.getFirstAsync<NameCacheRecord>(
      'SELECT * FROM name_cache WHERE service_pubkey = ? AND expires_at > ?',
      [pubkey, now]
    );

    return record?.service_name || null;
  }

  /**
   * Store a service name in the cache with 1-hour expiration
   * @param pubkey The public key
   * @param serviceName The resolved service name
   */
  async setCachedServiceName(pubkey: string, serviceName: string): Promise<void> {
    const now = toUnixSeconds(Date.now());
    const expiresAt = now + 60 * 60; // 1 hour from now

    await this.db.runAsync(
      `INSERT OR REPLACE INTO name_cache (
        service_pubkey, service_name, expires_at, created_at
      ) VALUES (?, ?, ?, ?)`,
      [pubkey, serviceName, expiresAt, now]
    );
  }

  /**
   * Check if a cached entry exists (regardless of expiration)
   * @param pubkey The public key to check
   * @returns True if an entry exists, false otherwise
   */
  async hasCachedServiceName(pubkey: string): Promise<boolean> {
    const record = await this.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM name_cache WHERE service_pubkey = ?',
      [pubkey]
    );

    return (record?.count || 0) > 0;
  }

  /**
   * Clean up expired cache entries (optional maintenance method)
   */
  async cleanExpiredNameCache(): Promise<number> {
    const now = toUnixSeconds(Date.now());

    const result = await this.db.runAsync('DELETE FROM name_cache WHERE expires_at <= ?', [now]);

    return result.changes;
  }

  // Subscription methods
  async storePendingRequest(eventId: string, approved: boolean): Promise<string> {
    const id = uuid.v4();
    const now = toUnixSeconds(Date.now());

    try {
      await this.db.runAsync(
        `INSERT OR IGNORE INTO stored_pending_requests (
        id, event_id, approved, created_at
      ) VALUES (?, ?, ?, ?)`,
        [id, eventId, approved ? '1' : '0', now]
      );
    } catch (e) {}

    return id;
  }

  // Subscription methods
  async isPendingRequestStored(eventId: string): Promise<boolean> {
    const records = await this.db.getFirstAsync<StoredPendingRequest>(
      `SELECT * FROM stored_pending_requests
        WHERE event_id = ?`,
      [eventId]
    );
    return records ? true : false;
  }

  // Proof methods
  async getCashuProofs(
    mintUrl: string | undefined,
    unit: string | undefined,
    state: string | undefined,
    spendingCondition: string | undefined
  ): Promise<Array<string>> {
    try {
      let query = 'SELECT * FROM cashu_proofs WHERE 1=1';
      const params: any[] = [];

      if (mintUrl) {
        query += ' AND mint_url = ?';
        params.push(mintUrl);
      }
      if (unit) {
        query += ' AND unit = ?';
        params.push(unit);
      }
      if (state) {
        const states = JSON.parse(state);
        query += ' AND state IN (' + states.map(() => '?').join(',') + ')';
        params.push(...states);
      }
      if (spendingCondition) {
        query += ' AND spending_condition = ?';
        params.push(spendingCondition);
      }

      const proofs = await this.db.getAllAsync(query, params);

      return proofs.map((proof: any) =>
        JSON.stringify({
          proof: {
            amount: proof.amount,
            id: proof.keyset_id,
            secret: proof.secret,
            C: proof.c,
            dleq: proof.dleq_e ? { e: proof.dleq_e, s: proof.dleq_s, r: proof.dleq_r } : undefined,
          },
          y: proof.y,
          mint_url: proof.mint_url,
          state: proof.state,
          spending_condition: proof.spending_condition,
          unit: proof.unit,
        })
      );
    } catch (error) {
      console.error('[DatabaseService] Error getting proofs:', error);
      return [];
    }
  }

  async updateCashuProofs(added: Array<string>, removedYs: Array<string>): Promise<void> {
    try {
      // Remove proofs
      for (const y of removedYs) {
        await this.db.runAsync('DELETE FROM cashu_proofs WHERE y = ?', [y]);
      }

      // Add proofs (assuming added contains serialized proof data)
      for (const proofData of added) {
        const proof = JSON.parse(proofData);
        const dleq = proof.proof.dleq;
        await this.db.runAsync(
          `INSERT OR REPLACE INTO cashu_proofs 
           (y, mint_url, state, spending_condition, unit, amount, keyset_id, secret, c, witness, dleq_e, dleq_s, dleq_r) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            proof.y,
            proof.mint_url,
            proof.state,
            proof.spending_condition,
            proof.unit,
            proof.proof.amount,
            proof.proof.id,
            proof.proof.secret,
            proof.proof.C,
            proof.proof.witness || null,
            dleq?.e || null,
            dleq?.s || null,
            dleq?.r || null,
          ]
        );
      }
    } catch (error) {
      console.error('[DatabaseService] Error updating proofs:', error);
      throw error;
    }
  }

  async updateCashuProofsState(ys: Array<string>, state: string): Promise<void> {
    try {
      for (const y of ys) {
        await this.db.runAsync('UPDATE cashu_proofs SET state = ? WHERE y = ?', [
          state.replaceAll('"', ''),
          y,
        ]);
      }
    } catch (error) {
      console.error('[DatabaseService] Error updating proof states:', error);
      throw error;
    }
  }

  // Transaction methods
  async addCashuTransaction(transaction: string): Promise<void> {
    try {
      const txData = JSON.parse(transaction);
      const metadata = JSON.stringify(txData.metadata);
      const ys = JSON.stringify(txData.ys);
      await this.db.runAsync(
        'INSERT OR REPLACE INTO cashu_transactions (id, mint_url, direction, amount, fee, unit, ys, timestamp, memo, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          txData.id,
          txData.mint_url,
          txData.direction,
          txData.amount,
          txData.fee,
          txData.unit,
          ys,
          txData.timestamp,
          txData.memo,
          metadata,
        ]
      );
    } catch (error) {
      console.error('[DatabaseService] Error adding transaction:', error);
      throw error;
    }
  }

  async getCashuTransaction(transactionId: string): Promise<string | undefined> {
    try {
      const tx = await this.db.getFirstAsync<{
        id: string;
        mint_url: string;
        direction: string;
        amount: number;
        fee: number;
        unit: string;
        ys: string;
        timestamp: number;
        memo: string | null;
        metadata: string | null;
      }>('SELECT * FROM cashu_transactions WHERE id = ?', [transactionId]);

      return tx
        ? JSON.stringify({
            ...tx,
            ys: JSON.parse(tx.ys),
            metadata: tx.metadata ? JSON.parse(tx.metadata) : null,
          })
        : undefined;
    } catch (error) {
      console.error('[DatabaseService] Error getting transaction:', error);
      return undefined;
    }
  }

  async listCashuTransactions(
    mintUrl?: string,
    direction?: string,
    unit?: string
  ): Promise<Array<string>> {
    try {
      let query = 'SELECT * FROM cashu_transactions WHERE 1=1';
      const params: any[] = [];

      if (mintUrl) {
        query += ' AND mint_url = ?';
        params.push(mintUrl);
      }
      if (direction) {
        query += ' AND direction = ?';
        params.push(direction);
      }
      if (unit) {
        query += ' AND unit = ?';
        params.push(unit);
      }

      const transactions = await this.db.getAllAsync(query, params);
      return transactions.map(tx =>
        JSON.stringify({
          ...tx,
          ys: JSON.parse(tx.ys),
          metadata: tx.metadata ? JSON.parse(tx.metadata) : null,
        })
      );
    } catch (error) {
      console.error('[DatabaseService] Error listing transactions:', error);
      return [];
    }
  }

  async removeCashuTransaction(transactionId: string): Promise<void> {
    try {
      await this.db.runAsync('DELETE FROM cashu_transactions WHERE id = ?', [transactionId]);
    } catch (error) {
      console.error('[DatabaseService] Error removing transaction:', error);
      throw error;
    }
  }

  // Keyset methods
  async getCashuKeysetById(keysetId: string): Promise<string | undefined> {
    try {
      const keyset = await this.db.getFirstAsync<{ keyset: string }>(
        'SELECT keyset FROM cashu_mint_keysets WHERE keyset_id = ?',
        [keysetId]
      );
      return keyset ? keyset.keyset : undefined;
    } catch (error) {
      console.error('[DatabaseService] Error getting keyset by ID:', error);
      return undefined;
    }
  }

  async addCashuKeys(keyset: string): Promise<void> {
    try {
      const keysData = JSON.parse(keyset);
      await this.db.runAsync('INSERT OR REPLACE INTO cashu_keys (id, keys) VALUES (?, ?)', [
        keysData.id,
        JSON.stringify(keysData.keys),
      ]);
    } catch (error) {
      console.error('[DatabaseService] Error adding keys:', error);
      throw error;
    }
  }

  async getCashuKeys(id: string): Promise<string | undefined> {
    try {
      const keys = await this.db.getFirstAsync<{ keys: string }>(
        'SELECT keys FROM cashu_keys WHERE id = ?',
        [id]
      );
      return keys ? keys.keys : undefined;
    } catch (error) {
      console.error('[DatabaseService] Error getting keys:', error);
      return undefined;
    }
  }

  async removeCashuKeys(id: string): Promise<void> {
    try {
      await this.db.runAsync('DELETE FROM cashu_keys WHERE id = ?', [id]);
    } catch (error) {
      console.error('[DatabaseService] Error removing keys:', error);
      throw error;
    }
  }

  // Counter methods
  async incrementCashuKeysetCounter(keysetId: string, count: number): Promise<void> {
    try {
      await this.db.runAsync(
        'INSERT OR REPLACE INTO cashu_keyset_counters (keyset_id, counter) VALUES (?, COALESCE((SELECT counter FROM cashu_keyset_counters WHERE keyset_id = ?), 0) + ?)',
        [keysetId, keysetId, count]
      );
    } catch (error) {
      console.error('[DatabaseService] Error incrementing keyset counter:', error);
      throw error;
    }
  }

  async getCashuKeysetCounter(keysetId: string): Promise<number | undefined> {
    try {
      const result = await this.db.getFirstAsync<{ counter: number }>(
        'SELECT counter FROM cashu_keyset_counters WHERE keyset_id = ?',
        [keysetId]
      );
      return result?.counter;
    } catch (error) {
      console.error('[DatabaseService] Error getting keyset counter:', error);
      return undefined;
    }
  }

  // Mint methods
  async addCashuMint(mintUrl: string, mintInfo: string | undefined): Promise<void> {
    try {
      await this.db.runAsync(
        'INSERT OR REPLACE INTO cashu_mints (mint_url, mint_info) VALUES (?, ?)',
        [mintUrl, mintInfo || null]
      );
    } catch (error) {
      console.error('[DatabaseService] Error adding mint:', error);
      throw error;
    }
  }

  async removeCashuMint(mintUrl: string): Promise<void> {
    try {
      await this.db.runAsync('DELETE FROM cashu_mints WHERE mint_url = ?', [mintUrl]);
    } catch (error) {
      console.error('[DatabaseService] Error removing mint:', error);
      throw error;
    }
  }

  async getCashuMint(mintUrl: string): Promise<string | undefined> {
    try {
      const mint = await this.db.getFirstAsync<{ mint_info: string }>(
        'SELECT mint_info FROM cashu_mints WHERE mint_url = ?',
        [mintUrl]
      );
      return mint?.mint_info;
    } catch (error) {
      console.error('[DatabaseService] Error getting mint:', error);
      return undefined;
    }
  }

  async getCashuMints(): Promise<Array<string>> {
    try {
      const mints = await this.db.getAllAsync<{ mint_url: string }>(
        'SELECT mint_url FROM cashu_mints'
      );
      return mints.map(mint => mint.mint_url);
    } catch (error) {
      console.error('[DatabaseService] Error getting mints:', error);
      return [];
    }
  }

  async updateCashuMintUrl(oldMintUrl: string, newMintUrl: string): Promise<void> {
    try {
      await this.db.runAsync('UPDATE cashu_mints SET mint_url = ? WHERE mint_url = ?', [
        newMintUrl,
        oldMintUrl,
      ]);
    } catch (error) {
      console.error('[DatabaseService] Error updating mint URL:', error);
      throw error;
    }
  }

  async addCashuMintKeysets(mintUrl: string, keysets: Array<string>): Promise<void> {
    try {
      for (const keyset of keysets) {
        const parsed = JSON.parse(keyset);
        await this.db.runAsync(
          'INSERT OR REPLACE INTO cashu_mint_keysets (mint_url, keyset_id, keyset) VALUES (?, ?, ?)',
          [mintUrl, parsed.id, keyset]
        );
      }
    } catch (error) {
      console.error('[DatabaseService] Error adding mint keysets:', error);
      throw error;
    }
  }

  async getCashuMintKeysets(mintUrl: string): Promise<Array<string> | undefined> {
    try {
      const keysets = await this.db.getAllAsync<{ keyset: string }>(
        'SELECT keyset FROM cashu_mint_keysets WHERE mint_url = ?',
        [mintUrl]
      );
      return keysets.length > 0 ? keysets.map(ks => ks.keyset) : undefined;
    } catch (error) {
      console.error('[DatabaseService] Error getting mint keysets:', error);
      return undefined;
    }
  }

  async getMintUnitPairs(): Promise<[string, string][]> {
    try {
      const query = 'SELECT DISTINCT mint_url, unit FROM cashu_proofs';
      console.log('Database: Executing query:', query);
      const rows = await this.db.getAllAsync<{ mint_url: string; unit: string }>(query);
      console.log('Database: Found rows:', rows);
      const result: [string, string][] = rows.map(row => [row.mint_url, row.unit]);
      console.log('Database: Returning mint-unit pairs:', result);
      return result;
    } catch (error) {
      console.error('Database: Error getting mint-unit pairs:', error);
      return [];
    }
  }

  // Cashu token deduplication methods
  /**
   * Atomically marks the token as processed. Returns true if it was already processed, false if this is the first time.
   */
  async markCashuTokenAsProcessed(
    tokenHash: string,
    mintUrl: string,
    unit: string,
    amount: number
  ): Promise<boolean> {
    try {
      const now = toUnixSeconds(Date.now());
      const result = await this.db.runAsync(
        `INSERT OR IGNORE INTO processed_cashu_tokens (
          token_hash, mint_url, unit, amount, processed_at
        ) VALUES (?, ?, ?, ?, ?)`,
        [tokenHash, mintUrl, unit, amount, now]
      );
      // result.changes === 0 means it was already present
      return result.changes === 0;
    } catch (error) {
      console.error('Error marking Cashu token as processed:', error);
      // Don't throw - this is not critical for the app to function
      return false;
    }
  }

  // Payment status log methods
  async addPaymentStatusEntry(
    invoice: string,
    actionType: 'payment_started' | 'payment_completed' | 'payment_failed'
  ): Promise<number> {
    try {
      const now = toUnixSeconds(Date.now());
      const result = await this.db.runAsync(
        `INSERT INTO payment_status (
          invoice, action_type, created_at
        ) VALUES (?, ?, ?)`,
        [invoice, actionType, now]
      );
      return result.lastInsertRowId;
    } catch (error) {
      console.error('Error adding payment status entry:', error);
      throw error;
    }
  }

  async getPaymentStatusEntries(invoice: string): Promise<
    Array<{
      id: number;
      invoice: string;
      action_type: 'payment_started' | 'payment_completed' | 'payment_failed';
      created_at: Date;
    }>
  > {
    try {
      const records = await this.db.getAllAsync<{
        id: number;
        invoice: string;
        action_type: string;
        created_at: number;
      }>(`SELECT * FROM payment_status WHERE invoice = ? ORDER BY created_at ASC`, [invoice]);

      return records.map(record => ({
        ...record,
        action_type: record.action_type as
          | 'payment_started'
          | 'payment_completed'
          | 'payment_failed',
        created_at: fromUnixSeconds(record.created_at),
      }));
    } catch (error) {
      console.error('Error getting payment status entries:', error);
      return [];
    }
  }

  async getPendingPayments(): Promise<
    Array<{
      id: string;
      invoice: string;
      action_type: 'payment_started' | 'payment_completed' | 'payment_failed';
      created_at: Date;
    }>
  > {
    try {
      const records = await this.db.getAllAsync<ActivityRecord>(
        `SELECT * FROM activities 
         WHERE type = 'pay' AND status = 'pending'
         ORDER BY created_at ASC`
      );

      return records.map(record => ({
        id: record.id,
        invoice: record.request_id, // Assuming request_id contains the invoice
        action_type: 'payment_started' as const, // All pending payments are started
        created_at: fromUnixSeconds(record.created_at),
      }));
    } catch (error) {
      console.error('Error getting pending payments:', error);
      return [];
    }
  }

  async addTag(token: string, description: string | null, url: string, icon: string) {
    try {
      const now = toUnixSeconds(Date.now());
      const result = await this.db.runAsync(
        `INSERT INTO tags (
          token, description, url, icon, created_at
        ) VALUES (?, ?, ?, ?, ?)`,
        [token, description, url, icon, now]
      );
      return result.lastInsertRowId;
    } catch (error) {
      console.error('Error adding a new tag:', error);
      throw error;
    }
  }

  async deleteTag(token: string) {
    try {
      const result = await this.db.runAsync(`DELETE FROM tags WHERE token = ?`, [token]);
      return result.changes;
    } catch (error) {
      console.error('Error deleting tag:', error);
      throw error;
    }
  }

  async getTags(): Promise<Array<Tag>> {
    try {
      const records = await this.db.getAllAsync<Tag>(
        `SELECT * FROM tags 
         ORDER BY created_at DESC`
      );

      return records.map(record => ({
        id: record.id,
        token: record.token,
        description: record.description,
        url: record.url,
        icon: record.icon,
        created_at: record.created_at,
      }));
    } catch (error) {
      console.error('Error getting the tags:', error);
      return [];
    }
  }

  async addTicket(mintUrl: string, unit: string, price: number, currency: string): Promise<string> {
    try {
      const now = toUnixSeconds(Date.now());
      const result = await this.db.runAsync(
        `INSERT INTO tickets (
          mint_url, unit, price, currency, created_at
        ) VALUES (?, ?, ?, ?, ?)`,
        [mintUrl, unit, price, currency, now]
      );
      return result.lastInsertRowId?.toString() || '';
    } catch (error) {
      console.error('Error adding ticket:', error);
      throw error;
    }
  }

  async getTickets(): Promise<Array<Ticket>> {
    try {
      const records = await this.db.getAllAsync<Ticket>(
        `SELECT * FROM tickets 
         ORDER BY created_at DESC`
      );

      return records.map(record => ({
        id: record.id,
        mint_url: record.mint_url,
        unit: record.unit,
        price: record.price,
        currency: record.currency,
        created_at: record.created_at,
      }));
    } catch (error) {
      console.error('Error getting tickets:', error);
      return [];
    }
  }

  async deleteTicket(id: string): Promise<void> {
    try {
      await this.db.runAsync(`DELETE FROM tickets WHERE id = ?`, [id]);
    } catch (error) {
      console.error('Error deleting ticket:', error);
      throw error;
    }
  }

  // Workflow methods
  async addWorkflow(workflow: { name: string; data: WorkflowData; is_active: boolean }): Promise<string> {
    const id = uuid.v4() as string;
    const now = toUnixSeconds(new Date());

    await this.db.runAsync(
      `INSERT INTO workflows (
        id, name, data, created_at, updated_at, is_active
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        workflow.name,
        JSON.stringify(workflow.data),
        now,
        now,
        workflow.is_active ? 1 : 0,
      ]
    );

    return id;
  }

  async getWorkflow(id: string): Promise<WorkflowWithDates | null> {
    const result = await this.db.getFirstAsync<WorkflowRecord>(
      `SELECT * FROM workflows WHERE id = ?`,
      [id]
    );

    if (!result) return null;

    const data: WorkflowData = JSON.parse(result.data);

    return {
      id: result.id,
      name: result.name,
      data,
      created_at: fromUnixSeconds(result.created_at),
      updated_at: fromUnixSeconds(result.updated_at),
      is_active: result.is_active === 1,
    };
  }

  async getWorkflows(
    options: {
      activeOnly?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<WorkflowWithDates[]> {
    let query = `SELECT * FROM workflows`;
    const params: (string | number)[] = [];

    if (options.activeOnly) {
      query += ` WHERE is_active = 1`;
    }

    query += ` ORDER BY updated_at DESC`;

    if (options.limit) {
      query += ` LIMIT ?`;
      params.push(options.limit);
    }

    if (options.offset) {
      query += ` OFFSET ?`;
      params.push(options.offset);
    }

    const result = await this.db.getAllAsync<WorkflowRecord>(query, params);

    return result.map((row) => {
      const data: WorkflowData = JSON.parse(row.data);
      return {
        id: row.id,
        name: row.name,
        data,
        created_at: fromUnixSeconds(row.created_at),
        updated_at: fromUnixSeconds(row.updated_at),
        is_active: row.is_active === 1,
      };
    });
  }

  async updateWorkflow(
    id: string,
    updates: Partial<{ name: string; data: WorkflowData; is_active: boolean }>
  ): Promise<void> {
    const now = toUnixSeconds(new Date());
    const setClauses: string[] = [];
    const params: (string | number)[] = [];

    if (updates.name !== undefined) {
      setClauses.push('name = ?');
      params.push(updates.name);
    }

    if (updates.data !== undefined) {
      setClauses.push('data = ?');
      params.push(JSON.stringify(updates.data));
    }

    if (updates.is_active !== undefined) {
      setClauses.push('is_active = ?');
      params.push(updates.is_active ? 1 : 0);
    }

    setClauses.push('updated_at = ?');
    params.push(now);

    params.push(id);

    await this.db.runAsync(
      `UPDATE workflows SET ${setClauses.join(', ')} WHERE id = ?`,
      params
    );
  }

  async deleteWorkflow(id: string): Promise<void> {
    await this.db.runAsync(`DELETE FROM workflows WHERE id = ?`, [id]);
  }

  async toggleWorkflowActive(id: string): Promise<void> {
    await this.db.runAsync(
      `UPDATE workflows SET is_active = NOT is_active, updated_at = ? WHERE id = ?`,
      [toUnixSeconds(new Date()), id]
    );
  }
}
