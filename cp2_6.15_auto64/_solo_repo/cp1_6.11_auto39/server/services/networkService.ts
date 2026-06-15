import { createId } from '@paralleldrive/cuid2';
import type { CausalNetwork, CausalNode, CausalEdge, NetworkListItem } from '../../src/client/types';
import * as fileRepo from '../repositories/fileRepository';

export async function listNetworks(): Promise<NetworkListItem[]> {
  const files = await fileRepo.listFiles();
  const networks: NetworkListItem[] = [];
  
  for (const file of files) {
    try {
      const filePath = fileRepo.getFilePath(file.replace('.json', ''));
      const content = await fileRepo.readFile(filePath);
      const network = JSON.parse(content) as CausalNetwork;
      networks.push({
        id: network.id,
        name: network.name,
        createdAt: network.createdAt,
        updatedAt: network.updatedAt,
      });
    } catch (e) {
      console.error(`Failed to read network file: ${file}`, e);
    }
  }
  
  return networks.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getNetwork(id: string): Promise<CausalNetwork | null> {
  try {
    const filePath = fileRepo.getFilePath(id);
    const content = await fileRepo.readFile(filePath);
    return JSON.parse(content) as CausalNetwork;
  } catch (e) {
    console.error(`Failed to get network: ${id}`, e);
    return null;
  }
}

export async function createNetwork(
  name: string,
  nodes: CausalNode[],
  edges: CausalEdge[]
): Promise<CausalNetwork> {
  const now = Date.now();
  const network: CausalNetwork = {
    id: createId(),
    name,
    createdAt: now,
    updatedAt: now,
    nodes,
    edges,
  };
  
  const filePath = fileRepo.getFilePath(network.id);
  await fileRepo.writeFile(filePath, JSON.stringify(network, null, 2));
  
  return network;
}

export async function updateNetwork(
  id: string,
  name: string,
  nodes: CausalNode[],
  edges: CausalEdge[]
): Promise<CausalNetwork | null> {
  const existing = await getNetwork(id);
  if (!existing) return null;
  
  const network: CausalNetwork = {
    ...existing,
    name,
    nodes,
    edges,
    updatedAt: Date.now(),
  };
  
  const filePath = fileRepo.getFilePath(id);
  await fileRepo.writeFile(filePath, JSON.stringify(network, null, 2));
  
  return network;
}

export async function deleteNetwork(id: string): Promise<boolean> {
  try {
    const filePath = fileRepo.getFilePath(id);
    await fileRepo.deleteFile(filePath);
    return true;
  } catch (e) {
    console.error(`Failed to delete network: ${id}`, e);
    return false;
  }
}
