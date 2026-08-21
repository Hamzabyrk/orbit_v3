export type DeploymentEnvironment = "development" | "preview" | "production";

const knownEnvironments = new Set<DeploymentEnvironment>([
  "development",
  "preview",
  "production",
]);

export function resolveDeploymentEnvironment(
  value: string | undefined,
  viteDevelopment: boolean
): DeploymentEnvironment {
  if (value && knownEnvironments.has(value as DeploymentEnvironment)) {
    return value as DeploymentEnvironment;
  }

  return viteDevelopment ? "development" : "production";
}

const buildEnvironment =
  typeof __ORBIT_DEPLOYMENT_ENV__ === "string"
    ? __ORBIT_DEPLOYMENT_ENV__
    : undefined;

export const deploymentEnvironment = resolveDeploymentEnvironment(
  buildEnvironment,
  import.meta.env.DEV
);

export const isDemoMode = deploymentEnvironment !== "production";
