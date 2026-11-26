import type { IConfiguration } from "./index.js";

// Drops the keys whose value is undefined, so they do not override another source when spread
//
function withoutUndefined<TSection extends object>(
  section: TSection = {} as TSection,
): Partial<TSection> {
  return Object.fromEntries(
    Object.entries(section).filter(([, value]) => value !== undefined),
  ) as Partial<TSection>;
}

// Merges the configuration file with the command-line options, per section.
// A command-line option overrides the file value only when it was given
//
export function mergeConfigurations(
  fileConfiguration: Partial<IConfiguration>,
  cliConfiguration: IConfiguration,
): IConfiguration {
  return {
    ...fileConfiguration,
    pg: {
      ...fileConfiguration.pg,
      ...withoutUndefined(cliConfiguration.pg),
    } as IConfiguration["pg"],
    input: { ...fileConfiguration.input, ...withoutUndefined(cliConfiguration.input) },
    output: { ...fileConfiguration.output, ...withoutUndefined(cliConfiguration.output) },
  };
}

//
