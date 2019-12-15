export const AZDEVOPS_CLOUD_API_ORGANIZATION = "https://dev.azure.com";
export const AZDEVOPS_CLOUD_API_ORGANIZATION_OLD = "https://[org].visualstudio.com";
export const AZDEVOPS_API_ORGANIZATION_RESOURCE = "/_apis/resourceAreas/79134C72-4A58-4B42-976C-04E7115F32BF";
export const isLocalhost = Boolean(
  window.location.hostname === "localhost" ||
      // [::1] is the IPv6 localhost address.
      window.location.hostname === "[::1]" ||
      // 127.0.0.1/8 is considered localhost for IPv4.
      window.location.hostname.match(
          /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
      )
);
