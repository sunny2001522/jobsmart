import "server-only";

import { dispatch } from "./repository";

export async function serverData<T>(action: string, args: unknown[] = []): Promise<T> {
  return await dispatch(action, args) as T;
}
