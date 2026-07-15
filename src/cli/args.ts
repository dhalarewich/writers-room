export interface Parsed {
  positional: string[];
  flags: Record<string, string | boolean>;
}

/** Tiny flag parser: --key value, --key=value, bare --key (boolean). */
export function parseFlags(args: string[]): Parsed {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }
    const eq = arg.indexOf('=');
    if (eq !== -1) {
      flags[arg.slice(2, eq)] = arg.slice(eq + 1);
    } else if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
      flags[arg.slice(2)] = args[++i];
    } else {
      flags[arg.slice(2)] = true;
    }
  }
  return { positional, flags };
}

export function flagString(flags: Parsed['flags'], key: string): string | undefined {
  const value = flags[key];
  return typeof value === 'string' ? value : undefined;
}
