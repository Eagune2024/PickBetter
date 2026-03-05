import browser from "webextension-polyfill";
import type { StorageSchema } from "../types/storage";
import { defaultStorage } from "../types/storage";

/**
 * 从本地存储获取指定键的值
 *
 * @param keys - 要获取的存储键数组
 * @returns 包含请求键值的对象
 */
export async function getStorage<K extends keyof StorageSchema>(
  keys: K[],
): Promise<Pick<StorageSchema, K>> {
  const result = await browser.storage.local.get(keys);

  const output = {} as Pick<StorageSchema, K>;
  for (const key of keys) {
    output[key] = (result[key] as StorageSchema[K]) ?? defaultStorage[key];
  }

  return output;
}

/**
 * 设置本地存储中的值
 *
 * @param items - 要设置的键值对
 */
export async function setStorage<K extends keyof StorageSchema>(
  items: Pick<StorageSchema, K>,
): Promise<void> {
  await browser.storage.local.set(items);
}

/**
 * 获取所有存储值
 *
 * @returns 完整的存储对象
 */
export async function getAllStorage(): Promise<StorageSchema> {
  const result = await browser.storage.local.get(null);

  return {
    ...defaultStorage,
    ...result,
  };
}

/**
 * 清除指定的存储键
 *
 * @param keys - 要清除的键数组
 */
export async function clearStorage(
  keys: keyof StorageSchema | (keyof StorageSchema)[],
): Promise<void> {
  const keysArray = Array.isArray(keys) ? keys : [keys];
  await browser.storage.local.remove(keysArray);
}
