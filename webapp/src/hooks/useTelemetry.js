// Telemetry disabled — no external requests
export const useTelemetry = () => {
  return { sendTelemetry: () => {} };
};
