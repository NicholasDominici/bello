export type VaultProviderId = "native" | "onepassword";
export type LoginField = "username" | "password" | "totp";
export interface SecretRef {
  provider: VaultProviderId;
  itemId: string;
  field: LoginField;
  vaultId?: string;
}
export interface VaultProviderStatus {
  provider: VaultProviderId;
  configured: boolean;
  healthy: boolean;
  mode: "local-encrypted" | "service-account" | "desktop" | "unconfigured";
  message: string;
}
export interface SafeLoginItem {
  provider: VaultProviderId;
  itemId: string;
  vaultId?: string;
  vaultName?: string;
  label: string;
  allowedHosts: string[];
  fields: { username: boolean; password: boolean; totp: boolean };
  createdAt?: string;
  updatedAt?: string;
}
export interface VaultProvider {
  status(): Promise<VaultProviderStatus>;
  list(): Promise<SafeLoginItem[]>;
  resolve(ref: SecretRef): Promise<string>;
}
