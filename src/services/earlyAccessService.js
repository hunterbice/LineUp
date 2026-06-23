export function createEarlyAccessService({ deviceFunctionRequest }) {
  function request(action, extra) {
    return deviceFunctionRequest("early-access", Object.assign({ action }, extra || {}));
  }

  return { request };
}
