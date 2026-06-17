import { cleanverseRequest, CLEANVERSE_API_ID } from './crypto';

// ── A-Pass ──────────────────────────────────────────────

export interface WalletInfo {
  address: string;
  chain: string;
}

export interface GenerateAPassRequest {
  customerId: string;
  kycSource?: string;
  kycId?: string;
  subTier: number;
  subGroup: string;
  override?: boolean;
  expirationTime: number;
  wallet: WalletInfo;
  identityDataList: Array<{
    idType: string;
    fullName: string;
    idNumber: string;
    validUntil: string;
    issuingCountryISO2: string;
  }>;
  bankAccountList?: Array<{
    bankCountry: string;
    bankName: string;
    bankAccount: string;
    bankAccountType: string;
    balance: number;
    currency: string;
  }>;
}

export async function generateAPass(req: GenerateAPassRequest) {
  return cleanverseRequest('/generate_apass', req as any, true);
}

export async function queryAPass(chain: string, address: string) {
  return cleanverseRequest('/query_apass', { chain, address });
}

export async function verifyAPass(atoken: string, chain: string, address: string) {
  return cleanverseRequest('/verify_apass', { atoken, chain, address });
}

export async function updateAPassStatus(
  customerId: string,
  status: '1' | '2',
  chain: string,
  address: string,
  blacklistReason?: string
) {
  return cleanverseRequest(
    '/update_status',
    { customerId, status, wallet: { chain, address }, blacklistReason },
    true
  );
}

// ── A-Token ─────────────────────────────────────────────

export interface ComplianceRule {
  allowed_group: string;
  allowed_sub_group: string;
  min_tier: number;
  min_sub_tier: number;
}

export async function launchAToken(params: {
  chain: string;
  token_name: string;
  token_symbol: string;
  decimals: number;
  admin_address: string;
  rule: ComplianceRule;
  icon?: string;
}) {
  return cleanverseRequest('/atoken/launch', params as any, true);
}

export async function launchWrappedAToken(params: {
  chain: string;
  token_name: string;
  token_symbol: string;
  decimals: number;
  admin_address: string;
  rule: ComplianceRule;
  origin_token_address: string;
  origin_token_icon?: string;
  icon?: string;
}) {
  return cleanverseRequest('/atoken/launch_wrapped_atoken', params as any, true);
}

export async function queryATokenStatus(requestId: string) {
  const res = await fetch(
    `https://uatapi.cleanverse.com/api/cooperate/atoken/query_apply_status/${requestId}`,
    {
      headers: { 'api-id': CLEANVERSE_API_ID },
    }
  );
  return res.json();
}

export async function queryATokenRules(chain: string, atokenAddress: string) {
  return cleanverseRequest('/atoken/rules', { chain, atokenAddress });
}

export async function setATokenPaused(chain: string, atokenAddress: string, paused: boolean) {
  return cleanverseRequest('/atoken/set_paused', { chain, atokenAddress, paused }, true);
}

export async function queryDepositATokenList(chain: string) {
  return cleanverseRequest('/query_deposit_atoken_list', { chain });
}

export async function queryDepositAddress(chain: string, address: string) {
  return cleanverseRequest('/query_deposit_address', { chain, address });
}

// ── Validator / CCP Protocol ────────────────────────────

export async function verifyPool(chain: string, poolAddress: string, userAddress: string) {
  return cleanverseRequest('/validator/verify', { chain, poolAddress, address: userAddress });
}

export async function queryPoolRules(chain: string, poolAddress: string) {
  return cleanverseRequest('/validator/rules', { chain, poolAddress });
}

export async function isPoolRegistered(chain: string, poolAddress: string) {
  return cleanverseRequest('/validator/is_register', { chain, poolAddress });
}

// ── Common ──────────────────────────────────────────────

export async function requestFaucet(chain: string, symbol: string, depositAddress: string, amount: string) {
  return cleanverseRequest('/faucet', { chain, symbol, depositAddress, amount });
}

export async function queryTransactions(chain: string, address: string, params?: Record<string, unknown>) {
  return cleanverseRequest('/query_txs', { chain, address, ...params });
}

export async function downloadTravelRule(txHash: string) {
  return cleanverseRequest('/download_travel_rule', { txHash });
}

export async function queryInstitutionWhitelist(chain: string) {
  return cleanverseRequest('/query_institution_whitelist', { chain });
}