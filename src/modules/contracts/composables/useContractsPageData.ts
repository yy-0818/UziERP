import { fetchContractsWithDetails } from '../api';

export async function queryContracts() {
  return fetchContractsWithDetails();
}
