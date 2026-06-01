import os from "os";

export function getHomeDir(): string {
  return os.homedir();
}
